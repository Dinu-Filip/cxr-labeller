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

/** Every unordered combination, canonically ordered, in stable id order. */
function allCombinations(primitives: Primitive[]): Pair[] {
  const sorted = [...primitives].sort((a, b) => a.id - b.id)
  const pairs: Pair[] = []
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      pairs.push({ id: `${sorted[i].id}-${sorted[j].id}`, a: sorted[i], b: sorted[j] })
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
        for (const pair of allCombinations(primitives)) {
          if (!seen.has(pair.id)) {
            seen.add(pair.id)
            pairs.push(pair)
          }
        }

        setState({
          status: 'ready',
          reviewer,
          primitives,
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
