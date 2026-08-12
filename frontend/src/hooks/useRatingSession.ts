import { useCallback, useEffect, useState } from 'react'
import { loadJudgements, saveJudgements } from '../lib/storage.ts'
import type { Judgement, Pair, SimilarityLevel } from '../types.ts'

export type RatingSession = {
  /** Pair awaiting a rating, or null once the queue is exhausted. */
  current: Pair | null
  /** Pair behind the cursor, for the undo affordance. */
  previous: Pair | null
  judgements: Judgement[]
  done: number
  total: number
  isComplete: boolean
  rate: (level: SimilarityLevel) => void
  undo: () => void
  reset: () => void
}

export function useRatingSession(pairs: Pair[]): RatingSession {
  const [judgements, setJudgements] = useState<Judgement[]>(() =>
    loadJudgements(pairs),
  )

  useEffect(() => {
    saveJudgements(judgements)
  }, [judgements])

  // The cursor is derived from the judgement count, so undo is just a pop.
  const done = judgements.length

  const rate = useCallback(
    (level: SimilarityLevel) => {
      setJudgements((prev) => {
        const pair = pairs[prev.length]
        if (!pair) return prev
        return [
          ...prev,
          { pairId: pair.id, level, ratedAt: new Date().toISOString() },
        ]
      })
    },
    [pairs],
  )

  const undo = useCallback(() => {
    setJudgements((prev) => prev.slice(0, -1))
  }, [])

  const reset = useCallback(() => {
    setJudgements([])
  }, [])

  return {
    current: pairs[done] ?? null,
    previous: done > 0 ? (pairs[done - 1] ?? null) : null,
    judgements,
    done,
    total: pairs.length,
    isComplete: done >= pairs.length,
    rate,
    undo,
    reset,
  }
}
