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
      primitives: Primitive[]
      /** Heatmap reading order: the lower triangle, row by row. */
      pairs: Pair[]
      /** The server's coverage-first, per-reviewer order. */
      shuffledPairs: Pair[]
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
 * Every combination in the order the heatmap reads: down the rows of the lower
 * triangle, left to right. Rating in this order walks the matrix visibly rather
 * than hopping around it.
 */
function matrixOrder(primitives: Primitive[]): Pair[] {
  const sorted = [...primitives].sort((a, b) => a.id - b.id)
  const pairs: Pair[] = []
  for (let row = 1; row < sorted.length; row++) {
    for (let column = 0; column < row; column++) {
      const a = sorted[column]
      const b = sorted[row]
      pairs.push({ id: `${a.id}-${b.id}`, a, b })
    }
  }
  return pairs
}

/**
 * Loads the session from the server, as the complete C(n,2) matrix in three
 * bands: pairs already rated, then the server's unrated queue in its
 * coverage-first order, then any combination neither covered.
 *
 * The third band makes completeness structural rather than dependent on the
 * /pairs limit — the menu heatmap needs every cell to resolve to a loaded pair.
 * It is normally empty; entries only appear if /pairs was truncated, and those
 * fall back to plain id order.
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
        for (const pair of matrixOrder(primitives)) {
          if (!seen.has(pair.id)) {
            seen.add(pair.id)
            pairs.push(pair)
          }
        }

        // `pairs` above is the server's ordering; the matrix ordering reuses the
        // same Pair objects so either list works with the same lookups.
        const byPairId = new Map(pairs.map((pair) => [pair.id, pair]))
        const ordered = matrixOrder(primitives).map(
          (pair) => byPairId.get(pair.id) ?? pair,
        )

        setState({
          status: 'ready',
          reviewer,
          primitives,
          pairs: ordered,
          shuffledPairs: pairs,
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
