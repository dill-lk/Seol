import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  applyCommand,
  classifyCommand,
  emotionalSummary,
  feelingIntensity,
  homeostasisTick,
  initialBioState,
  modeToEmotion,
  resolveMode,
  selfCorrect,
} from '../composables/useBioState'
import type { BioState, Command, SEOLMode, VRMEmotion } from '../composables/useBioState'
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

  // Derived: mode and emotion — computed from bio-state
  const mode = computed<SEOLMode>(() => resolveMode(bioState.value))
  const emotionState = computed(() => modeToEmotion(mode.value, bioState.value))
  const currentEmotion = computed<VRMEmotion>(() => emotionState.value.emotion)
  const emotionIntensity = computed<number>(() => emotionState.value.intensity)
  // v8: overall bio-state intensity (used by VrmViewer / BioHud)
  const bioIntensity = computed<number>(() => feelingIntensity(bioState.value))

  // Chat
  const turns = ref<ChatTurn[]>([])
  const isGenerating = ref(false)

  // Short LLM context window (last 3 user+assistant pairs)
  const llmHistory = ref<ChatMessage[]>([])

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

    let nextState = applyCommand(bioState.value, command)

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

    bioState.value = nextState
    lastBioState.value = prevState

    // 2. Push user turn
    const stamp = Date.now().toString()
    turns.value.push({
      id: `u-${stamp}`,
      role: 'user',
      content: text,
      command,
      mode: mode.value,
    })

    // 3. Push placeholder SEOL turn (will be filled while streaming)
    const seolIdx = turns.value.length
    turns.value.push({
      id: `s-${stamp}`,
      role: 'seol',
      content: '',
      mode: mode.value,
      streaming: true,
    })

    isGenerating.value = true
    let accumulated = ''

    try {
      for await (const chunk of streamChat(
        settings.ollamaUrl,
        settings.ollamaModel,
        mode.value,
        bioState.value,
        emotionalSummary(bioState.value),
        llmHistory.value,
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

      // Keep last 3 pairs (6 messages) in LLM context
      llmHistory.value = ([
        ...llmHistory.value,
        { role: 'user' as const,      content: text },
        { role: 'assistant' as const, content: cleaned },
      ] satisfies ChatMessage[]).slice(-6)
    }
  }

  function resetConversation() {
    turns.value = []
    llmHistory.value = []
    bioState.value = initialBioState()
    alertStreak.value = 0
    lastBioState.value = undefined
  }

  return {
    bioState,
    mode,
    currentEmotion,
    emotionIntensity,
    bioIntensity,
    turns,
    isGenerating,
    sendMessage,
    resetConversation,
  }
})
