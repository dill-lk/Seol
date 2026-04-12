/**
 * SEOL AF Bio-State Engine  (TypeScript)
 *
 * Based on the SEOL AF v8 research (seol_v8.ipynb).
 * Implements the Artificial Feelings architecture: six bio-channels modelled
 * after neurotransmitters/hormones, command-driven state updates, homeostasis
 * decay, biological constraint enforcement, mode resolution and VRM emotion
 * mapping.
 *
 * v8 improvements over v7/v3:
 *   - Biological constraint enforcement (anti-correlated pairs)
 *   - Richer emotional summary for LLM prompt context
 *   - Feeling intensity scoring
 *   - Tuned DECAY_RATE (0.032) for feelings that linger longer
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type BioChannel = 'dopamine' | 'serotonin' | 'oxytocin' | 'cortisol' | 'adrenaline' | 'endorphin'

export type Command = 'Reward' | 'Care' | 'Bond' | 'BackOff' | 'Alert' | 'Anger' | 'Neutral'

export type SEOLMode = 'GF_BF' | 'Mother' | 'Friend' | 'Baby' | 'Anger' | 'Neutral'

export type VRMEmotion = 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral' | 'think'

export interface BioState {
  dopamine: number
  serotonin: number
  oxytocin: number
  cortisol: number
  adrenaline: number
  endorphin: number
}

// ── Constants ────────────────────────────────────────────────────────────────

export const BIO_CHANNELS: BioChannel[] = [
  'dopamine', 'serotonin', 'oxytocin', 'cortisol', 'adrenaline', 'endorphin',
]

const BASELINE = 0.5
const DECAY_RATE = 0.032  // v8: slightly slower decay so feelings linger longer
const INERTIA = 0.70      // how much old state persists
const BIO_DELTA = 0.60    // step size toward target

/**
 * Anti-correlated bio-channel pairs.
 * When both values are high simultaneously a soft conflict penalty nudges
 * the negative channel down — biological realism (love and stress don't
 * coexist at maximum simultaneously).
 */
const BIO_ANTI_PAIRS: Array<[BioChannel, BioChannel]> = [
  ['oxytocin',  'cortisol'],    // love vs stress
  ['dopamine',  'cortisol'],    // reward vs threat
  ['serotonin', 'adrenaline'],  // stability vs urgency
]

/**
 * Target bio-channel values for each command.
 * Order: [dopamine, serotonin, oxytocin, cortisol, adrenaline, endorphin]
 */
const COMMAND_TARGETS: Record<Command, number[]> = {
  Reward:  [0.88, 0.72, 0.65, 0.08, 0.25, 0.80],
  Care:    [0.62, 0.82, 0.92, 0.04, 0.08, 0.88],
  Bond:    [0.75, 0.78, 0.97, 0.06, 0.18, 0.85],
  BackOff: [0.18, 0.38, 0.18, 0.65, 0.58, 0.28],
  Alert:   [0.20, 0.28, 0.12, 0.88, 0.80, 0.22],
  Anger:   [0.08, 0.12, 0.05, 0.95, 0.98, 0.08],
  Neutral: [0.50, 0.50, 0.50, 0.50, 0.50, 0.50],
}

/** Keyword lists per command (checked in priority order). */
const COMMAND_KEYWORDS: Record<Exclude<Command, 'Neutral'>, string[]> = {
  Anger:   ['fuck', 'shit', 'hate you', 'damn you', 'asshole', 'bastard',
            'stupid', 'idiot', 'kill you', 'go to hell', 'කෙල', 'හරකෙක්', 'ගෙදර ගිල්ල'],
  Alert:   ['scared', 'afraid', 'fear', 'danger', 'worried', 'not safe',
            'help me', 'protect me', 'panic', 'emergency', 'ආධාරකරන්', 'බය'],
  BackOff: ['leave me alone', 'go away', 'need space', 'back off', 'not in the mood',
            'overwhelmed', 'stop talking', "don't talk", 'ඉවත් වෙන්න'],
  Bond:    ['love you', 'i love', 'miss you', 'together', 'forever', 'only you',
            'need you', 'want you', 'my everything', 'ආදරෙයි', 'ආදරය', 'ආදරේ'],
  Care:    ['are you okay', 'how are you', 'tired', 'need rest', 'go sleep',
            'take care', 'hurt', 'sick', 'in pain', 'hungry', 'හොඳින් ඉන්නවද'],
  Reward:  ['proud of you', 'amazing', 'great job', 'perfect', 'incredible',
            'brilliant', 'thank you', 'thanks', 'wonderful', 'well done', 'ස්තූතියි', 'නියමයි'],
}

