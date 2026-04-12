/**
 * SEOL — Centralized TypeScript types.
 *
 * Import shared interfaces from here instead of directly from individual
 * composables. Composables and stores still own their runtime logic; this file
 * is the single source of truth for cross-cutting type definitions.
 */

// ── Bio-engine types (re-exported from composable) ───────────────────────────
export type {
  BioChannel,
  BioState,
  Command,
  SEOLMode,
  VRMEmotion,
} from '../composables/useBioState'

// ── Ollama client types ──────────────────────────────────────────────────────
export type { ChatMessage } from '../composables/useOllama'

// ── Model browser types ──────────────────────────────────────────────────────

/** A curated Ollama model entry shown in the model browser. */
export interface OllamaModelEntry {
  tag: string
  displayName: string
  sizeLabel: string
  notes: string
}

/**
 * Curated list of recommended uncensored local Ollama models.
 * Source: agents.md §6.
 */
export const CURATED_MODELS: OllamaModelEntry[] = [
  {
    tag: 'dolphin-mistral',
    displayName: 'Dolphin Mistral',
    sizeLabel: '~4.1 GB',
    notes: 'Best overall; fast, uncensored',
  },
  {
    tag: 'dolphin-llama3',
    displayName: 'Dolphin Llama 3',
    sizeLabel: '~4.7 GB',
    notes: 'Llama 3 uncensored; strong reasoning',
  },
  {
    tag: 'llama2-uncensored',
    displayName: 'Llama 2 Uncensored',
    sizeLabel: '~3.8 GB',
    notes: 'Original, widely used',
  },
  {
    tag: 'wizard-vicuna-uncensored',
    displayName: 'Wizard Vicuna Uncensored',
    sizeLabel: '~3.8 GB',
    notes: '7B/13B/30B variants',
  },
  {
    tag: 'wizardlm-uncensored',
    displayName: 'WizardLM Uncensored',
    sizeLabel: '~7.4 GB',
    notes: 'Complex instruction-following',
  },
  {
    tag: 'dolphin-phi',
    displayName: 'Dolphin Phi',
    sizeLabel: '~1.6 GB',
    notes: 'Smallest; great for low-end hardware',
  },
]
