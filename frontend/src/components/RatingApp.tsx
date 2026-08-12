import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ApiClient, Reviewer } from '../api/client.ts'
import { SIMILARITY_OPTIONS } from '../data/similarityLevels.ts'
import { useHotkeys } from '../hooks/useHotkeys.ts'
import { useRatingSession } from '../hooks/useRatingSession.ts'
import { useSyncQueue } from '../hooks/useSyncQueue.ts'
import { prefersReducedMotion } from '../lib/motion.ts'
import type { Judgement, Pair, SimilarityLevel } from '../types.ts'
import { ClearButton } from './ClearButton.tsx'
import { ProgressTrack } from './ProgressTrack.tsx'
import { RatingArena } from './RatingArena.tsx'
import { SessionComplete } from './SessionComplete.tsx'
import { SimilarityScale } from './SimilarityScale.tsx'
import { SyncIndicator } from './SyncIndicator.tsx'
import styles from '../App.module.css'

/** Time the picked option stays lit and the cards play out before advancing. */
const COMMIT_MS = 200

type Props = {
  client: ApiClient
  reviewer: Reviewer
  pairs: Pair[]
  judgements: Judgement[]
  onUnauthorized: () => void
}

export function RatingApp({
  client,
  reviewer,
  pairs,
  judgements,
  onUnauthorized,
}: Props) {
  const session = useRatingSession(pairs, judgements)
  const sync = useSyncQueue(client, onUnauthorized)
  // Non-null while a rating is animating out; also locks input so a fast
  // double-tap cannot rate two pairs with one intent.
  const [committing, setCommitting] = useState<SimilarityLevel | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  const { current, rate, clearCurrent, step } = session
  const { enqueue } = sync

  const handleSelect = useCallback(
    (level: SimilarityLevel) => {
      if (timer.current !== null || !current) return
      const pairId = current.id
      setCommitting(level)
      timer.current = window.setTimeout(
        () => {
          timer.current = null
          setCommitting(null)
          rate(level)
          enqueue(pairId, level)
        },
        prefersReducedMotion() ? 0 : COMMIT_MS,
      )
    },
    [current, enqueue, rate],
  )

  const handleClear = useCallback(() => {
    if (timer.current !== null || !current) return
    if (session.currentLevel === null) return
    clearCurrent()
    enqueue(current.id, null)
  }, [clearCurrent, current, enqueue, session.currentLevel])

  const handleStep = useCallback(
    (delta: number) => {
      if (timer.current !== null) return
      step(delta)
    },
    [step],
  )

  const hotkeys = useMemo(() => {
    const bindings: Record<string, () => void> = {
      Backspace: handleClear,
      ArrowLeft: () => handleStep(-1),
      ArrowRight: () => handleStep(1),
    }
    for (const option of SIMILARITY_OPTIONS) {
      bindings[option.hotkey] = () => handleSelect(option.level)
    }
    return bindings
  }, [handleClear, handleSelect, handleStep])

  useHotkeys(hotkeys)

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <p className={styles.wordmark}>{reviewer.name}</p>
        <div className={styles.progress}>
          <ProgressTrack done={session.done} total={session.total} />
        </div>
        <p className={styles.session} aria-live="polite">
          {session.done} / {session.total}
        </p>
        <SyncIndicator status={sync.status} pendingCount={sync.pendingCount} />
      </header>

      <main className={styles.main}>
        {current ? (
          <>
            <RatingArena
              key={current.id}
              pair={current}
              exiting={committing !== null}
            />
            <SimilarityScale
              selected={committing ?? session.currentLevel}
              disabled={committing !== null}
              onSelect={handleSelect}
            />
            <ClearButton
              hasRating={session.currentLevel !== null}
              disabled={committing !== null}
              onClear={handleClear}
            />
          </>
        ) : (
          <SessionComplete judgements={session.judgements} onReset={null} />
        )}
      </main>
    </div>
  )
}
