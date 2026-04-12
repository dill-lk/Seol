import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  allostasisTick,
  applyCommand,
  classifyCommand,
  emotionalSummary,
  emotionalValence,
  feelingIntensity,
  hebbianUpdate,
  homeostasisTick,
  importanceScore,
  initialBioState,
  initialSynapticState,
  modeToEmotion,
  resolveMode,
  selfCorrect,
} from '../composables/useBioState'
import type { BioState, Command, SEOLMode, SynapticState, VRMEmotion } from '../composables/useBioState'
import { circadianTick } from '../composables/useCircadian'
import type { ChatMessage } from '../composables/useOllama'
import { cleanResponse, streamChat } from '../composables/useOllama'
import { useSettingsStore } from './settings'

// ── Chat turn ─────────────────────────────────────────────────────────────────

export interface ChatTurn {
  id: string
  role: 'user' | 'seol'
  content: string
  command?: Command
  mode?: SEOLMode
  streaming?: boolean
  /** v10 RIW: importance score [0..1] — high-emotion turns live longer in LLM context */
  importance: number
}

// ── RIW: importance-weighted LLM history entry ────────────────────────────────

interface ScoredMessage {
  msg: ChatMessage
  score: number
}

/** Max scored messages kept in the history pool (10 exchanges). */
const MAX_HISTORY_POOL = 20

/** Max messages fed to the LLM per turn (8 = 4 exchanges). */
const MAX_LLM_CONTEXT = 8

/**
 * v10 RIW (Relational Importance Weighting) — build a context window that
 * always includes the most recent exchange plus the highest-importance turns
 * from history.  Ensures emotionally significant moments persist in context
 * longer than neutral filler.
 */
function buildRiwHistory(history: ScoredMessage[], max = MAX_LLM_CONTEXT): ChatMessage[] {
  if (history.length <= max) return history.map(h => h.msg)

  // Always keep the last 4 messages (2 most-recent exchanges)
  const tail = history.slice(-4)
  const head = history.slice(0, -4)
  const slots = max - 4

  if (slots <= 0 || head.length === 0) return tail.map(h => h.msg)

  // Pick the highest-importance turns from the head, restoring chronological order
  const sorted = [...head].sort((a, b) => b.score - a.score)
  const selected = sorted
    .slice(0, slots)
    .sort((a, b) => head.indexOf(a) - head.indexOf(b))

  return [...selected.map(h => h.msg), ...tail.map(h => h.msg)]
}

// ── Offline fallback replies ──────────────────────────────────────────────────

