<template>
  <div class="vrm-wrapper">
    <canvas ref="canvasRef" class="vrm-canvas" />

    <!-- Beautiful placeholder when no model is loaded -->
    <Transition name="ph-fade">
      <div v-if="!props.modelUrl" class="vrm-placeholder">
        <div class="ph-orb" />
        <div class="ph-rings">
          <div class="ph-ring ph-ring--1" />
          <div class="ph-ring ph-ring--2" />
          <div class="ph-ring ph-ring--3" />
        </div>
        <div class="ph-content">
          <span class="ph-icon">🎭</span>
          <p class="ph-title">No character loaded</p>
          <p class="ph-hint">Paste a VRM URL in ⚙ Settings to bring SEOL to life</p>
        </div>
      </div>
    </Transition>

    <Transition name="ph-fade">
      <div v-if="loadError" class="vrm-error">
        <span class="err-icon">⚠</span>
        <span>{{ loadError }}</span>
      </div>
    </Transition>

    <Transition name="ph-fade">
      <div v-if="isLoading" class="vrm-loading">
        <div class="loading-spinner" />
        <span>Loading model…</span>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { useVrmEmote } from '../composables/useVrmEmote'
import { useSeolStore } from '../stores/seol'

// ── Props ─────────────────────────────────────────────────────────────────────

const props = defineProps<{ modelUrl: string }>()

// ── Internal state ────────────────────────────────────────────────────────────

const canvasRef = ref<HTMLCanvasElement>()
const isLoading = ref(false)
const loadError = ref<string | null>(null)

const seol = useSeolStore()

// Three.js objects (held outside Vue reactivity for perf)
let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let clock: THREE.Clock
let rafId = 0

let currentVrm: VRM | null = null
let emote: ReturnType<typeof useVrmEmote> | null = null

// Singleton GLTF loader (shared across loads)
let loader: GLTFLoader | null = null
function getLoader() {
  if (!loader) {
    loader = new GLTFLoader()
    loader.crossOrigin = 'anonymous'
    loader.register(parser => new VRMLoaderPlugin(parser))
  }
  return loader
}

// ── Three.js initialisation ───────────────────────────────────────────────────

function initRenderer(canvas: HTMLCanvasElement) {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor(0x000000, 0)       // transparent background

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(35, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
  camera.position.set(0, 1.30, 1.60)
  camera.lookAt(new THREE.Vector3(0, 1.20, 0))

  // Lighting — mirrors AiRI's default setup
  const ambient = new THREE.AmbientLight(0xffffff, 0.60)
  scene.add(ambient)

  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.40)
  scene.add(hemi)

  const dir = new THREE.DirectionalLight(0xfffbf5, 2.02)
  dir.position.set(0, 2, -1)
  dir.target.position.set(0, 1.2, 0)
  scene.add(dir)
  scene.add(dir.target)

  clock = new THREE.Clock()

  // Resize observer — keeps canvas pixel-perfect
  const ro = new ResizeObserver(() => resizeToContainer(canvas))
  ro.observe(canvas.parentElement ?? canvas)

  function loop() {
    rafId = requestAnimationFrame(loop)
    const delta = clock.getDelta()
    if (currentVrm) currentVrm.update(delta)
    emote?.update(delta)
    renderer.render(scene, camera)
  }
  loop()
}

function resizeToContainer(canvas: HTMLCanvasElement) {
  const parent = canvas.parentElement
  if (!parent) return
  const w = parent.clientWidth
  const h = parent.clientHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

// ── VRM loading ───────────────────────────────────────────────────────────────

async function loadVRM(url: string) {
  if (!url) return
  isLoading.value = true
  loadError.value = null

  try {
    const gltf = await getLoader().loadAsync(url)
    const vrm = gltf.userData.vrm as VRM

    // Unload previous model
    if (currentVrm) {
      scene.remove(currentVrm.scene)
      // Manually dispose all geometries and materials in the VRM scene graph
      currentVrm.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh
          mesh.geometry?.dispose()
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach(m => m?.dispose())
        }
      })
      currentVrm = null
      emote?.dispose()
      emote = null
    }

    // VRM1 models face +Z by default; rotate to face camera (-Z)
    vrm.scene.rotation.y = Math.PI

    scene.add(vrm.scene)
    currentVrm = vrm
    emote = useVrmEmote(vrm)

    // Apply initial emotion from store
    emote.setEmotion(seol.currentEmotion, seol.emotionIntensity)
  }
  catch (err) {
    loadError.value = err instanceof Error ? err.message : String(err)
    console.error('[VrmViewer] load failed:', err)
  }
  finally {
    isLoading.value = false
  }
}

