import { useCallback, useMemo, useState } from 'react'
import type { ApiClient, Reviewer } from '../api/client.ts'
import { useRatingSession } from '../hooks/useRatingSession.ts'
import { useSyncQueue } from '../hooks/useSyncQueue.ts'
import type { Judgement, Pair, Primitive } from '../types.ts'
import { Menu } from './Menu.tsx'
import { RatingApp } from './RatingApp.tsx'

type Props = {
  client: ApiClient
  reviewer: Reviewer
  primitives: Primitive[]
  pairs: Pair[]
  judgements: Judgement[]
  onUnauthorized: () => void
}

type View = 'menu' | 'rating'

/**
 * Owns the session so it survives moving between the menu and the rating view —
 * the menu has to reflect ratings made moments earlier without refetching.
 */
export function Workspace({
  client,
  reviewer,
  primitives,
  pairs,
  judgements,
  onUnauthorized,
}: Props) {
  const session = useRatingSession(pairs, judgements)
  const sync = useSyncQueue(client, onUnauthorized)
  const [view, setView] = useState<View>('menu')

  const indexByPairId = useMemo(
    () => new Map(pairs.map((pair, index) => [pair.id, index])),
    [pairs],
  )

  const { goTo, goToFrontier } = session

  const handleStart = useCallback(() => {
    goToFrontier()
    setView('rating')
  }, [goToFrontier])

  const handleSelectPair = useCallback(
    (index: number) => {
      goTo(index)
      setView('rating')
    },
    [goTo],
  )

  if (view === 'menu') {
    return (
      <Menu
        reviewer={reviewer}
        primitives={primitives}
        session={session}
        sync={sync}
        indexByPairId={indexByPairId}
        onStart={handleStart}
        onSelectPair={handleSelectPair}
      />
    )
  }

  return (
    <RatingApp
      reviewer={reviewer}
      pairs={pairs}
      session={session}
      sync={sync}
      onExit={() => setView('menu')}
    />
  )
}
