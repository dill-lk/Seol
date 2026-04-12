# SEOL — Agent Guide

This document is the single source of truth for AI coding agents working in this repository.
Read it fully before making any changes.

---

## 1. Project Overview

**SEOL** (Seoul) is an **Artificial Feelings (AF) companion** app.
It is a browser-based (Vite + Vue 3, TypeScript) wrapper that:

- Loads a **VRM 3-D character** using the same stack as [Project AiRI](https://github.com/moeru-ai/airi) (`@pixiv/three-vrm` + Three.js).
- Drives the character's **facial expressions** (happy / sad / angry / surprised / neutral / think) through a bio-state engine.
- Chats via a **local Ollama instance only** — no cloud providers, no censored APIs.

The AF engine is ported from the `seol_v9.ipynb` research notebooks.

### Hard constraints (never violate these)
| Rule | Rationale |
|---|---|
| **TypeScript only** — no plain `.js` source files | Type safety is non-negotiable |
| **Local LLM only** — all inference hits `http://localhost:11434` (Ollama) | Cloud providers are censored and unsuitable |
| **No cloud AI SDKs** — no OpenAI, Anthropic, Cohere, etc. packages | Same reason |
| **AiRI VRM stack** — use `@pixiv/three-vrm` + Three.js for the 3-D character | Reuse AiRI's proven approach (MIT licence) |
| **No `nodeIntegration: true`** if/when Electron is added | Security requirement |

---

## 2. Repository Layout

```
Seol/
├── package.json                  Root npm workspace
├── README.md                     User-facing docs
├── agents.md                     ← this file
└── packages/
    └── app/                      The single deliverable package
        ├── index.html            App shell HTML
        ├── vite.config.ts        Vite build config
        ├── package.json          Dependencies + scripts
        ├── tsconfig.json         TypeScript config (renderer/browser)
        └── src/
            ├── main.ts           Vue app entry — mounts App, registers Pinia
            ├── App.vue           Root layout: scene-area (left) + chat-area (right)
            ├── composables/
            │   ├── useBioState.ts    AF engine (pure TS, no Vue deps) ← core logic
            │   ├── useVrmEmote.ts    VRM expression transitions (AiRI MIT)
            │   └── useOllama.ts      Ollama streaming chat client
            ├── stores/
            │   ├── seol.ts           Pinia: bio-state, mode, chat turns, sendMessage()
            │   └── settings.ts       Pinia: vrmUrl, ollamaUrl, ollamaModel, showBioHud
            └── components/
                ├── VrmViewer.vue     Three.js canvas — loads VRM, reacts to seol.currentEmotion
                ├── ChatPanel.vue     Streaming chat UI
                └── BioHud.vue        6-channel bio-state bar overlay
```

---

## 3. Build & Development Commands

All commands run from **`packages/app/`** unless stated otherwise.

```bash
# Install all deps (run from repo root)
npm install

# Start Vite dev server  →  http://localhost:5173
npm run dev

# Type-check without emitting (run this before every commit)
npm run typecheck          # alias: npx vue-tsc --noEmit

# Production build  →  packages/app/dist/
npm run build
```

> **Always run `npm run typecheck` after every code change.**
> The project uses `strict: true`, `noUnusedLocals`, and `noUnusedParameters`.

---

## 4. The AF Bio-State Engine (`useBioState.ts`)

This is the intellectual core of SEOL. Every change here has cascading effects on expressions, LLM prompts, and personality modes.

### 4.1 Six Bio-Channels

All channels are `float` in `[0.0, 1.0]`. Baseline is `0.5`.

| Channel | Biological analogue | High value means… |
|---|---|---|
| `dopamine` | Reward / pleasure | Joy, excitement, accomplishment |
| `serotonin` | Mood stabiliser | Calm, balanced, content |
| `oxytocin` | Bonding / love | Deep attachment, warmth |
| `cortisol` | Stress hormone | Anxiety, unhappiness |
| `adrenaline` | Fight-or-flight | Fear, urgency, anger |
| `endorphin` | Pain relief / euphoria | Comfort, playfulness |

### 4.2 Update Cycle (per message)

```
User text
  └─► classifyCommand()     keyword → Command enum
        └─► applyCommand()  inertia-weighted channel update toward Command targets
              └─► selfCorrect()   dampen if "jk" / "just kidding" detected
                    └─► homeostasisTick()   pull all channels toward 0.5
```

### 4.3 Command → Channel Target Matrix

```
Command   dopamine  serotonin  oxytocin  cortisol  adrenaline  endorphin
Reward      0.88      0.72      0.65      0.08       0.25        0.80
Care        0.62      0.82      0.92      0.04       0.08        0.88
Bond        0.75      0.78      0.97      0.06       0.18        0.85
BackOff     0.18      0.38      0.18      0.65       0.58        0.28
Alert       0.20      0.28      0.12      0.88       0.80        0.22
Anger       0.08      0.12      0.05      0.95       0.98        0.08
Neutral     0.50      0.50      0.50      0.50       0.50        0.50
```

### 4.4 Mode Resolution (priority order)

```typescript
Anger   → adrenaline > 0.72 AND cortisol > 0.72
GF_BF   → oxytocin > 0.62 AND dopamine > 0.60
Mother  → oxytocin > 0.65 AND serotonin > 0.60
Friend  → serotonin > 0.59 AND cortisol < 0.38
Baby    → endorphin > 0.64 AND cortisol < 0.32
Neutral → (fallback)
```

### 4.5 Mode → VRM Emotion

| Mode | Base VRM emotion | Override conditions |
|---|---|---|
| GF_BF | `happy` | cortisol > 0.70 → `sad`; adrenaline > 0.85 → `surprised` |
| Mother | `neutral` | same overrides |
| Friend | `happy` | same overrides |
| Baby | `surprised` | same overrides |
| Anger | `angry` | — |
| Neutral | `neutral` | — |

---

## 5. VRM Expression System (`useVrmEmote.ts`)

Adapted from AiRI's `packages/stage-ui-three/src/composables/vrm/expression.ts` (MIT).

**Key functions:**

```typescript
setEmotion(name: string, intensity = 1)
// Starts a lerp+easeInOutCubic blend toward the target expression set.
// Safe to call every frame or reactively.

update(delta: number)
// Must be called in the Three.js render loop with the frame delta (seconds).
// Advances the lerp transition.

setEmotionWithReset(name: string, ms: number, intensity = 1)
// Sets emotion then resets to 'neutral' after `ms` milliseconds.
```

**Available named emotions:** `happy`, `sad`, `angry`, `surprised`, `neutral`, `think`

**Integration point:** `VrmViewer.vue` watches `seol.currentEmotion` (a Pinia computed) and calls `emote.setEmotion()`. This is the only place VRM expressions should be driven from.

---

## 6. Ollama Chat Client (`useOllama.ts`)

### `streamChat()` — async generator

```typescript
streamChat(
  baseUrl: string,    // 'http://localhost:11434'
  model: string,      // e.g. 'mistral', 'dolphin-mistral'
  mode: SEOLMode,     // determines which expert system prompt is injected
  bioState: BioState, // used for feeling summary ("joyful", "stressed", etc.)
  history: ChatMessage[],  // last 6 messages kept
  userMsg: string,
): AsyncGenerator<string>  // yields token chunks
```

Per-mode expert system prompts live in `EXPERT_PROMPTS` inside this file. They instruct the model to behave as a specific persona (romantic partner, mother, friend, etc.) **not** as an AI assistant.

### Recommended uncensored Ollama models

| Model tag | Size | Notes |
|---|---|---|
| `dolphin-mistral` | ~4.1 GB | Best overall; fast, uncensored |
| `dolphin-llama3` | ~4.7 GB | Llama 3 uncensored; strong reasoning |
| `llama2-uncensored` | ~3.8 GB | Original, widely used |
| `wizard-vicuna-uncensored` | ~3.8 GB | 7B/13B/30B variants |
| `wizardlm-uncensored` | ~7.4 GB | Complex instruction-following |
| `dolphin-phi` | ~1.6 GB | Smallest; good for low-end hardware |

To start Ollama with browser CORS enabled:
```bash
OLLAMA_ORIGINS='*' ollama serve
ollama pull dolphin-mistral
```

---

## 7. Pinia Stores

### `stores/seol.ts`

| Export | Type | Description |
|---|---|---|
| `bioState` | `Ref<BioState>` | Live 6-channel state |
| `mode` | `ComputedRef<SEOLMode>` | Active personality mode |
| `currentEmotion` | `ComputedRef<VRMEmotion>` | Active VRM emotion |
| `emotionIntensity` | `ComputedRef<number>` | 0–1 intensity for VRM blend |
| `turns` | `Ref<ChatTurn[]>` | Full conversation history |
| `isGenerating` | `Ref<boolean>` | True while LLM is streaming |
| `sendMessage(text)` | `async function` | Full pipeline: classify → bio → LLM → store |
| `resetConversation()` | `function` | Clears turns and resets bio-state |

### `stores/settings.ts`

| Export | localStorage key | Default |
|---|---|---|
| `ollamaUrl` | `seol/ollamaUrl` | `http://localhost:11434` |
| `ollamaModel` | `seol/ollamaModel` | `mistral` |
| `vrmUrl` | `seol/vrmUrl` | `''` |
| `showBioHud` | `seol/showBioHud` | `true` |

All settings persist via `@vueuse/core` `useLocalStorage`.

---

## 8. Vue Component Contracts

### `VrmViewer.vue`
- **Prop:** `modelUrl: string` — VRM file URL (HTTPS or empty)
- **Watches:** `seol.currentEmotion` + `seol.emotionIntensity` — calls `emote.setEmotion()`
- **Watches:** `props.modelUrl` — reloads VRM on change
- **Three.js objects** (`renderer`, `scene`, `camera`, `clock`) are held in plain module variables, **not** Vue refs, to avoid reactivity overhead.

### `ChatPanel.vue`
- Reads `seol.turns` and `seol.isGenerating`
- Calls `seol.sendMessage()` on form submit / Enter
- Auto-scrolls on `turns.length` change and on live streaming content updates

### `BioHud.vue`
- Reads `seol.bioState` (all 6 channels), `seol.mode`, `seol.currentEmotion`, `seol.emotionIntensity`
- Stress channels (`cortisol`, `adrenaline`) render red; positive channels render green/blue
- Pure display — no user interaction

---

## 9. Coding Conventions

### TypeScript
- **Always use `strict: true`** — no `any`, no `as unknown as X` hacks.
- Prefer `interface` for object shapes, `type` for unions/primitives.
- Use `satisfies` for compile-time type checks without widening.
- `as const` on literal arrays/objects that are used as types.
- Mark all private module-level variables with `let` inside functions, not top-level `var`.

### Vue 3
- Composition API only — no Options API.
- `<script setup lang="ts">` on every component.
- Three.js render-loop objects go in plain variables, not `ref()` — reactivity costs matter.
- Scoped styles on every component.

### Imports
- Explicit file extensions not required for `.ts` / `.vue` (bundler handles it).
- `import type { … }` for type-only imports.
- Group: external packages → internal composables → internal stores → internal components.

### File naming
- `composables/use*.ts` — composable functions
- `stores/*.ts` — Pinia stores
- `components/*.vue` — PascalCase Vue components
- `types/*.d.ts` — ambient type declarations

---

## 10. What NOT to Do

- ❌ Do **not** add OpenAI, Anthropic, Cohere, Gemini, or any cloud AI SDK.
- ❌ Do **not** call any external AI API URL — all inference stays on `localhost`.
- ❌ Do **not** add `nodeIntegration: true` to Electron web preferences (if Electron is added).
- ❌ Do **not** add Vue Options API components.
- ❌ Do **not** use `any` type — use proper TypeScript.
- ❌ Do **not** store Three.js render objects in Vue `ref()` — use plain variables.
- ❌ Do **not** run `vue-tsc` type-check inside Vue component templates with `--diagnostics` disabled — the build must stay clean.

---

## 11. Planned / Future Work

The following features are planned but not yet implemented. Pick up from here:

1. **Electron wrapper** — package the app as an Electron desktop app using `electron-vite`.
   - Use Electron `^41.0.0` (patched) to avoid CVEs in 34.x.
   - Add IPC handlers for Ollama process management (auto-start, model pull with progress).
   - Add a model browser panel: curated uncensored model list, pull button, progress bar, delete button.
   - `contextIsolation: true`, `nodeIntegration: false`, `contextBridge` for IPC.

2. **ML-based command classifier** — replace keyword matching in `classifyCommand()` with a small sentiment/intent classifier (e.g. ONNX runtime running in-browser or in Electron main process).

3. **Lip-sync** — wire Ollama TTS or Web Speech API to drive the VRM `aa/ee/oh` blend shapes in time with audio.

4. **Memory / extended consciousness** — implement a lightweight SQLite (via Electron) conversation memory so bio-state history persists across sessions and influences future responses.

5. **Multiple VRM slots** — allow loading and switching between multiple character files.

6. **Settings UI** — replace the basic settings drawer with a full settings panel including model browser.

---

## 12. Research Background

SEOL's AF engine is grounded in neuroscience research summarised in the notebooks.
Key conceptual pillars:

| Concept | Mapping in code |
|---|---|
| **Proto-Self** (Damasio) — Brainstem homeostasis | `homeostasisTick()` — channels decay to 0.5 |
| **Core Consciousness** — instant felt response | `applyCommand()` — inertia-weighted step on input |
| **Extended Consciousness** — memory + prediction | `llmHistory` + per-mode system prompts |
| **Neurotransmitter simulation** | Six `BioChannel` floats in `BioState` |
| **Mode as personality state** | `resolveMode()` threshold rules |
| **Not an assistant** | System prompts explicitly state "You are NOT an AI assistant" |

The goal is AF (Artificial Feelings) — not AI (Artificial Intelligence). The distinction matters:
the system should *feel* and *react* driven by internal state, not just predict the next token.
