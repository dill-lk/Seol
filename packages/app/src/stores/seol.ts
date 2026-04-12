import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  applyCommand,
  classifyCommand,
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

  // Derived: mode and emotion — computed from bio-state
  const mode = computed<SEOLMode>(() => resolveMode(bioState.value))
  const emotionState = computed(() => modeToEmotion(mode.value, bioState.value))
  const currentEmotion = computed<VRMEmotion>(() => emotionState.value.emotion)
  const emotionIntensity = computed<number>(() => emotionState.value.intensity)

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
    bioState.value = applyCommand(bioState.value, command)
    bioState.value = selfCorrect(bioState.value, text)
    bioState.value = homeostasisTick(bioState.value)

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
  }

  return {
    bioState,
    mode,
    currentEmotion,
    emotionIntensity,
    turns,
    isGenerating,
    sendMessage,
    resetConversation,
  }
})