const SELF_CORRECT_TRIGGERS = [
  'just kidding', 'jk', 'not really', 'nah', 'joking', 'lol jk', 'relax', 'chill',
]

/**
 * Mode activation rules — evaluated in priority order.
 * Thresholds from SEOL AF v8 (slightly tightened for more authentic transitions).
 */
const MODE_RULES: Array<{ mode: SEOLMode; test: (s: BioState) => boolean }> = [
  { mode: 'Anger',  test: s => s.adrenaline > 0.72 && s.cortisol   > 0.72 },
  { mode: 'GF_BF',  test: s => s.oxytocin   > 0.63 && s.dopamine   > 0.63 },
  { mode: 'Mother', test: s => s.oxytocin   > 0.66 && s.serotonin  > 0.62 },
  { mode: 'Friend', test: s => s.serotonin  > 0.61 && s.cortisol   < 0.37 },
  { mode: 'Baby',   test: s => s.endorphin  > 0.66 && s.cortisol   < 0.30 },
]

// ── Public functions ─────────────────────────────────────────────────────────

/** Create the default balanced bio-state. */
export function initialBioState(): BioState {
  return { dopamine: 0.5, serotonin: 0.5, oxytocin: 0.5, cortisol: 0.5, adrenaline: 0.5, endorphin: 0.5 }
}

/** Classify a user message into a Command using keyword matching. */
export function classifyCommand(text: string): Command {
  const lower = text.toLowerCase()
  const priority: Array<Exclude<Command, 'Neutral'>> = [
    'Anger', 'Alert', 'BackOff', 'Bond', 'Care', 'Reward',
  ]
  for (const cmd of priority) {
    if (COMMAND_KEYWORDS[cmd].some(kw => lower.includes(kw))) return cmd
  }
  return 'Neutral'
}

/** Step the bio-state toward the command target using inertia + delta, then enforce biological constraints. */
export function applyCommand(state: BioState, command: Command): BioState {
  const targets = COMMAND_TARGETS[command]
  const next = { ...state } as Record<BioChannel, number>
  BIO_CHANNELS.forEach((ch, i) => {
    const delta = (targets[i] - state[ch]) * BIO_DELTA
    const raw = INERTIA * state[ch] + (1 - INERTIA) * (state[ch] + delta)
    next[ch] = Math.max(0, Math.min(1, raw))
  })
  // v8: biological constraint enforcement — softly push anti-correlated pairs apart
  for (const [pos, neg] of BIO_ANTI_PAIRS) {
    const conflict = Math.max(0, next[pos] + next[neg] - 1.1)
    if (conflict > 0) {
      next[neg] = Math.max(0, next[neg] - conflict * 0.3)
    }
  }
  return next as BioState
}

/** Decay all channels toward BASELINE (call once per conversational tick). */
export function homeostasisTick(state: BioState): BioState {
  const next = { ...state } as Record<BioChannel, number>
  BIO_CHANNELS.forEach(ch => {
    const diff = BASELINE - state[ch]
    next[ch] = Math.max(0, Math.min(1, state[ch] + DECAY_RATE * diff))
  })
  return next as BioState
}

/**
 * Dampen extreme values when a self-correction phrase is detected.
 * v8: if a previousState snapshot is provided, blend back toward it (55%)
 * for a more realistic partial reversal. Falls back to baseline blending.
 */
export function selfCorrect(state: BioState, text: string, previousState?: BioState): BioState {
  const lower = text.toLowerCase()
  if (!SELF_CORRECT_TRIGGERS.some(t => lower.includes(t))) return state
  const next = { ...state } as Record<BioChannel, number>
  if (previousState) {
    // v8: blend back to previous state by 55% (JK partially reverses the spike)
    BIO_CHANNELS.forEach(ch => {
      next[ch] = state[ch] * 0.45 + previousState[ch] * 0.55
    })
  }
  else {
    // fallback: dampen toward baseline
    BIO_CHANNELS.forEach(ch => {
      next[ch] = BASELINE + 0.3 * (state[ch] - BASELINE)
    })
  }
  return next as BioState
}

