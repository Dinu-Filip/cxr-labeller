import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ProgressTrack } from './components/ProgressTrack.tsx'
import { RatingArena } from './components/RatingArena.tsx'
import { SessionComplete } from './components/SessionComplete.tsx'
import { SimilarityScale } from './components/SimilarityScale.tsx'
import { UndoButton } from './components/UndoButton.tsx'
import { MOCK_PAIRS } from './data/mockPairs.ts'
import { SIMILARITY_OPTIONS } from './data/similarityLevels.ts'
import { useHotkeys } from './hooks/useHotkeys.ts'
import { useRatingSession } from './hooks/useRatingSession.ts'
import { prefersReducedMotion } from './lib/motion.ts'
import type { SimilarityLevel } from './types.ts'
import styles from './App.module.css'

/** Time the picked option stays lit and the cards play out before advancing. */
const COMMIT_MS = 200

function App() {
  const session = useRatingSession(MOCK_PAIRS)
  // Non-null while a rating is animating out; also locks input so a fast
  // double-tap cannot rate two pairs with one intent.
  const [committing, setCommitting] = useState<SimilarityLevel | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  const { current, rate, undo, goTo } = session

  const handleSelect = useCallback(
    (level: SimilarityLevel) => {
      if (timer.current !== null || !current) return
      setCommitting(level)
      timer.current = window.setTimeout(
        () => {
          timer.current = null
          setCommitting(null)
          rate(level)
        },
        prefersReducedMotion() ? 0 : COMMIT_MS,
      )
    },
    [current, rate],
  )

  const handleUndo = useCallback(() => {
    if (timer.current !== null) return
    undo()
  }, [undo])

  const handleJump = useCallback(
    (index: number) => {
      if (timer.current !== null) return
      goTo(index)
    },
    [goTo],
  )

  const hotkeys = useMemo(() => {
    const bindings: Record<string, () => void> = { Backspace: handleUndo }
    for (const option of SIMILARITY_OPTIONS) {
      bindings[option.hotkey] = () => handleSelect(option.level)
    }
    return bindings
  }, [handleSelect, handleUndo])

  useHotkeys(hotkeys)

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <p className={styles.wordmark}>cxr-labeller</p>
        <div className={styles.progress}>
          <ProgressTrack
            pairs={MOCK_PAIRS}
            levelByPairId={session.levelByPairId}
            cursor={session.cursor}
            disabled={committing !== null}
            onSelect={handleJump}
          />
        </div>
        <p className={styles.session} aria-live="polite">
          {session.done} / {session.total}
        </p>
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
            <UndoButton
              previous={session.previous}
              disabled={committing !== null}
              onUndo={handleUndo}
            />
          </>
        ) : (
          <SessionComplete
            judgements={session.judgements}
            onReset={session.reset}
          />
        )}
      </main>
    </div>
  )
}

export default App
