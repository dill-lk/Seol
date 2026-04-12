<template>
  <div class="bio-hud">
    <div class="hud-mode">{{ store.mode }}</div>
    <div class="hud-channels">
      <div
        v-for="ch in channels"
        :key="ch"
        class="channel-row"
      >
        <span class="ch-label">{{ ch.slice(0, 3) }}</span>
        <div class="ch-bar-bg">
          <div
            class="ch-bar-fill"
            :style="{
              width: `${store.bioState[ch] * 100}%`,
              background: channelColor(ch, store.bioState[ch]),
            }"
          />
        </div>
        <span class="ch-val">{{ (store.bioState[ch] * 100).toFixed(0) }}</span>
      </div>
    </div>
    <div class="hud-emotion">
      🎭 {{ store.currentEmotion }}
      <span class="intensity">{{ (store.emotionIntensity * 100).toFixed(0) }}%</span>
    </div>
    <div class="hud-circadian">
      {{ circadianEmoji }} {{ circadianLabel }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BioChannel } from '../composables/useBioState'
import { BIO_CHANNELS } from '../composables/useBioState'
import { circadianPhaseEmoji, circadianPhaseLabel } from '../composables/useCircadian'
import { useSeolStore } from '../stores/seol'

const store = useSeolStore()
const channels: BioChannel[] = BIO_CHANNELS

const circadianLabel = computed(() => circadianPhaseLabel())
const circadianEmoji = computed(() => circadianPhaseEmoji(circadianLabel.value))

function channelColor(ch: BioChannel, val: number): string {
  // positive channels → green-ish; stress channels → red-ish
  const stress = ch === 'cortisol' || ch === 'adrenaline'
  if (stress) {
    const r = Math.round(80 + val * 175)
    const g = Math.round(60 - val * 40)
    return `rgb(${r},${g},60)`
  }
  const r = Math.round(60 + (1 - val) * 100)
  const g = Math.round(100 + val * 155)
  const b = Math.round(80 + val * 120)
  return `rgb(${r},${g},${b})`
}
</script>

<style scoped>
.bio-hud {
  background: rgba(10, 10, 20, 0.75);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12px;
  min-width: 170px;
  color: #d0d0e0;
  user-select: none;
}

.hud-mode {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #c0aaff;
  margin-bottom: 8px;
}

.hud-channels { display: flex; flex-direction: column; gap: 4px; }

.channel-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ch-label {
  width: 28px;
  font-size: 11px;
  opacity: 0.65;
  text-transform: uppercase;
}

.ch-bar-bg {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.08);
  border-radius: 3px;
  overflow: hidden;
}

.ch-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease, background 0.4s ease;
}

.ch-val {
  width: 24px;
  text-align: right;
  font-size: 11px;
  opacity: 0.65;
  font-variant-numeric: tabular-nums;
}

.hud-emotion {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.80;
  display: flex;
  gap: 6px;
  align-items: center;
}

.intensity {
  font-size: 11px;
  opacity: 0.55;
}

.hud-circadian {
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.50;
  letter-spacing: 0.03em;
}
</style>
