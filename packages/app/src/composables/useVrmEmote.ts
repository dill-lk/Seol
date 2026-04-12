/**
 * useVrmEmote — smooth VRM expression transitions.
 *
 * Adapted from Project AIRI (MIT licence)
 * https://github.com/moeru-ai/airi/blob/main/packages/stage-ui-three/src/composables/vrm/expression.ts
 *
 * Changes from upstream:
 *  - Import `VRM` from `@pixiv/three-vrm` instead of `VRMCore` from `@pixiv/three-vrm-core`
 *    (avoids the extra peer-dep; VRM extends VRMCore so the API is identical).
 */

import type { VRM } from '@pixiv/three-vrm'

interface ExpressionTarget {
  name: string
  value: number
  duration?: number
}

interface EmotionState {
  expression?: ExpressionTarget[]
  blendDuration?: number
}

export function useVrmEmote(vrm: VRM) {
  let currentEmotion: string | null = null
  let isTransitioning = false
  let transitionProgress = 0
  const currentExprValues = new Map<string, number>()
  const targetExprValues = new Map<string, number>()
  let resetTimer: ReturnType<typeof setTimeout> | undefined

  // ── Helpers ────────────────────────────────────────────────────────────────

  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2
  }

  function clamp01(v: number): number {
    return Math.min(1, Math.max(0, v))
  }

  // ── Emotion state catalogue ────────────────────────────────────────────────
  // Using capped primary values (0.7-0.8) to avoid over-expressive faces.

  const emotionStates = new Map<string, EmotionState>([
    ['happy', {
      expression: [
        { name: 'happy', value: 0.70 },
        { name: 'aa',    value: 0.20 },
      ],
      blendDuration: 0.40,
    }],
    ['sad', {
      expression: [
        { name: 'sad', value: 0.70 },
        { name: 'oh',  value: 0.15 },
      ],
      blendDuration: 0.40,
    }],
    ['angry', {
      expression: [
        { name: 'angry', value: 0.70 },
        { name: 'ee',    value: 0.30 },
      ],
      blendDuration: 0.30,
    }],
    ['surprised', {
      expression: [
        { name: 'surprised', value: 0.80 },
        { name: 'oh',        value: 0.40 },
      ],
      blendDuration: 0.15,
    }],
    ['neutral', {
      expression: [
        { name: 'neutral', value: 1.00 },
      ],
      blendDuration: 0.60,
    }],
    ['think', {
      expression: [
        { name: 'think', value: 0.70 },
      ],
      blendDuration: 0.50,
    }],
  ])

  // ── API ────────────────────────────────────────────────────────────────────

  function clearResetTimer() {
    if (resetTimer !== undefined) {
      clearTimeout(resetTimer)
      resetTimer = undefined
    }
  }

  function setEmotion(emotionName: string, intensity = 1) {
    clearResetTimer()

    if (!emotionStates.has(emotionName)) {
      console.warn(`[useVrmEmote] unknown emotion: "${emotionName}"`)
      return
    }

    const state = emotionStates.get(emotionName)!
    currentEmotion = emotionName
    isTransitioning = true
    transitionProgress = 0

    // Capture current rendered values as lerp start (prevents snapping to 0).
    currentExprValues.clear()
    targetExprValues.clear()

    const norm = clamp01(intensity)

    if (vrm.expressionManager) {
      for (const name of Object.keys(vrm.expressionManager.expressionMap)) {
        const cur = vrm.expressionManager.getValue(name) ?? 0
        currentExprValues.set(name, cur)
        targetExprValues.set(name, 0)          // default: fade to 0
      }
    }

    for (const expr of state.expression ?? []) {
      targetExprValues.set(expr.name, expr.value * norm)
    }
  }

  function setEmotionWithReset(emotionName: string, ms: number, intensity = 1) {
    clearResetTimer()
    setEmotion(emotionName, intensity)
    resetTimer = setTimeout(() => {
      setEmotion('neutral')
      resetTimer = undefined
    }, ms)
  }

  /** Called every frame with the elapsed delta (seconds). */
  function update(delta: number) {
    if (!isTransitioning || !currentEmotion) return

    const state = emotionStates.get(currentEmotion)!
    const blend = state.blendDuration ?? 0.30

    transitionProgress += delta / blend
    if (transitionProgress >= 1.0) {
      transitionProgress = 1.0
      isTransitioning = false
    }

    const t = easeInOutCubic(transitionProgress)
    for (const [name, target] of targetExprValues) {
      const start = currentExprValues.get(name) ?? 0
      vrm.expressionManager?.setValue(name, lerp(start, target, t))
    }
  }

  function addEmotionState(name: string, state: EmotionState) {
    emotionStates.set(name, state)
  }

  function dispose() {
    clearResetTimer()
  }

  return { setEmotion, setEmotionWithReset, update, addEmotionState, dispose }
}
