import type { SimilarityLevel } from '../types.ts'

export type SimilarityOption = {
  level: SimilarityLevel
  label: string
  hotkey: string
}

/** Ordered strongest to weakest; index + 1 is the hotkey digit. */
export const SIMILARITY_OPTIONS: SimilarityOption[] = [
  { level: 'clear', label: 'Clearly', hotkey: '1' },
  { level: 'moderate', label: 'Moderately', hotkey: '2' },
  { level: 'weak', label: 'Weakly', hotkey: '3' },
  { level: 'none', label: 'Not at all', hotkey: '4' },
]
