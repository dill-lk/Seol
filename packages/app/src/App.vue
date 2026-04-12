<template>
  <div class="app-shell">
    <!-- Ambient background gradient -->
    <div class="ambient-bg" aria-hidden="true" />

    <!-- 3-D model fills the left/center area -->
    <div class="scene-area">
      <VrmViewer :model-url="settings.vrmUrl" />

      <!-- Bio-state HUD (top-left overlay) -->
      <div v-if="settings.showBioHud" class="hud-overlay">
        <BioHud />
      </div>

      <!-- Settings gear button -->
      <button class="gear-btn" title="Settings" @click="showSettings = true">⚙</button>
    </div>

    <!-- Chat panel — right column -->
    <div class="chat-area">
      <ChatPanel />
    </div>

    <!-- Settings modal -->
    <SettingsPanel v-model="showSettings" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BioHud from './components/BioHud.vue'
import ChatPanel from './components/ChatPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import VrmViewer from './components/VrmViewer.vue'
import { useSettingsStore } from './stores/settings'

const settings = useSettingsStore()

const showSettings = ref(false)
</script>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

/* Ambient background — slow-drifting colour clouds */
.ambient-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse 60% 55% at 35% 65%, rgba(72, 32, 140, 0.22) 0%, transparent 70%),
    radial-gradient(ellipse 50% 45% at 70% 30%, rgba(30, 50, 160, 0.16) 0%, transparent 65%),
    radial-gradient(ellipse 40% 40% at 20% 20%, rgba(120, 60, 200, 0.10) 0%, transparent 60%),
    #07070f;
  animation: ambient-drift 28s ease-in-out infinite alternate;
  pointer-events: none;
}

@keyframes ambient-drift {
  0%   { filter: hue-rotate(0deg)   brightness(1.00); }
  50%  { filter: hue-rotate(12deg)  brightness(1.04); }
  100% { filter: hue-rotate(-8deg)  brightness(0.97); }
}

.scene-area {
  flex: 1;
  position: relative;
  min-width: 0;
  z-index: 1;
}

.chat-area {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}

/* HUD overlay */
.hud-overlay {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 10;
  pointer-events: none;
}

/* Gear button */
.gear-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 20;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(10,10,20,0.70);
  color: #e8e8f0;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  transition: background 0.2s, transform 0.2s;
}

.gear-btn:hover {
  background: rgba(255,255,255,0.10);
  transform: rotate(30deg);
}
</style>

