<template>
  <Teleport to="body">
    <Transition name="sp-fade">
      <div v-if="modelValue" class="sp-backdrop" @click.self="close">
        <Transition name="sp-slide">
          <div v-if="modelValue" class="sp-modal" role="dialog" aria-modal="true" aria-label="SEOL Settings">
            <!-- Header -->
            <div class="sp-header">
              <span class="sp-title">⚙ Settings</span>
              <button class="sp-close" aria-label="Close settings" @click="close">✕</button>
            </div>

            <!-- Tab bar -->
            <div class="sp-tabs" role="tablist">
              <button
                v-for="t in TABS"
                :key="t.id"
                role="tab"
                class="sp-tab"
                :class="{ active: activeTab === t.id }"
                @click="activeTab = t.id"
              >
                {{ t.label }}
              </button>
            </div>

            <!-- Tab body -->
            <div class="sp-body">

              <!-- ── General ─────────────────────────────────────────── -->
              <template v-if="activeTab === 'general'">
                <div class="sp-section">
                  <label class="sp-field">
                    <span class="sp-label">VRM Model URL</span>
                    <input
                      v-model="settings.vrmUrl"
                      class="sp-input"
                      type="url"
                      placeholder="https://…/model.vrm"
                    />
                  </label>

                  <label class="sp-field">
                    <span class="sp-label">Ollama URL</span>
                    <input
                      v-model="settings.ollamaUrl"
                      class="sp-input"
                      placeholder="http://localhost:11434"
                    />
                  </label>

                  <label class="sp-field">
                    <span class="sp-label">Model tag</span>
                    <input
                      v-model="settings.ollamaModel"
                      class="sp-input"
                      placeholder="dolphin-mistral"
                    />
                    <span class="sp-sublabel">Use the Models tab to browse recommended options.</span>
                  </label>

                  <label class="sp-field sp-field--row">
                    <input v-model="settings.showBioHud" type="checkbox" class="sp-check" />
                    <span>Show bio-state HUD</span>
                  </label>
                </div>

                <div class="sp-actions">
                  <button class="sp-btn sp-btn--danger" @click="onReset">
                    Reset conversation &amp; bio-state
                  </button>
                </div>
              </template>

              <!-- ── Models ─────────────────────────────────────────── -->
              <template v-else-if="activeTab === 'models'">
                <p class="sp-hint">
                  Click to select a model. Run
                  <code>ollama pull &lt;tag&gt;</code>
                  to download it first.
                </p>
                <div class="sp-model-list">
                  <button
                    v-for="m in CURATED_MODELS"
                    :key="m.tag"
                    class="sp-model-card"
                    :class="{ selected: settings.ollamaModel === m.tag }"
                    @click="settings.ollamaModel = m.tag"
                  >
                    <div class="mc-top">
                      <span class="mc-name">{{ m.displayName }}</span>
                      <span class="mc-size">{{ m.sizeLabel }}</span>
                    </div>
                    <div class="mc-tag">{{ m.tag }}</div>
                    <div class="mc-notes">{{ m.notes }}</div>
                    <span v-if="settings.ollamaModel === m.tag" class="mc-active">✓ active</span>
                  </button>
                </div>
              </template>

              <!-- ── About ──────────────────────────────────────────── -->
              <template v-else-if="activeTab === 'about'">
                <div class="sp-about">
                  <h3>SEOL — AF Companion</h3>
                  <p>
                    An Artificial Feelings companion powered by a local Ollama LLM and a VRM
                    3-D character. Emotions are driven by a six-channel bio-state engine
                    (dopamine, serotonin, oxytocin, cortisol, adrenaline, endorphin) with
                    v8 trauma amplification, v8 memory-based self-correction, and v10
                    circadian rhythm modulation and RIW importance-weighted context.
                  </p>

                  <h4>Start Ollama with CORS enabled</h4>
                  <pre>OLLAMA_ORIGINS='*' ollama serve</pre>

                  <h4>Pull a model</h4>
                  <pre>ollama pull dolphin-mistral</pre>

                  <h4>Load a VRM</h4>
                  <p>
                    Paste any <code>.vrm</code> HTTPS URL into the General tab →
                    VRM Model URL field. Compatible with VRoid Hub models.
                  </p>

                  <h4>Bio-state channels</h4>
                  <table class="sp-table">
                    <thead>
                      <tr><th>Channel</th><th>Analogue</th><th>High value means…</th></tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in BIO_DOCS" :key="row.ch">
                        <td>{{ row.ch }}</td>
                        <td>{{ row.analogue }}</td>
                        <td>{{ row.high }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>

            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CURATED_MODELS } from '../types/index'
import { useSeolStore } from '../stores/seol'
import { useSettingsStore } from '../stores/settings'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const settings = useSettingsStore()
const seol = useSeolStore()

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'models',  label: 'Models' },
  { id: 'about',   label: 'About' },
] as const

type TabId = (typeof TABS)[number]['id']

const activeTab = ref<TabId>('general')

// ── Handlers ──────────────────────────────────────────────────────────────────

function close() {
  emit('update:modelValue', false)
}

function onReset() {
  seol.resetConversation()
  close()
}

