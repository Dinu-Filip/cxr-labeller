import { useEffect, useState } from 'react'
import type { ApiClient, Reviewer } from '../api/client.ts'
import { UnauthorizedError } from '../api/client.ts'
import type { Judgement, Pair, Primitive } from '../types.ts'

export type Bootstrap =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      reviewer: Reviewer
      pairs: Pair[]
      judgements: Judgement[]
    }

function pairFromId(
  pairId: string,
  byId: Map<number, Primitive>,
): Pair | null {
  const [rawA, rawB] = pairId.split('-')
  const a = byId.get(Number(rawA))
  const b = byId.get(Number(rawB))
  return a && b ? { id: pairId, a, b } : null
}

/**
 * Loads the session from the server. Already-rated pairs are reconstructed from
 * the primitive list and placed ahead of the unrated queue, so the progress
 * track shows a reviewer's whole history and they can navigate back into it —
 * /pairs alone only returns what is still outstanding.
 */
export function useBootstrap(
  client: ApiClient,
  onUnauthorized: () => void,
): Bootstrap {
  const [state, setState] = useState<Bootstrap>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const [reviewer, primitives, queue, ratings] = await Promise.all([
          client.me(),
          client.primitives(),
          client.pairs(),
          client.ratings(),
        ])
        if (cancelled) return

        const byId = new Map(primitives.map((primitive) => [primitive.id, primitive]))
        const seen = new Set<string>()
        const pairs: Pair[] = []

        for (const judgement of ratings) {
          const pair = pairFromId(judgement.pairId, byId)
          if (pair && !seen.has(pair.id)) {
            seen.add(pair.id)
            pairs.push(pair)
          }
        }
        for (const pair of queue) {
          if (!seen.has(pair.id)) {
            seen.add(pair.id)
            pairs.push(pair)
          }
        }

        setState({
          status: 'ready',
          reviewer,
          pairs,
          judgements: ratings.filter((judgement) => seen.has(judgement.pairId)),
        })
      } catch (error) {
        if (cancelled) return
        if (error instanceof UnauthorizedError) {
          onUnauthorized()
          return
        }
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'could not reach the server',
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [client, onUnauthorized])

  return state
}
