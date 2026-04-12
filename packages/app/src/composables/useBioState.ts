/**
 * SEOL AF Bio-State Engine  (TypeScript)
 *
 * Ported from seol_v9.ipynb research notebooks.
 * Implements the Artificial Feelings architecture: six bio-channels modelled
 * after neurotransmitters/hormones, command-driven state updates, homeostasis
 * decay, mode resolution and VRM emotion mapping.
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
const DECAY_RATE = 0.03   // per homeostasis tick
const INERTIA = 0.70      // how much old state persists
const BIO_DELTA = 0.60    // step size toward target

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

/** Mode activation rules — evaluated in priority order. */
const MODE_RULES: Array<{ mode: SEOLMode; test: (s: BioState) => boolean }> = [
  { mode: 'Anger',  test: s => s.adrenaline > 0.72 && s.cortisol   > 0.72 },
  { mode: 'GF_BF',  test: s => s.oxytocin   > 0.62 && s.dopamine   > 0.60 },
  { mode: 'Mother', test: s => s.oxytocin   > 0.65 && s.serotonin  > 0.60 },
  { mode: 'Friend', test: s => s.serotonin  > 0.59 && s.cortisol   < 0.38 },
  { mode: 'Baby',   test: s => s.endorphin  > 0.64 && s.cortisol   < 0.32 },
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

/** Step the bio-state toward the command target using inertia + delta. */
export function applyCommand(state: BioState, command: Command): BioState {
  const targets = COMMAND_TARGETS[command]
  const next = { ...state } as Record<BioChannel, number>
  BIO_CHANNELS.forEach((ch, i) => {
    const delta = (targets[i] - state[ch]) * BIO_DELTA
    const raw = INERTIA * state[ch] + (1 - INERTIA) * (state[ch] + delta)
    next[ch] = Math.max(0, Math.min(1, raw))
  })
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

/** Dampen extreme values when a self-correction phrase is detected. */
export function selfCorrect(state: BioState, text: string): BioState {
  const lower = text.toLowerCase()
  if (!SELF_CORRECT_TRIGGERS.some(t => lower.includes(t))) return state
  const next = { ...state } as Record<BioChannel, number>
  BIO_CHANNELS.forEach(ch => {
    next[ch] = BASELINE + 0.3 * (state[ch] - BASELINE)
  })
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
