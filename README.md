# SEOL — AF Companion

A TypeScript/Vue 3 wrapper app that brings the **SEOL Artificial Feelings (AF)** bio-state
engine to life through **Project AiRI's VRM 3-D character system**.

```
┌─────────────────────────────┬──────────────────┐
│   AiRI VRM 3-D model        │  Chat panel      │
│   (Three.js + @pixiv/vrm)   │  + bio-state HUD │
│                             │                  │
│  expressions driven by      │  all TypeScript  │
│  SEOL bio-state engine      │  Vite + Vue 3    │
└─────────────────────────────┴──────────────────┘
```

## How it works

1. **Bio-state engine** (`useBioState.ts`) — six neurotransmitter/hormone channels
   (dopamine, serotonin, oxytocin, cortisol, adrenaline, endorphin) that update in
   response to keyword-classified commands and decay toward a baseline over time.

2. **Personality modes** — `GF_BF | Mother | Friend | Baby | Anger | Neutral` are
   resolved from the bio-state each turn.

3. **VRM expressions** — the active mode + bio-channels are mapped to a VRM emotion
   (`happy | sad | angry | surprised | neutral | think`) and fed to `useVrmEmote.ts`
   (adapted from AiRI's expression composable, MIT licence) which drives smooth
   transitions on the loaded VRM model.

4. **Local LLM only** — messages are sent to a locally running Ollama instance.
   Each mode has its own system prompt. No cloud providers.

## Quick start

### 1 — Run Ollama with CORS enabled

```bash
OLLAMA_ORIGINS='*' ollama serve
ollama pull mistral     # or llama3, solar, etc.
```

### 2 — Start the app

```bash
npm install
npm run dev          # → http://localhost:5173
```

### 3 — Load a VRM

In the ⚙ Settings drawer paste a `.vrm` URL, e.g.:

- `https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm`
- Any VRoid Hub model download URL

## Architecture

```
packages/app/src/
├── composables/
│   ├── useBioState.ts     SEOL AF engine — pure TS, no Vue deps
│   ├── useVrmEmote.ts     Smooth VRM expression transitions (AiRI MIT)
│   └── useOllama.ts       Streaming Ollama chat client
├── stores/
│   ├── seol.ts            Pinia: bio-state, mode, chat turns
│   └── settings.ts        Pinia: VRM URL, Ollama URL, model name
└── components/
    ├── VrmViewer.vue      Three.js canvas — loads VRM, watches store emotions
    ├── ChatPanel.vue      Streaming chat UI
    └── BioHud.vue         Bio-channel bar overlay
```

## Dependencies

| Package | Role |
|---|---|
| `@pixiv/three-vrm` | VRM 1.0/0.x loader + expression manager |
| `three` | 3-D renderer |
| `vue` + `pinia` | UI framework + state |
| `@vueuse/core` | `useLocalStorage` for settings persistence |

No TresJS, no cloud AI SDK, no Node server.
