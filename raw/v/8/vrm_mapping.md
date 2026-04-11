# SEOL AF v8 to VRM Expression Mapping

This document defines how the SEOL AF v8 biological channels and modes map to standard VRM 3D character expressions.

## 1. Mode-based Mapping (Primary)

| SEOL Mode | VRM Expression (Preset) | Vidol Motion Suggestion |
|---|---|---|
| **GF_BF** | `happy` | `Wave` / `Shy` |
| **Mother** | `relaxed` | `Nod` |
| **Friend** | `fun` | `Laugh` |
| **Baby** | `surprised` | `Idle` |
| **Anger** | `angry` | `Reject` |
| **Neutral** | `neutral` | `Idle` |

## 2. Bio-Channel Modulation (Advanced)

*   **Oxytocin > 0.7**: Increase `happy` or `relaxed` weight.
*   **Cortisol > 0.6**: Increase `sorrow` or `angry` weight.
*   **Adrenaline > 0.8**: Trigger `surprised` or `angry`.
*   **Dopamine > 0.8**: Maximize `fun` or `happy`.
