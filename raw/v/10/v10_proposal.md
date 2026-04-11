# SEOL AF v10 — The Nervous System Synthesis

## 🎯 Vision for v10
v9 successfully stabilized the "Biological State" and "Multilingual Router." However, it still relies on a **discrete MoE (Mixture of Experts) dispatcher** which selects prompts based on hardcoded thresholds.

**v10 will move toward a truly unified nervous system.** Instead of switching "Modes" (GF_BF, Mother, etc.), the biological state (Dopamine, Cortisol, etc.) will **dynamically modulate** the LLM's behavior at the neural level.

---

## 🏗️ v10 Architecture Specifications

### 1. Neural Modulation Layer (NML)
In v9, we used `build_prompt_v9(mode, af)`.
In v10, we will implement **Dynamic LoRA Modulation**:
- **Mechanism**: A "Modulator MLP" takes the 6 bio-channel floats as input.
- **Output**: A set of scalar weights (alphas) for multiple specialized LoRA adapters (e.g., `adapter_intimate`, `adapter_protective`, `adapter_defensive`).
- **Synthesis**: The LLM's final output is a weighted blend of these adapters, allowing for "In-between" emotions (e.g., 70% Motherly + 30% Defensive) that hardcoded modes cannot capture.

### 2. Emergent Mode Recognition
- **Change**: Remove `AFState.MODE_RULES` (hardcoded thresholds).
- **v10 Approach**: The "Mode" is now an **emergent classification** from the Router. We will train a classifier to name the state for logging purposes, but the LLM will only see the raw biological vectors.

### 3. Relational Importance Weighting (RIW)
- **Problem**: v9 treats all turns in the `conv_history` equally.
- **v10 Fix**: Implement **Decay-resistant Emotional Memory**.
  - Turns with high Bio-Intensity (e.g., a major argument or a deep bond moment) get an `importance_score`.
  - These turns persist in the LLM's context window longer than neutral turns, even if they occurred many turns ago.

### 4. Circadian Rhythm & Recovery
- **New Feature**: Introduce a `sleep_cycle` variable.
- **Effect**: Prolonged interaction without "rest" increases `cortisol` baseline and decreases `serotonin` stability, mimicking human fatigue.

---

## 🧬 Technical Implementation Roadmap

### Phase A: The Modulator Training
- Train 4-5 micro-LoRAs (rank 8-16) on specific emotional subsets of the GoEmotions dataset.
- Use the AF Router v9 as a base but replace the `mode_head` with a `modulation_head` (vector of LoRA intensities).

### Phase B: Rust Core Upgrade
- Update `AFState` to handle `importance_score` for memory turns.
- Implement the `Circadian` loop in the homeostasis thread.

### Phase C: Unified Inference
- Integrate `ort` (ONNX Runtime) for the Router and `candle-lora` for dynamic weight blending in the LLM.

---

## 📊 Evaluation Metrics for v10
1. **Emotional Fluidity**: Measure the smoothness of transition between "Mother" and "GF_BF" behaviors (no abrupt logic jumps).
2. **Sinhala-English Alignment**: Target similarity score **> 0.85** using LaBSE + custom emotional fine-tuning.
3. **Relational Persistence**: Verify if a "Hurt" event influences the response after 15+ neutral turns.
