<template>
  <div class="chat-panel">
    <!-- Character header -->
    <div class="chat-header">
      <div class="header-left">
        <span class="char-name">SEOL</span>
        <span class="char-mode">{{ modeLabel }}</span>
      </div>
      <div class="header-right">
        <span class="emotion-pill" :class="`emotion-${store.currentEmotion}`">
          {{ emotionEmoji }} {{ store.currentEmotion }}
        </span>
      </div>
    </div>

    <!-- Message list -->
    <div ref="scrollRef" class="messages">
      <div
        v-for="turn in store.turns"
        :key="turn.id"
        class="turn"
        :class="turn.role"
      >
        <div class="bubble">
          <span class="text">{{ turn.content }}</span>
          <span v-if="turn.streaming" class="cursor" />
        </div>
        <div v-if="turn.command && turn.command !== 'Neutral'" class="meta">
          {{ turn.command }} · {{ turn.mode }}
        </div>
      </div>

      <div v-if="store.isGenerating && lastTurnIsUser" class="turn seol">
        <div class="bubble thinking">
          <span class="dot" /><span class="dot" /><span class="dot" />
        </div>
      </div>

      <div v-if="store.turns.length === 0" class="empty-hint">
        Say something…
      </div>
    </div>

    <!-- Input row -->
    <form class="input-row" @submit.prevent="onSend">
      <input
        v-model="inputText"
        class="msg-input"
        placeholder="Type a message…"
        :disabled="store.isGenerating"
        autocomplete="off"
        @keydown.enter.exact.prevent="onSend"
      />
      <button type="submit" class="send-btn" :disabled="store.isGenerating || !inputText.trim()">
        ↑
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useSeolStore } from '../stores/seol'

const store = useSeolStore()
const inputText = ref('')
const scrollRef = ref<HTMLElement>()

const lastTurnIsUser = computed(() => {
  const last = store.turns[store.turns.length - 1]
  return last?.role === 'user'
})

const MODE_LABELS: Record<string, string> = {
  GF_BF:   'Romantic',
  Mother:  'Caring',
  Friend:  'Friendly',
  Baby:    'Playful',
  Anger:   'Upset',
  Neutral: 'Neutral',
}

const EMOTION_EMOJI: Record<string, string> = {
  happy:     '😊',
  sad:       '😢',
  angry:     '😠',
  surprised: '😲',
  neutral:   '😐',
  think:     '🤔',
}

const modeLabel = computed(() => MODE_LABELS[store.mode] ?? store.mode)
const emotionEmoji = computed(() => EMOTION_EMOJI[store.currentEmotion] ?? '😐')

async function onSend() {
  const text = inputText.value.trim()
  if (!text || store.isGenerating) return
  inputText.value = ''
  await store.sendMessage(text)
}

// Auto-scroll on new turns
watch(
  () => store.turns.length,
  async () => {
    await nextTick()
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  },
)

// Also scroll while streaming content updates
watch(
  () => store.turns[store.turns.length - 1]?.content,
  async () => {
    await nextTick()
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  },
)
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(10, 10, 20, 0.70);
  backdrop-filter: blur(12px);
  border-left: 1px solid rgba(255,255,255,0.07);
}

/* ── Character header ─────────────────────────────────────────────────────── */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.02);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.char-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.10em;
  color: #c8b8ff;
  line-height: 1.2;
}

.char-mode {
  font-size: 10px;
  color: rgba(255,255,255,0.35);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.emotion-pill {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.55);
  white-space: nowrap;
  transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

.emotion-happy    { border-color: rgba(100,220,130,0.35); color: rgba(130,255,160,0.80); background: rgba(60,180,90,0.08); }
.emotion-sad      { border-color: rgba(100,140,255,0.35); color: rgba(140,170,255,0.80); background: rgba(60,100,200,0.08); }
.emotion-angry    { border-color: rgba(255,100,80,0.35);  color: rgba(255,140,120,0.80); background: rgba(200,60,40,0.08); }
.emotion-surprised { border-color: rgba(255,200,80,0.35); color: rgba(255,220,130,0.80); background: rgba(200,150,40,0.08); }
.emotion-neutral  { border-color: rgba(160,140,200,0.25); color: rgba(200,190,230,0.65); background: rgba(100,90,140,0.06); }
.emotion-think    { border-color: rgba(180,160,255,0.30); color: rgba(200,185,255,0.75); background: rgba(120,100,200,0.07); }

/* Messages */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.12) transparent;
}

.empty-hint {
  text-align: center;
  opacity: 0.25;
  font-size: 14px;
  margin-top: auto;
  margin-bottom: auto;
}

/* Turns */
.turn { display: flex; flex-direction: column; gap: 3px; }
.turn.user  { align-items: flex-end; }
.turn.seol  { align-items: flex-start; }

.bubble {
  max-width: 82%;
  padding: 9px 13px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.turn.user .bubble {
  background: #3a2e6e;
  color: #e8e0ff;
  border-bottom-right-radius: 4px;
}

.turn.seol .bubble {
  background: rgba(255,255,255,0.07);
  color: #e8e8f0;
  border-bottom-left-radius: 4px;
}

.bubble.thinking {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 12px 16px;
}

.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.4);
  animation: blink 1.2s infinite;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
  40%           { opacity: 1;   transform: scale(1); }
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: currentColor;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink-cursor 0.8s infinite;
}

@keyframes blink-cursor {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0; }
}

.meta {
  font-size: 10px;
  opacity: 0.35;
  padding: 0 4px;
  letter-spacing: 0.04em;
}
.turn.user  .meta { align-self: flex-end; }
.turn.seol  .meta { align-self: flex-start; }

/* Input */
.input-row {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid rgba(255,255,255,0.07);
}

.msg-input {
  flex: 1;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 24px;
  padding: 9px 16px;
  color: #e8e8f0;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.msg-input:focus {
  border-color: rgba(160,130,255,0.55);
}

.msg-input:disabled {
  opacity: 0.45;
}

.msg-input::placeholder { color: rgba(255,255,255,0.25); }

.send-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  background: #6c4fc0;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s, opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn:hover:not(:disabled) { background: #8060e0; }
.send-btn:disabled { opacity: 0.35; cursor: default; }
</style>
