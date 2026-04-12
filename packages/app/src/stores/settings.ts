import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', () => {
  const ollamaUrl   = useLocalStorage('seol/ollamaUrl',   'http://localhost:11434')
  const ollamaModel = useLocalStorage('seol/ollamaModel', 'mistral')
  const vrmUrl      = useLocalStorage('seol/vrmUrl',      '')
  const showBioHud  = useLocalStorage('seol/showBioHud',  true)

  return { ollamaUrl, ollamaModel, vrmUrl, showBioHud }
})