// ── About tab data ────────────────────────────────────────────────────────────

const BIO_DOCS = [
  { ch: 'dopamine',   analogue: 'Reward / pleasure',  high: 'Joy, excitement, accomplishment' },
  { ch: 'serotonin',  analogue: 'Mood stabiliser',    high: 'Calm, balanced, content' },
  { ch: 'oxytocin',   analogue: 'Bonding / love',     high: 'Deep attachment, warmth' },
  { ch: 'cortisol',   analogue: 'Stress hormone',     high: 'Anxiety, unhappiness' },
  { ch: 'adrenaline', analogue: 'Fight-or-flight',    high: 'Fear, urgency, anger' },
  { ch: 'endorphin',  analogue: 'Pain relief/euphoria', high: 'Comfort, playfulness' },
]
</script>

<style scoped>
/* ── Backdrop ─────────────────────────────────────────────────────────────── */
.sp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 10, 0.72);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Modal ────────────────────────────────────────────────────────────────── */
.sp-modal {
  background: #0e0e1c;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  width: 540px;
  max-width: calc(100vw - 32px);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.70);
}

/* ── Header ───────────────────────────────────────────────────────────────── */
.sp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.sp-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #c8b8ff;
}

.sp-close {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.sp-close:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }

/* ── Tabs ─────────────────────────────────────────────────────────────────── */
.sp-tabs {
  display: flex;
  gap: 2px;
  padding: 10px 20px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.sp-tab {
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}
.sp-tab:hover { color: rgba(255, 255, 255, 0.80); }
.sp-tab.active { color: #c8b8ff; border-bottom-color: #c8b8ff; }

/* ── Body ─────────────────────────────────────────────────────────────────── */
.sp-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
}

/* ── General tab ──────────────────────────────────────────────────────────── */
.sp-section { display: flex; flex-direction: column; gap: 14px; }

.sp-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sp-field--row {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
}

.sp-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.50);
  font-weight: 500;
  letter-spacing: 0.03em;
}

.sp-sublabel {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.30);
}

.sp-input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 8px 12px;
  color: #e8e8f0;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.sp-input:focus { border-color: rgba(160, 130, 255, 0.55); }

.sp-check { accent-color: #a080ff; }

.sp-actions {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.sp-btn { padding: 8px 18px; border-radius: 8px; font-size: 13px; cursor: pointer; transition: background 0.15s; }
.sp-btn--danger {
  border: 1px solid rgba(255, 100, 100, 0.35);
  background: transparent;
  color: #ff8080;
}
.sp-btn--danger:hover { background: rgba(255, 100, 100, 0.12); }

/* ── Models tab ───────────────────────────────────────────────────────────── */
.sp-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.40);
  margin-bottom: 14px;
  line-height: 1.6;
}
.sp-hint code {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 11px;
}

.sp-model-list { display: flex; flex-direction: column; gap: 8px; }

.sp-model-card {
  width: 100%;
  text-align: left;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  position: relative;
}
.sp-model-card:hover { background: rgba(255, 255, 255, 0.07); border-color: rgba(255,255,255,0.15); }
.sp-model-card.selected { border-color: rgba(160, 130, 255, 0.55); background: rgba(160, 130, 255, 0.08); }

.mc-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 3px; }
.mc-name { font-size: 14px; font-weight: 600; color: #e8e0ff; }
.mc-size { font-size: 11px; color: rgba(255,255,255,0.35); }
.mc-tag  { font-size: 11px; font-family: monospace; color: rgba(255,255,255,0.45); margin-bottom: 4px; }
.mc-notes { font-size: 12px; color: rgba(255,255,255,0.55); }
.mc-active {
  position: absolute;
  top: 10px;
  right: 12px;
  font-size: 11px;
  color: #a080ff;
  font-weight: 600;
}

/* ── About tab ────────────────────────────────────────────────────────────── */
.sp-about { display: flex; flex-direction: column; gap: 14px; font-size: 13px; color: rgba(255,255,255,0.70); line-height: 1.65; }
.sp-about h3 { font-size: 16px; font-weight: 700; color: #c8b8ff; margin-bottom: 2px; }
.sp-about h4 { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }
.sp-about pre {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 12px;
  font-family: monospace;
  color: #b0f0b0;
  overflow-x: auto;
}
.sp-about code {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 12px;
}

.sp-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.sp-table th, .sp-table td { text-align: left; padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.07); }
.sp-table th { color: rgba(255,255,255,0.40); font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; }
.sp-table td:first-child { color: #c8b8ff; font-weight: 500; font-family: monospace; font-size: 12px; }

/* ── Transitions ──────────────────────────────────────────────────────────── */
.sp-fade-enter-active,
.sp-fade-leave-active { transition: opacity 0.20s ease; }
.sp-fade-enter-from,
.sp-fade-leave-to { opacity: 0; }

.sp-slide-enter-active,
.sp-slide-leave-active { transition: opacity 0.20s ease, transform 0.20s ease; }
.sp-slide-enter-from,
.sp-slide-leave-to { opacity: 0; transform: translateY(16px) scale(0.98); }
</style>
