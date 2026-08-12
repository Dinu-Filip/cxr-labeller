import type { Reviewer } from '../api/client.ts'
import type { RatingSession } from '../hooks/useRatingSession.ts'
import type { SyncQueue } from '../hooks/useSyncQueue.ts'
import type { Primitive } from '../types.ts'
import { Doughnut } from './Doughnut.tsx'
import { Heatmap } from './Heatmap.tsx'
import { SyncIndicator } from './SyncIndicator.tsx'
import { Toggle } from './Toggle.tsx'
import styles from './Menu.module.css'

type Props = {
  reviewer: Reviewer
  primitives: Primitive[]
  session: RatingSession
  sync: SyncQueue
  indexByPairId: Map<string, number>
  shuffle: boolean
  onShuffleChange: (shuffle: boolean) => void
  onStart: () => void
  onSelectPair: (index: number) => void
}

export function Menu({
  reviewer,
  primitives,
  session,
  sync,
  indexByPairId,
  shuffle,
  onShuffleChange,
  onStart,
  onSelectPair,
}: Props) {
  const { done, total } = session
  const remaining = Math.max(total - done, 0)
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  const startLabel =
    done === 0 ? 'Start rating' : remaining === 0 ? 'Review ratings' : 'Continue rating'

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.wordmark}>{reviewer.name}</p>
        <SyncIndicator status={sync.status} pendingCount={sync.pendingCount} />
      </header>

      <main className={styles.main}>
        <section className={styles.summary}>
          <Doughnut done={done} total={total} size={72} />
          <div className={styles.stat}>
            <p className={styles.statValue}>
              {done} of {total} pairs rated
            </p>
            <p className={styles.statNote}>
              {remaining === 0
                ? 'Every pair has a rating.'
                : `${percent}% complete — ${remaining} to go.`}
            </p>
          </div>
          <button type="button" className={styles.start} onClick={onStart}>
            {startLabel} →
          </button>

          <div className={styles.controls}>
            <Toggle
              checked={shuffle}
              label={shuffle ? 'Shuffle on' : 'Shuffle off'}
              onChange={onShuffleChange}
            />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Your ratings</h2>
          <p className={styles.sectionHint}>
            Every primitive pair. Select one to go straight to it.
          </p>
          <Heatmap
            primitives={primitives}
            levelByPairId={session.levelByPairId}
            indexByPairId={indexByPairId}
            onSelect={onSelectPair}
          />
        </section>
      </main>
    </div>
  )
}
