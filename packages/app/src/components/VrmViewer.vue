<template>
  <div class="vrm-wrapper">
    <canvas ref="canvasRef" class="vrm-canvas" />
    <div v-if="!props.modelUrl" class="vrm-placeholder">
      <p>🎭</p>
      <p>No VRM loaded</p>
      <p class="hint">Paste a VRM URL in Settings</p>
    </div>
    <div v-if="loadError" class="vrm-error">⚠ {{ loadError }}</div>
    <div v-if="isLoading" class="vrm-loading">Loading model…</div>
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

.vrm-placeholder,
.vrm-error,
.vrm-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  pointer-events: none;
  color: rgba(232,232,240,0.45);
  font-size: 14px;
  text-align: center;
}

.vrm-placeholder p:first-child { font-size: 48px; }
.vrm-placeholder .hint { font-size: 12px; opacity: 0.55; }

.vrm-error {
  color: #ff6b6b;
  padding: 16px;
}
</style>
