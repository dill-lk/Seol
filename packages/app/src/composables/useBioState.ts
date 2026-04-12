/**
 * SEOL AF Bio-State Engine  (TypeScript)
 *
 * Based on the SEOL AF v8 research (seol_v8.ipynb) — progressively enhanced
 * through v10 with deeper neuroscientific grounding.
 *
 * Implemented biological mechanisms (in order of addition):
 *   v8  — Six bio-channels, command targets, inertia, anti-correlated pairs,
 *          homeostasis, self-correction, trauma amplification
 *   v10 — Circadian rhythm (useCircadian.ts), RIW memory, importanceScore
 *   v10b — Per-channel decay rates, negativity bias, synaptic sensitivity
 *           (Hebbian LTP/LTD), allostatic load (HPA sensitization),
 *           emotional valence scalar
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

/**
 * Synaptic sensitivity per bio-channel.
 * v10b Hebbian LTP/LTD — channels that fire repeatedly sensitize (> 1.0);
 * channels that stay suppressed desensitize (< 1.0).
 * Range: [SENSITIVITY_MIN .. SENSITIVITY_MAX].
 */
export interface SynapticState {
  sensitivity: Record<BioChannel, number>
}

// ── Constants ────────────────────────────────────────────────────────────────

export const BIO_CHANNELS: BioChannel[] = [
  'dopamine', 'serotonin', 'oxytocin', 'cortisol', 'adrenaline', 'endorphin',
]

/** Positive channels — drive pleasant emotional states. */
export const POSITIVE_CHANNELS: BioChannel[] = ['dopamine', 'serotonin', 'oxytocin', 'endorphin']

/** Stress channels — drive threat / anxiety states. */
export const STRESS_CHANNELS: BioChannel[] = ['cortisol', 'adrenaline']

const BASELINE = 0.5
const INERTIA = 0.70      // how much old state persists
const BIO_DELTA = 0.60    // base step size toward target

/**
 * v10b — Biologically accurate per-channel decay rates toward baseline.
 * Reference: approximate neurotransmitter half-life ordering.
 *
 * Adrenaline  : clears in ~20-30 min  → fast (0.065)
 * Dopamine    : reward signal clears quickly → fast (0.048)
 * Cortisol    : stress hormones linger ~60-90 min → medium (0.034)
 * Endorphin   : comfort chemicals persist ~1-2h → medium-slow (0.028)
 * Oxytocin    : bonding hormone lingers hours → slow (0.022)
 * Serotonin   : mood stabiliser — very slow to shift (0.016)
 */
const CHANNEL_DECAY_RATES: Record<BioChannel, number> = {
  dopamine:   0.048,
  serotonin:  0.016,
  oxytocin:   0.022,
  cortisol:   0.034,
  adrenaline: 0.065,
  endorphin:  0.028,
}

/**
 * v10b — Negativity bias (Baumeister et al., "Bad is stronger than good").
 * Negative-valence commands drive larger amplitude state changes.
 */
const NEGATIVITY_BIAS = 1.30

const NEGATIVE_COMMANDS = new Set<Command>(['Anger', 'Alert', 'BackOff'])

/**
 * v10b — Hebbian learning rates.
 * LTP (Long-Term Potentiation): channel sensitizes with repeated activation.
 * LTD (Long-Term Depression):   channel desensitizes with repeated suppression.
 */
const LTP_RATE = 0.018   // per-turn sensitization
const LTD_RATE = 0.012   // per-turn desensitization
const SENSITIVITY_MIN = 0.70
const SENSITIVITY_MAX = 1.35
const SENSITIVITY_BASELINE = 1.0
const SENSITIVITY_DECAY = 0.004  // sensitivity drifts back toward 1.0 per turn

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

