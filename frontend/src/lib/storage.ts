import { SIMILARITY_OPTIONS } from '../data/similarityLevels.ts'
import type { Judgement, Pair } from '../types.ts'

const STORAGE_KEY = 'cxr-labeller.session.v1'

const LEVELS = new Set<string>(SIMILARITY_OPTIONS.map((option) => option.level))

function isJudgement(value: unknown): value is Judgement {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.pairId === 'string' &&
    typeof entry.ratedAt === 'string' &&
    typeof entry.level === 'string' &&
    LEVELS.has(entry.level)
  )
}

/**
 * Restores the judgements that still line up with the current queue, stopping at
 * the first entry that does not — a reordered or regenerated queue keeps only
 * the prefix it agrees with rather than silently misattributing ratings.
 */
export function loadJudgements(pairs: Pair[]): Judgement[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return []
  }
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const restored: Judgement[] = []
  for (const [index, entry] of parsed.entries()) {
    const pair = pairs[index]
    if (!pair || !isJudgement(entry) || entry.pairId !== pair.id) break
    restored.push(entry)
  }
  return restored
}

export function saveJudgements(judgements: Judgement[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(judgements))
  } catch {
    // Storage full or blocked; the session still works in memory.
  }
}
