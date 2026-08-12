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
 * Restores judgements for pairs still present in the queue, keeping the stored
 * order (oldest rating first) so undo pops the most recent one. Entries for
 * pairs the queue no longer contains, and duplicates, are dropped.
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

  const queued = new Set(pairs.map((pair) => pair.id))
  const seen = new Set<string>()
  const restored: Judgement[] = []

  for (const entry of parsed) {
    if (!isJudgement(entry)) continue
    if (!queued.has(entry.pairId) || seen.has(entry.pairId)) continue
    seen.add(entry.pairId)
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
