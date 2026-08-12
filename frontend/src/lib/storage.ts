import { SIMILARITY_OPTIONS } from '../data/similarityLevels.ts'
import type { SimilarityLevel } from '../types.ts'

const PENDING_KEY = 'cxr-labeller.pending.v1'

const LEVELS = new Set<string>(SIMILARITY_OPTIONS.map((option) => option.level))

/**
 * Writes not yet accepted by the server, keyed by pair id. A null level is a
 * pending delete. The server is the source of truth for ratings; this is only
 * the outbound buffer that survives a reload or a flight-mode session.
 */
export type PendingWrites = Record<string, SimilarityLevel | null>

export function loadPending(): PendingWrites {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(PENDING_KEY)
  } catch {
    return {}
  }
  if (!raw) return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {}
  }

  const restored: PendingWrites = {}
  for (const [pairId, level] of Object.entries(parsed)) {
    if (level === null || (typeof level === 'string' && LEVELS.has(level))) {
      restored[pairId] = level as SimilarityLevel | null
    }
  }
  return restored
}

export function savePending(pending: PendingWrites): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending))
  } catch {
    // Storage full or blocked; writes still flush from memory.
  }
}
