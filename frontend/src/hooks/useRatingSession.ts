import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadJudgements, saveJudgements } from '../lib/storage.ts'
import type { Judgement, Pair, SimilarityLevel } from '../types.ts'

export type RatingSession = {
  /** Pair under the cursor, or null once every pair has been rated. */
  current: Pair | null
  /** Existing rating for the current pair, when revisiting one. */
  currentLevel: SimilarityLevel | null
  cursor: number
  /** Most recently rated pair, for the undo affordance. */
  previous: Pair | null
  judgements: Judgement[]
  levelByPairId: Map<string, SimilarityLevel>
  done: number
  total: number
  rate: (level: SimilarityLevel) => void
  undo: () => void
  reset: () => void
  goTo: (index: number) => void
  step: (delta: number) => void
}

type SessionState = {
  cursor: number
  /** Ordered oldest-rated first; each pair appears at most once. */
  judgements: Judgement[]
}

/**
 * First unrated pair at or after `from`, wrapping around, so rating never
 * strands the cursor on a gap left by jumping around the queue. Returns
 * `pairs.length` when everything is rated.
 */
function nextUnrated(pairs: Pair[], rated: Set<string>, from: number): number {
  for (let i = from; i < pairs.length; i++) {
    if (!rated.has(pairs[i].id)) return i
  }
  for (let i = 0; i < Math.min(from, pairs.length); i++) {
    if (!rated.has(pairs[i].id)) return i
  }
  return pairs.length
}

const ratedIds = (judgements: Judgement[]) =>
  new Set(judgements.map((judgement) => judgement.pairId))

export function useRatingSession(pairs: Pair[]): RatingSession {
  const [state, setState] = useState<SessionState>(() => {
    const judgements = loadJudgements(pairs)
    return { judgements, cursor: nextUnrated(pairs, ratedIds(judgements), 0) }
  })

  useEffect(() => {
    saveJudgements(state.judgements)
  }, [state.judgements])

  const rate = useCallback(
    (level: SimilarityLevel) => {
      setState((prev) => {
        const pair = pairs[prev.cursor]
        if (!pair) return prev
        // Re-rating moves the pair to the end of the log, so undo always steps
        // back through what the user actually did most recently.
        const judgements = [
          ...prev.judgements.filter((entry) => entry.pairId !== pair.id),
          { pairId: pair.id, level, ratedAt: new Date().toISOString() },
        ]
        return {
          judgements,
          cursor: nextUnrated(pairs, ratedIds(judgements), prev.cursor + 1),
        }
      })
    },
    [pairs],
  )

  const undo = useCallback(() => {
    setState((prev) => {
      const last = prev.judgements.at(-1)
      if (!last) return prev
      const index = pairs.findIndex((pair) => pair.id === last.pairId)
      return {
        judgements: prev.judgements.slice(0, -1),
        cursor: index === -1 ? prev.cursor : index,
      }
    })
  }, [pairs])

  const reset = useCallback(() => {
    setState({ judgements: [], cursor: 0 })
  }, [])

  const goTo = useCallback(
    (index: number) => {
      setState((prev) =>
        index >= 0 && index < pairs.length ? { ...prev, cursor: index } : prev,
      )
    },
    [pairs],
  )

  const step = useCallback(
    (delta: number) => {
      setState((prev) => {
        // The past-the-end slot is the completion screen, so it is only
        // reachable once nothing is left unrated.
        const limit =
          prev.judgements.length === pairs.length
            ? pairs.length
            : pairs.length - 1
        const next = Math.min(Math.max(prev.cursor + delta, 0), limit)
        return next === prev.cursor ? prev : { ...prev, cursor: next }
      })
    },
    [pairs],
  )

  const levelByPairId = useMemo(
    () =>
      new Map(
        state.judgements.map((judgement) => [judgement.pairId, judgement.level]),
      ),
    [state.judgements],
  )

  const current = pairs[state.cursor] ?? null
  const last = state.judgements.at(-1)

  return {
    current,
    currentLevel: current ? (levelByPairId.get(current.id) ?? null) : null,
    cursor: state.cursor,
    previous: last
      ? (pairs.find((pair) => pair.id === last.pairId) ?? null)
      : null,
    judgements: state.judgements,
    levelByPairId,
    done: state.judgements.length,
    total: pairs.length,
    rate,
    undo,
    reset,
    goTo,
    step,
  }
}
