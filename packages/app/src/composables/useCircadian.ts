/**
 * SEOL Circadian Rhythm composable  (v10 feature).
 *
 * Applies a subtle time-of-day bias to the bio-state, simulating natural
 * hormonal rhythms (cortisol peaks in the morning, melatonin/endorphin at
 * night, dopamine/focus at midday, social oxytocin in the evening).
 *
 * The effect is intentionally small (scaled by CIRCADIAN_SCALE) so it
 * modulates rather than overrides user-driven state.
 *
 * Usage (in seol store):
 *   nextState = circadianTick(nextState)   // call alongside homeostasisTick
 */

import type { BioState } from './useBioState'
import { BIO_CHANNELS } from './useBioState'

// ── Types ────────────────────────────────────────────────────────────────────

type ChannelBias = Record<keyof BioState, number>

interface CircadianPhase {
  label: string
  start: number   // inclusive hour (0–23)
  end: number     // inclusive hour (0–23)
  bias: ChannelBias
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function zeroBias(): ChannelBias {
  return { dopamine: 0, serotonin: 0, oxytocin: 0, cortisol: 0, adrenaline: 0, endorphin: 0 }
}

function makeBias(partial: Partial<ChannelBias>): ChannelBias {
  return { ...zeroBias(), ...partial }
}

// ── Phase table ──────────────────────────────────────────────────────────────
// Bias values are small nudges (±0.05–0.12). Scaled further by CIRCADIAN_SCALE.

const PHASES: CircadianPhase[] = [
  {
    label: 'night',
    start: 0,
    end: 5,
    // Low arousal, elevated endorphin (comfort/rest), suppressed drive
    bias: makeBias({ dopamine: -0.08, serotonin: -0.06, adrenaline: -0.10, endorphin: +0.08 }),
  },
  {
    label: 'morning',
    start: 6,
    end: 10,
    // Natural cortisol awakening response, rising energy and alertness
    bias: makeBias({ cortisol: +0.08, dopamine: +0.06, serotonin: +0.05, adrenaline: +0.04 }),
  },
  {
    label: 'midday',
    start: 11,
    end: 15,
    // Peak cognitive drive and focus; slight serotonin dip after lunch
    bias: makeBias({ dopamine: +0.10, adrenaline: +0.05, serotonin: -0.02 }),
  },
  {
    label: 'evening',
    start: 16,
    end: 20,
    // Social bonding window (oxytocin), cortisol drops, endorphin rises
    bias: makeBias({ oxytocin: +0.08, cortisol: -0.06, serotonin: +0.04, endorphin: +0.04 }),
  },
  {
    label: 'late night',
    start: 21,
    end: 23,
    // Wind-down: reduced arousal, comfort chemicals, lower drive
    bias: makeBias({ dopamine: -0.07, adrenaline: -0.08, endorphin: +0.06, serotonin: +0.02 }),
  },
]

/** How strongly the circadian effect modulates the bio-state (keep subtle). */
const CIRCADIAN_SCALE = 0.35

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Apply a time-of-day circadian bias to the bio-state.
 *
 * @param state  Current bio-state
 * @param hour   Hour 0–23 (defaults to local device time)
 */
export function circadianTick(state: BioState, hour = new Date().getHours()): BioState {
  const phase = PHASES.find(p => hour >= p.start && hour <= p.end)
  if (!phase) return state

  const next = { ...state } as Record<keyof BioState, number>
  for (const ch of BIO_CHANNELS) {
    const delta = (phase.bias[ch] ?? 0) * CIRCADIAN_SCALE
    next[ch] = Math.max(0, Math.min(1, state[ch] + delta))
  }
  return next as BioState
}

/**
 * Return the human-readable label for the current time-of-day phase.
 * Used in BioHud to show e.g. "🌙 night".
 *
 * @param hour  Hour 0–23 (defaults to local device time)
 */
export function circadianPhaseLabel(hour = new Date().getHours()): string {
  return PHASES.find(p => hour >= p.start && hour <= p.end)?.label ?? 'night'
}

/** Map a circadian phase label to a display emoji. */
export function circadianPhaseEmoji(label: string): string {
  const map: Record<string, string> = {
    'night': '🌙',
    'morning': '🌅',
    'midday': '☀️',
    'evening': '🌆',
    'late night': '🌃',
  }
  return map[label] ?? '🕐'
}