// ── Reactivity ────────────────────────────────────────────────────────────────

// Re-drive expressions whenever the bio-state emotion changes
watch(
  () => [seol.currentEmotion, seol.emotionIntensity] as const,
  ([emotion, intensity]) => {
    emote?.setEmotion(emotion, intensity)
  },
)

// Reload when the URL prop changes
watch(() => props.modelUrl, url => loadVRM(url))

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  if (canvasRef.value) {
    initRenderer(canvasRef.value)
    if (props.modelUrl) loadVRM(props.modelUrl)
  }
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  emote?.dispose()
  if (currentVrm) {
    scene.remove(currentVrm.scene)
    currentVrm.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        mesh.geometry?.dispose()
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach(m => m?.dispose())
      }
    })
  }
  renderer?.dispose()
})
</script>

<style scoped>
.vrm-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.vrm-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* ── Placeholder ────────────────────────────────────────────────────────────── */
.vrm-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at 50% 60%, rgba(80, 40, 140, 0.18) 0%, transparent 65%),
              radial-gradient(ellipse at 30% 30%, rgba(40, 60, 160, 0.12) 0%, transparent 55%),
              #07070f;
  pointer-events: none;
}

/* Glowing central orb */
.ph-orb {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(120, 70, 220, 0.28) 0%, rgba(80, 40, 160, 0.14) 45%, transparent 70%);
  animation: orb-pulse 4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes orb-pulse {
  0%, 100% { transform: scale(1);   opacity: 0.7; }
  50%       { transform: scale(1.2); opacity: 1;   }
}

/* Concentric rotating rings */
.ph-rings {
  position: absolute;
  width: 260px;
  height: 260px;
  pointer-events: none;
}

.ph-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid transparent;
}

.ph-ring--1 {
  border-color: rgba(160, 100, 255, 0.22);
  animation: ring-spin 9s linear infinite;
  background: conic-gradient(from 0deg, transparent 60%, rgba(160,100,255,0.18) 100%);
}

.ph-ring--2 {
  inset: 20px;
  border-color: rgba(100, 140, 255, 0.18);
  animation: ring-spin 14s linear infinite reverse;
  background: conic-gradient(from 120deg, transparent 60%, rgba(100,140,255,0.14) 100%);
}

.ph-ring--3 {
  inset: 40px;
  border-color: rgba(200, 160, 255, 0.14);
  animation: ring-spin 20s linear infinite;
}

@keyframes ring-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* Text content above the orb */
.ph-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  padding: 20px;
}

.ph-icon {
  font-size: 52px;
  filter: drop-shadow(0 0 18px rgba(160, 100, 255, 0.55));
  animation: icon-float 3s ease-in-out infinite;
}

@keyframes icon-float {
  0%, 100% { transform: translateY(0);    }
  50%       { transform: translateY(-8px); }
}

.ph-title {
  font-size: 17px;
  font-weight: 600;
  color: rgba(220, 200, 255, 0.80);
  letter-spacing: 0.03em;
  margin: 0;
}

.ph-hint {
  font-size: 12px;
  color: rgba(180, 170, 210, 0.42);
  max-width: 220px;
  line-height: 1.6;
  margin: 0;
}

/* ── Error ──────────────────────────────────────────────────────────────────── */
.vrm-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  text-align: center;
  background: rgba(20, 5, 5, 0.60);
  backdrop-filter: blur(4px);
}

.err-icon {
  font-size: 28px;
  color: #ff7070;
}

.vrm-error span:last-child {
  font-size: 13px;
  color: #ff9090;
  max-width: 280px;
  line-height: 1.6;
}

/* ── Loading ────────────────────────────────────────────────────────────────── */
.vrm-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: rgba(7, 7, 15, 0.70);
  backdrop-filter: blur(4px);
  font-size: 13px;
  color: rgba(200, 185, 255, 0.75);
  letter-spacing: 0.04em;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid rgba(160, 100, 255, 0.20);
  border-top-color: rgba(160, 100, 255, 0.80);
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Transitions ────────────────────────────────────────────────────────────── */
.ph-fade-enter-active,
.ph-fade-leave-active { transition: opacity 0.35s ease; }
.ph-fade-enter-from,
.ph-fade-leave-to     { opacity: 0; }
</style>