const OFFLINE_REPLY: Record<SEOLMode, string> = {
  GF_BF:   'Hey… I\'m right here.',
  Mother:  'It\'s okay, I\'m with you.',
  Friend:  'Bro, I\'m here.',
  Baby:    'I\'m here… with you.',
  Anger:   '…',
  Neutral: 'Yeah, I hear you.',
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSeolStore = defineStore('seol', () => {
  const settings = useSettingsStore()

  // Bio-state (reactive)
  const bioState = ref<BioState>(initialBioState())

  // v8: alert streak for trauma amplification; last state for memory-based self-correction
  const alertStreak = ref(0)
  const lastBioState = ref<BioState | undefined>(undefined)

  // v10b: Hebbian synaptic sensitivity state
  const synapticState = ref<SynapticState>(initialSynapticState())

  // v10b: allostatic load — rolling average of cortisol over last 8 turns
  const cortisolHistory = ref<number[]>([])
  const allostaticLoad = computed<number>(() => {
    if (cortisolHistory.value.length === 0) return 0.5
    return cortisolHistory.value.reduce((a, b) => a + b, 0) / cortisolHistory.value.length
  })

  // Derived: mode and emotion — computed from bio-state
  const mode = computed<SEOLMode>(() => resolveMode(bioState.value))
  const emotionState = computed(() => modeToEmotion(mode.value, bioState.value))
  const currentEmotion = computed<VRMEmotion>(() => emotionState.value.emotion)
  const emotionIntensity = computed<number>(() => emotionState.value.intensity)
  // v8: overall bio-state intensity (used by VrmViewer / BioHud)
  const bioIntensity = computed<number>(() => feelingIntensity(bioState.value))
  // v10b: emotional valence [-1..+1]
  const valence = computed<number>(() => emotionalValence(bioState.value))

  // Chat
  const turns = ref<ChatTurn[]>([])
  const isGenerating = ref(false)

  // v10 RIW: importance-weighted LLM history pool (scored messages)
  const llmHistory = ref<ScoredMessage[]>([])

  // ── Actions ────────────────────────────────────────────────────────────────

  async function sendMessage(text: string) {
    if (isGenerating.value || !text.trim()) return

    // 1. Classify & update bio-state
    const command = classifyCommand(text)

    // v8: snapshot state before change (used for memory-based self-correction)
    const prevState = { ...bioState.value }

    // v8: trauma amplification — repeated Alert/Anger commands compound cortisol
    if (command === 'Alert' || command === 'Anger') {
      alertStreak.value += 1
    }
    else {
      alertStreak.value = 0
    }

    // v10b: applyCommand now uses synaptic sensitivity + negativity bias internally
    let nextState = applyCommand(bioState.value, command, synapticState.value)

    // v8: trauma amplification — if on an alert streak, extra cortisol/adrenaline spike
    if (alertStreak.value >= 2 && (command === 'Alert' || command === 'Anger')) {
      const TRAUMA = 0.25 * Math.min(alertStreak.value - 1, 3)
      nextState = {
        ...nextState,
        cortisol:   Math.min(1, nextState.cortisol   + TRAUMA),
        adrenaline: Math.min(1, nextState.adrenaline + TRAUMA * 0.8),
      }
    }

    // v8: memory-based self-correction (blend back to pre-spike state on JK)
    nextState = selfCorrect(nextState, text, prevState)
    nextState = homeostasisTick(nextState)
    // v10: circadian rhythm modulation
    nextState = circadianTick(nextState)
    // v10b: allostatic load — HPA axis sensitization under chronic stress
    nextState = allostasisTick(nextState, allostaticLoad.value)

    // v10b: track cortisol history for allostatic load (rolling window of 8 turns)
    cortisolHistory.value = [...cortisolHistory.value, nextState.cortisol].slice(-8)

    // v10b: Hebbian LTP/LTD — update synaptic sensitivity from this turn's activation
    synapticState.value = hebbianUpdate(synapticState.value, nextState)

    bioState.value = nextState
    lastBioState.value = prevState

    // v10 RIW: compute importance for this turn
    const impScore = importanceScore(nextState, command)

    // 2. Push user turn
    const stamp = Date.now().toString()
    turns.value.push({
      id: `u-${stamp}`,
      role: 'user',
      content: text,
      command,
      mode: mode.value,
      importance: impScore,
    })

    // 3. Push placeholder SEOL turn (will be filled while streaming)
    const seolIdx = turns.value.length
    turns.value.push({
      id: `s-${stamp}`,
      role: 'seol',
      content: '',
      mode: mode.value,
      streaming: true,
      importance: impScore,
    })

    isGenerating.value = true
    let accumulated = ''

    try {
      for await (const chunk of streamChat(
        settings.ollamaUrl,
        settings.ollamaModel,
        mode.value,
        bioState.value,
        emotionalSummary(bioState.value, allostaticLoad.value),
        buildRiwHistory(llmHistory.value),
        text,
      )) {
        accumulated += chunk
        // live-update the turn while streaming
        turns.value[seolIdx].content = accumulated
      }
    }
    catch (err) {
      console.error('[SEOL] LLM error:', err)
      accumulated = OFFLINE_REPLY[mode.value]
      turns.value[seolIdx].content = accumulated
    }
    finally {
      isGenerating.value = false
      const cleaned = cleanResponse(accumulated)
      turns.value[seolIdx].content = cleaned
      turns.value[seolIdx].streaming = false

      // v10 RIW: add both messages to the scored pool, capped at MAX_HISTORY_POOL
      llmHistory.value = [
        ...llmHistory.value,
        { msg: { role: 'user' as const,      content: text },   score: impScore },
        { msg: { role: 'assistant' as const, content: cleaned }, score: impScore },
      ].slice(-MAX_HISTORY_POOL)
    }
  }

  function resetConversation() {
    turns.value = []
    llmHistory.value = []
    bioState.value = initialBioState()
    alertStreak.value = 0
    lastBioState.value = undefined
    synapticState.value = initialSynapticState()
    cortisolHistory.value = []
  }

  return {
    bioState,
    mode,
    currentEmotion,
    emotionIntensity,
    bioIntensity,
    valence,
    synapticState,
    allostaticLoad,
    turns,
    isGenerating,
    sendMessage,
    resetConversation,
  }
})
