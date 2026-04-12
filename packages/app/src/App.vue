<template>
  <div class="app-shell">
    <!-- 3-D model fills the left/center area -->
    <div class="scene-area">
      <VrmViewer :model-url="settings.vrmUrl" />

      <!-- Bio-state HUD (top-left overlay) -->
      <div v-if="settings.showBioHud" class="hud-overlay">
        <BioHud />
      </div>

      <!-- Settings drawer toggle -->
      <button class="gear-btn" title="Settings" @click="showSettings = !showSettings">⚙</button>

      <!-- Settings drawer -->
      <Transition name="slide-up">
        <div v-if="showSettings" class="settings-drawer">
          <h3>Settings</h3>

          <label class="field">
            <span>VRM URL</span>
            <input
              v-model="settings.vrmUrl"
              placeholder="https://… .vrm"
              type="url"
            />
          </label>

          <label class="field">
            <span>Ollama URL</span>
            <input v-model="settings.ollamaUrl" placeholder="http://localhost:11434" />
          </label>

          <label class="field">
            <span>Model</span>
            <input v-model="settings.ollamaModel" placeholder="mistral" />
          </label>

          <label class="field checkbox">
            <input v-model="settings.showBioHud" type="checkbox" />
            <span>Show bio-state HUD</span>
          </label>

          <button class="reset-btn" @click="seol.resetConversation()">Reset conversation</button>
        </div>
      </Transition>
    </div>

    <!-- Chat panel — right column -->
    <div class="chat-area">
      <ChatPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BioHud from './components/BioHud.vue'
import ChatPanel from './components/ChatPanel.vue'
import VrmViewer from './components/VrmViewer.vue'
import { useSeolStore } from './stores/seol'
import { useSettingsStore } from './stores/settings'

const settings = useSettingsStore()
const seol = useSeolStore()

const showSettings = ref(false)
</script>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.scene-area {
  flex: 1;
  position: relative;
  min-width: 0;
}

.chat-area {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
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
  transition: background 0.2s;
}

.gear-btn:hover { background: rgba(255,255,255,0.10); }

/* Settings drawer */
.settings-drawer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 30;
  background: rgba(12, 12, 24, 0.92);
  backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255,255,255,0.10);
  padding: 20px 20px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-drawer h3 {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.06em;
  opacity: 0.65;
  text-transform: uppercase;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 13px;
}

.field.checkbox {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.field span { opacity: 0.65; font-size: 12px; }

.field input[type="text"],
.field input[type="url"],
.field input:not([type]) {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  padding: 7px 12px;
  color: #e8e8f0;
  font-size: 13px;
  outline: none;
}

.field input:focus {
  border-color: rgba(160,130,255,0.50);
}

.reset-btn {
  align-self: flex-start;
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255,100,100,0.35);
  background: transparent;
  color: #ff8080;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.reset-btn:hover { background: rgba(255,100,100,0.12); }

/* Transitions */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(30px);
  opacity: 0;
}
</style>
