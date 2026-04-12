# SEOL AF v10 — The Nervous System Synthesis

## 🎯 Vision for v10
v9 successfully stabilized the "Biological State" and "Multilingual Router." However, it still relies on a **discrete MoE (Mixture of Experts) dispatcher** which selects prompts based on hardcoded thresholds.

**v10 will move toward a truly unified nervous system.** Instead of switching "Modes" (GF_BF, Mother, etc.), the biological state (Dopamine, Cortisol, etc.) will **dynamically modulate** the LLM's behavior at the neural level.

---

## 🏗️ v10 Architecture Specifications

### 1. Neural Modulation Layer (NML)
In v10, we will implement **Dynamic LoRA Modulation**:
- **Mechanism**: A "Modulator MLP" takes the 6 bio-channel floats as input.
- **Output**: A set of scalar weights (alphas) for multiple specialized LoRA adapters (e.g., `adapter_intimate`, `adapter_protective`, `adapter_defensive`).
- **Synthesis**: The LLM's final output is a weighted blend of these adapters.

### 2. Emergent Mode Recognition
- **Change**: Remove `AFState.MODE_RULES`.
- **v10 Approach**: The "Mode" is now an **emergent classification** from the Router.

### 3. Relational Importance Weighting (RIW)
- **v10 Fix**: Implement **Decay-resistant Emotional Memory**.
  - High Bio-Intensity turns get an `importance_score` and persist in context longer.

### 4. Circadian Rhythm & Recovery
- **New Feature**: Introduce a `sleep_cycle` variable.

---

## 🧬 Technical Implementation Roadmap
- **Phase A**: Train micro-LoRAs on emotional subsets.
- **Phase B**: Update Rust Core for `importance_score` and `Circadian` loop.
- **Phase C**: Integrate `ort` and `candle-lora` for weight blending.
