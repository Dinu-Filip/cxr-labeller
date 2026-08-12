import { useCallback, useMemo, useState } from 'react'
import type { Judgement, Pair, SimilarityLevel } from '../types.ts'

export type RatingSession = {
  /** Pair under the cursor, or null once every pair has been rated. */
  current: Pair | null
  /** Existing rating for the current pair, when revisiting one. */
  currentLevel: SimilarityLevel | null
  cursor: number
  judgements: Judgement[]
  levelByPairId: Map<string, SimilarityLevel>
  done: number
  total: number
  canStepBack: boolean
  canStepForward: boolean
  rate: (level: SimilarityLevel) => void
  /** Drops the rating on the pair under the cursor, leaving the cursor put. */
  clearCurrent: () => void
  goTo: (index: number) => void
  /** Jumps to the first unrated pair, wherever the cursor happens to be. */
  goToFrontier: () => void
  step: (delta: number) => void
}

type SessionState = {
  cursor: number
  /** Each pair appears at most once, in the order it was first rated. */
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

/**
 * Highest cursor `step` will move to. The past-the-end slot is the completion
 * screen, so it only opens up once nothing is left unrated.
 */
function stepLimit(judgementCount: number, total: number): number {
  return judgementCount === total ? total : total - 1
}

const ratedIds = (judgements: Judgement[]) =>
  new Set(judgements.map((judgement) => judgement.pairId))

export function useRatingSession(
  pairs: Pair[],
  initialJudgements: Judgement[],
): RatingSession {
  const [state, setState] = useState<SessionState>(() => ({
    judgements: initialJudgements,
    cursor: nextUnrated(pairs, ratedIds(initialJudgements), 0),
  }))

  const rate = useCallback(
    (level: SimilarityLevel) => {
      setState((prev) => {
        const pair = pairs[prev.cursor]
        if (!pair) return prev
        const judgement = {
          pairId: pair.id,
          level,
          ratedAt: new Date().toISOString(),
        }
        const rerating = prev.judgements.some(
          (entry) => entry.pairId === pair.id,
        )
        const judgements = rerating
          ? prev.judgements.map((entry) =>
              entry.pairId === pair.id ? judgement : entry,
            )
          : [...prev.judgements, judgement]
        return {
          judgements,
          cursor: nextUnrated(pairs, ratedIds(judgements), prev.cursor + 1),
        }
      })
    },
    [pairs],
  )

  const clearCurrent = useCallback(() => {
    setState((prev) => {
      const pair = pairs[prev.cursor]
      if (!pair) return prev
      const judgements = prev.judgements.filter(
        (entry) => entry.pairId !== pair.id,
      )
      if (judgements.length === prev.judgements.length) return prev
      return { ...prev, judgements }
    })
  }, [pairs])

  const goTo = useCallback(
    (index: number) => {
      setState((prev) =>
        index >= 0 && index < pairs.length ? { ...prev, cursor: index } : prev,
      )
    },
    [pairs],
  )

  const goToFrontier = useCallback(() => {
    setState((prev) => ({
      ...prev,
      cursor: nextUnrated(pairs, ratedIds(prev.judgements), 0),
    }))
  }, [pairs])

  const step = useCallback(
    (delta: number) => {
      setState((prev) => {
        const limit = stepLimit(prev.judgements.length, pairs.length)
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

  return {
    current,
    currentLevel: current ? (levelByPairId.get(current.id) ?? null) : null,
    cursor: state.cursor,
    judgements: state.judgements,
    levelByPairId,
    done: state.judgements.length,
    total: pairs.length,
    canStepBack: state.cursor > 0,
    canStepForward:
      state.cursor < stepLimit(state.judgements.length, pairs.length),
    rate,
    clearCurrent,
    goTo,
    goToFrontier,
    step,
  }
}