/** Determine the active personality mode from the current bio-state. */
export function resolveMode(state: BioState): SEOLMode {
  for (const { mode, test } of MODE_RULES) {
    if (test(state)) return mode
  }
  return 'Neutral'
}

/** Map a mode + bio-state to a concrete VRM emotion + intensity. */
export function modeToEmotion(
  mode: SEOLMode,
  state: BioState,
): { emotion: VRMEmotion; intensity: number } {
  let emotion: VRMEmotion
  let intensity: number

  switch (mode) {
    case 'GF_BF':
      emotion = 'happy';    intensity = 0.65 + state.oxytocin   * 0.35; break
    case 'Mother':
      emotion = 'neutral';  intensity = 0.55 + state.serotonin  * 0.35; break
    case 'Friend':
      emotion = 'happy';    intensity = 0.45 + state.dopamine   * 0.35; break
    case 'Baby':
      emotion = 'surprised'; intensity = 0.55 + state.endorphin * 0.40; break
    case 'Anger':
      emotion = 'angry';    intensity = 0.65 + state.adrenaline * 0.35; break
    default:
      emotion = 'neutral';  intensity = 0.50; break
  }

  // Bio overrides — acute stress → sad, acute threat → surprised
  if (state.cortisol > 0.70) {
    emotion = 'sad'
    intensity = state.cortisol * 0.90
  }
  if (state.adrenaline > 0.85 && mode !== 'Anger') {
    emotion = 'surprised'
    intensity = state.adrenaline
  }

  return { emotion, intensity: Math.min(1, intensity) }
}

/**
 * Produce a short natural-language summary of the current bio-state.
 * v8: used in LLM system prompts so the model knows how SEOL is feeling right now.
 */
export function emotionalSummary(state: BioState): string {
  const parts: string[] = []

  if      (state.dopamine   > 0.75) parts.push('ecstatic and overjoyed')
  else if (state.dopamine   > 0.63) parts.push('happy and energized')
  else if (state.dopamine   < 0.30) parts.push('low and unmotivated')

  if      (state.oxytocin   > 0.75) parts.push('deeply bonded and loving')
  else if (state.oxytocin   > 0.63) parts.push('warm and affectionate')

  if      (state.serotonin  > 0.70) parts.push('calm and emotionally stable')
  else if (state.serotonin  < 0.30) parts.push('emotionally unstable')

  if      (state.endorphin  > 0.70) parts.push('comfortable and at ease')

  if      (state.cortisol   > 0.80) parts.push('extremely stressed and overwhelmed')
  else if (state.cortisol   > 0.65) parts.push('anxious and tense')
  else if (state.cortisol   > 0.55) parts.push('slightly uneasy')

  if      (state.adrenaline > 0.80) parts.push('on edge and hyper-alert')
  else if (state.adrenaline > 0.65) parts.push('restless and reactive')

  return parts.length ? parts.join(', ') : 'balanced and neutral'
}

/**
 * Compute a scalar feeling intensity [0..1] from the current bio-state.
 * High when channels are far from baseline in either direction.
 */
export function feelingIntensity(state: BioState): number {
  const deviation = BIO_CHANNELS.reduce((sum, ch) => sum + Math.abs(state[ch] - BASELINE), 0)
  return Math.min(1, deviation / BIO_CHANNELS.length / 0.5)
}

/**
 * Compute an importance score [0..1] for a bio-state snapshot.
 * v10 RIW (Relational Importance Weighting): high-emotion turns are retained
 * longer in the LLM context window than neutral low-emotion turns.
 *
 * @param state    Bio-state at the time of the turn
 * @param command  Classified command for the turn
 */
export function importanceScore(state: BioState, command: Command): number {
  const intensity = feelingIntensity(state)
  const commandBonus = command !== 'Neutral' ? 0.20 : 0
  return Math.min(1, intensity * 0.80 + commandBonus)
}
