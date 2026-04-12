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
        <!-- v10b: synaptic sensitivity indicator -->
        <span
          class="ch-sens"
          :style="{ color: sensitivityColor(store.synapticState.sensitivity[ch]) }"
          :title="`Synaptic sensitivity: ${(store.synapticState.sensitivity[ch] * 100).toFixed(0)}%`"
        >●</span>
      </div>
    </div>

    <!-- v10b: Emotional valence bar -->
    <div class="hud-valence">
      <span class="valence-label">valence</span>
      <div class="valence-track">
        <div class="valence-center" />
        <div
          class="valence-fill"
          :style="valenceFillStyle(store.valence)"
        />
      </div>
      <span class="valence-num">{{ store.valence >= 0 ? '+' : '' }}{{ store.valence.toFixed(2) }}</span>
    </div>

    <!-- v10b: Allostatic load indicator (only shown when elevated) -->
    <div v-if="store.allostaticLoad > 0.55" class="hud-allostasis">
      <span class="allostasis-label">load</span>
      <div class="allostasis-bar-bg">
        <div
          class="allostasis-bar-fill"
          :style="{ width: `${Math.min(100, (store.allostaticLoad - 0.55) / 0.45 * 100)}%` }"
        />
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

/**
 * v10b — Color for synaptic sensitivity dot.
 * > 1.08 → green (sensitized/LTP), < 0.92 → red (desensitized/LTD), else dim gray.
 */
function sensitivityColor(s: number): string {
  if (s > 1.08) return `rgba(80,220,120,${0.45 + (s - 1) * 0.8})`
  if (s < 0.92) return `rgba(220,80,80,${0.45 + (1 - s) * 0.8})`
  return 'rgba(255,255,255,0.18)'
}

/**
 * v10b — Compute inline style for the valence fill bar.
 * Positive → right half green, negative → left half red.
 */
function valenceFillStyle(v: number): Record<string, string> {
  const pct = Math.abs(v) * 50
  if (v >= 0) {
    return {
      left: '50%',
      width: `${pct}%`,
      background: `rgba(80,220,120,0.75)`,
      borderRadius: '0 3px 3px 0',
    }
  }
  return {
    left: `${50 - pct}%`,
    width: `${pct}%`,
    background: `rgba(220,80,80,0.75)`,
    borderRadius: '3px 0 0 3px',
  }
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
  min-width: 195px;
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
  width: 22px;
  text-align: right;
  font-size: 11px;
  opacity: 0.65;
  font-variant-numeric: tabular-nums;
}

/* v10b: synaptic sensitivity dot */
.ch-sens {
  width: 10px;
  font-size: 8px;
  text-align: center;
  transition: color 0.4s ease;
  cursor: default;
}

/* v10b: Valence bar */
.hud-valence {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.valence-label {
  font-size: 10px;
  opacity: 0.40;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  width: 36px;
}

.valence-track {
  flex: 1;
  height: 5px;
  background: rgba(255,255,255,0.07);
  border-radius: 3px;
  position: relative;
  overflow: hidden;
}

.valence-center {
  position: absolute;
  left: 50%;
  top: 0;
  width: 1px;
  height: 100%;
  background: rgba(255,255,255,0.18);
}

.valence-fill {
  position: absolute;
  top: 0;
  height: 100%;
  transition: left 0.4s ease, width 0.4s ease, background 0.4s ease;
}

.valence-num {
  width: 34px;
  text-align: right;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  opacity: 0.50;
}

/* v10b: Allostatic load bar */
.hud-allostasis {
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.allostasis-label {
  font-size: 10px;
  opacity: 0.40;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  width: 36px;
  color: #ff9090;
}

.allostasis-bar-bg {
  flex: 1;
  height: 4px;
  background: rgba(255,255,255,0.06);
  border-radius: 2px;
  overflow: hidden;
}

.allostasis-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(220,100,60,0.60), rgba(255,60,60,0.85));
  border-radius: 2px;
  transition: width 0.5s ease;
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

