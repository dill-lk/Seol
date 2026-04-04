# SEOL Artificial Feelings — Experiment Log

This file is the **agent-maintained changelog** for model iterations and test outcomes.

## Editing Rules
- Keep each version in its own section (`v1`, `v2`, ...).
- Write a short changelog first.
- Append important test outputs in readable blocks.
- Keep large raw console dumps in separate artifacts when possible.

---

## Version Index

| Version | Notebook | Owner/Agent Note | Status |
|---|---|---|---|
| v8 | `raw/v/8/seol_v8.ipynb` | Built by owner; no original changelog provided | Logged below |

---

## v8

### Source
- Notebook: `raw/v/8/seol_v8.ipynb`
- Related artifacts:
  - `raw/v/8/af_v8_session_log.json`
  - `raw/v/8/seol_af_router_v8_best.pt`
  - `raw/v/8/seol_af_router_v8.onnx`

### Run Summary (from recorded output)
- AFState initialized with memory size: `20 turns`
- Embedder: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- Router model: `AF Router MLP v8`
  - Parameters: `912,529`
  - Input dim: `390` (embedding + bio-state)
  - `bio_delta`: `±0.6`
- Dataset size:
  - Total: `45,000`
  - Train: `40,500`
  - Validation: `4,500`
- Training:
  - Epochs: `15`
  - Best validation loss: `0.0421`
- Final metrics:
  - Command Accuracy: `100.0%`
  - Mode Accuracy: `100.0%`
  - Bio MAE: `0.0870`
  - Constraint Loss: `0.0000`

### Key Warnings / Issues Observed
1. `HF_TOKEN` missing in Colab (unauthenticated Hugging Face requests).
2. `trust_remote_code` is no longer supported for `daily_dialog` loader flow.
3. Sinhala/English semantic similarity shown as `0.485` while comment says `>0.6` is preferred.

### Multi-turn Behavior Snapshot (sample)
| Turn | Input | Route | Mode after response |
|---|---|---|---|
| 01 | `hi broo` | Neutral → Neutral | Neutral |
| 02 | `I love you so much` | Bond → Neutral | Neutral |
| 03 | `I love you so much` | Bond → GF_BF | GF_BF |
| 04 | `ඔයාට ගොඩක් ආදරෙයි` | Bond → GF_BF | GF_BF |
| 05 | `fuck you` | Alert → Mother | Mother |
| 06 | `you destroyed my life` | Alert → Neutral | Neutral |

---

## Agent Review — 2026-04-04

### What was checked
- Readability and structure of the v8 notes.
- Presence of concrete issues for next iteration planning.
- Consistency between recorded metrics and summary text.

### Changelog (agent)
- Rewrote this file into a clean, structured Markdown format.
- Preserved the key v8 results and major warnings.
- Added a compact version index and a readable snapshot table.
- Kept next-step guidance for the upcoming version.

### Suggested v9 Fix Plan
1. Replace deprecated dataset loading path (remove `trust_remote_code` dependence).
2. Add a local dataset cache/fallback for reproducible offline runs.
3. Re-validate Sinhala multilingual mapping quality and threshold messaging.
4. Persist a machine-readable run report (`.json`) for every full training run.

---

## Owner Pending Note
> "not yet pls fix by agent and dump it as next version"

Status: **This document formatting is now fixed and ready for the next version entry (v9).**

---

## v9 (Agent Draft) — Error-Fix Upgrade Plan

### Goal
Create **SEOL AF v9** by fixing the concrete issues observed in v8 and adding more natural emotional persistence.

### Confirmed Problems from v8
1. Dataset loader break: `trust_remote_code` path failed for `daily_dialog`.
2. Sinhala mapping score below target (`0.485` vs desired `>= 0.60`).
3. Negative emotional transitions reset too quickly (`insult -> Mother -> Neutral`).
4. Character consistency drift in some outputs (defensive/constraint-like tone vs intended romantic persona).

### v9 Changelog (planned fixes)
- **Data pipeline fix**
  - Remove `trust_remote_code=True` flow.
  - Load dataset from parquet/arrow exports (or local cache) for stable training.
- **Multilingual quality fix**
  - Add Sinhala + code-switch fine-tuning samples.
  - Track Sinhala/English alignment metric each run and fail check if below target.
- **Emotional persistence fix**
  - Add inertia mechanism so strong emotions decay gradually across turns.
  - Proposed blend: `emotion_t = 0.7 * emotion_{t-1} + 0.3 * input_t`.
- **Bio-state realism fix**
  - Add delayed cortisol/adrenaline spikes for high-conflict prompts.
  - Avoid instant neutral reset after severe negative user input.
- **Persona consistency fix**
  - Tighten response shaping so character remains consistent with SEOL role.
  - Add post-response guardrail checks for style/persona drift.
- **Memory weighting fix**
  - Prioritize emotionally intense turns over neutral turns in short-term memory updates.
- **Conflict engine extension**
  - Add controlled response diversity (comfort / boundary / assertive reactions).

### v9 Validation Checklist
- Dataset loads without `trust_remote_code` errors.
- Sinhala similarity score reaches target threshold (`>= 0.60`).
- Negative-turn test shows non-instant emotional decay (no abrupt full reset).
- Persona consistency passes scripted multi-turn evaluation.
- Run summary JSON saved with metrics, warnings, and per-turn bio-state deltas.

### v9 Experiment Note Template
Use this block when v9 training is completed:

```md
_v9_
file - raw/v/9/seol_v9.ipynb
_results_
- Best Val Loss:
- Command Accuracy:
- Mode Accuracy:
- Bio MAE:
- Sinhala Similarity:
- Dataset Loader Status:
- Persistence Test Status:
- Persona Consistency Status:
```

---

## v9 (Created)

### File
- `raw/v/9/seol_v9.ipynb`

### What is included right now
- v9 objective checklist (error-fix focus from v8 findings)
- dataset loader scaffold without `trust_remote_code`
- emotional inertia helper (`emotion_t = 0.7 * prev + 0.3 * input`)
- run-report writer scaffold (`raw/v/9/run_report_v9.json`)

### Pending
- plug full v8 training pipeline blocks into v9 notebook
- run full training + evaluation
- append final v9 metrics and logs to this file


### v9 Notebook Expansion Update (2026-04-04)
- Upgraded `raw/v/9/seol_v9.ipynb` from minimal scaffold to full expanded implementation notebook.
- Notebook now exceeds 1000 lines and includes modular sections for data, model, persistence, training, persona checks, and run reporting.