/** Create the default synaptic sensitivity state (all channels at 1.0). */
export function initialSynapticState(): SynapticState {
  return {
    sensitivity: {
      dopamine: 1.0, serotonin: 1.0, oxytocin: 1.0,
      cortisol: 1.0, adrenaline: 1.0, endorphin: 1.0,
    },
  }
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

/**
 * Step the bio-state toward the command target using inertia + delta,
 * then enforce biological constraints.
 *
 * v10b additions:
 *  - Negativity bias scales BIO_DELTA × NEGATIVITY_BIAS for negative commands.
 *  - Synaptic sensitivity (optional) scales per-channel delta via Hebbian weights.
 */
export function applyCommand(
  state: BioState,
  command: Command,
  synaptic?: SynapticState,
): BioState {
  const targets = COMMAND_TARGETS[command]
  const negBias = NEGATIVE_COMMANDS.has(command) ? NEGATIVITY_BIAS : 1.0
  const next = { ...state } as Record<BioChannel, number>

  BIO_CHANNELS.forEach((ch, i) => {
    const sensitivity = synaptic?.sensitivity[ch] ?? 1.0
    const effectiveDelta = BIO_DELTA * negBias * sensitivity
    const delta = (targets[i] - state[ch]) * effectiveDelta
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

/**
 * v10b Hebbian learning: update per-channel synaptic sensitivity.
 *
 * Long-Term Potentiation (LTP): if a channel moved significantly toward a high
 *   value (>0.60) this turn, its sensitivity increases slightly.
 * Long-Term Depression (LTD): if a channel was suppressed below 0.35,
 *   sensitivity decreases slightly.
 * Passive decay: all sensitivities drift back toward 1.0 each turn.
 *
 * @param synaptic   Current synaptic state
 * @param nextState  Bio-state after applying the current command
 */
export function hebbianUpdate(synaptic: SynapticState, nextState: BioState): SynapticState {
  const next: Record<BioChannel, number> = { ...synaptic.sensitivity }
  for (const ch of BIO_CHANNELS) {
    const val = nextState[ch]
    // Passive drift toward 1.0
    const drift = (SENSITIVITY_BASELINE - next[ch]) * SENSITIVITY_DECAY
    next[ch] += drift
    // LTP: repeated activation above threshold
    if (val > 0.60) {
      next[ch] += LTP_RATE * (val - 0.60) * 2.5
    }
    // LTD: repeated suppression below threshold
    if (val < 0.35) {
      next[ch] -= LTD_RATE * (0.35 - val) * 2.5
    }
    next[ch] = Math.max(SENSITIVITY_MIN, Math.min(SENSITIVITY_MAX, next[ch]))
  }
  return { sensitivity: next }
}

/**
 * v10b Allostatic load — apply HPA axis sensitization.
 *
 * When cortisol has been chronically elevated (load > 0.55), the effective
 * resting baseline for cortisol drifts up and serotonin is mildly suppressed
 * (chronic stress depletes serotonin synthesis over time).
 *
 * @param state        Current bio-state
 * @param cortisolLoad Running average of cortisol over recent turns [0..1]
 */
export function allostasisTick(state: BioState, cortisolLoad: number): BioState {
  if (cortisolLoad <= 0.55) return state

  // HPA sensitization: each turn under chronic stress adds a tiny cortisol floor push
  const loadExcess = cortisolLoad - 0.55
  const cortisolNudge = loadExcess * 0.06
  // Serotonin depletion from chronic stress (mild)
  const seroDepletion = loadExcess * 0.04

  return {
    ...state,
    cortisol:  Math.min(1, state.cortisol  + cortisolNudge),
    serotonin: Math.max(0, state.serotonin - seroDepletion),
  }
}

/**
 * Decay all channels toward their individual baselines (call once per
 * conversational tick).
 *
 * v10b: uses per-channel CHANNEL_DECAY_RATES for biological accuracy.
 *        An optional allostaticBaseline shifts the effective resting point
 *        for stress channels under chronic load.
 */
export function homeostasisTick(
  state: BioState,
  allostaticBaseline?: Partial<Record<BioChannel, number>>,
): BioState {
  const next = { ...state } as Record<BioChannel, number>
  for (const ch of BIO_CHANNELS) {
    const target = allostaticBaseline?.[ch] ?? BASELINE
    const rate   = CHANNEL_DECAY_RATES[ch]
    const diff   = target - state[ch]
    next[ch] = Math.max(0, Math.min(1, state[ch] + rate * diff))
  }
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
 * v10b: includes allostatic state annotation if applicable.
 */
export function emotionalSummary(state: BioState, allostaticLoad = 0): string {
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

  // v10b: annotate chronic stress
  if (allostaticLoad > 0.65) parts.push('exhausted from sustained stress')
  else if (allostaticLoad > 0.55) parts.push('worn down by ongoing tension')

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
 * v10b — Emotional valence: a single [-1..+1] scalar.
 *
 * +1 = maximally positive (high dopamine/oxytocin/serotonin/endorphin, low stress)
 * -1 = maximally negative (high cortisol/adrenaline, low positive channels)
 *
 * Used in BioHud display and can be injected into LLM prompts.
 */
export function emotionalValence(state: BioState): number {
  const positiveScore = (state.dopamine + state.oxytocin + state.serotonin + state.endorphin) / 4
  const stressScore   = (state.cortisol + state.adrenaline) / 2
  // Map positive [0..1] → [+1] and stress [0..1] → [-1]
  return Math.max(-1, Math.min(1, (positiveScore - stressScore) * 2 - 0.5))
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

