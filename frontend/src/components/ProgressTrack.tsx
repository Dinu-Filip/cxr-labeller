import { SIMILARITY_OPTIONS } from '../data/similarityLevels.ts'
import type { Pair, SimilarityLevel } from '../types.ts'
import styles from './ProgressTrack.module.css'

type Props = {
  pairs: Pair[]
  levelByPairId: Map<string, SimilarityLevel>
  cursor: number
  disabled: boolean
  onSelect: (index: number) => void
}

/** Beyond this many pairs, segments get too thin to be a usable hit target. */
const MAX_SEGMENTS = 40

const LABELS = new Map(
  SIMILARITY_OPTIONS.map((option) => [option.level, option.label]),
)

export function ProgressTrack({
  pairs,
  levelByPairId,
  cursor,
  disabled,
  onSelect,
}: Props) {
  const done = levelByPairId.size
  const label = `${done} of ${pairs.length} pairs rated`

  if (pairs.length > MAX_SEGMENTS) {
    const percent = pairs.length === 0 ? 0 : (done / pairs.length) * 100
    return (
      <div className={styles.bar} role="img" aria-label={label}>
        <div className={styles.barFill} style={{ width: `${percent}%` }} />
      </div>
    )
  }

  return (
    <div className={styles.track} role="group" aria-label="Jump to pair">
      {pairs.map((pair, index) => {
        const level = levelByPairId.get(pair.id)
        const status = level
          ? `rated ${LABELS.get(level)?.toLowerCase()}`
          : 'not yet rated'
        return (
          <button
            key={pair.id}
            type="button"
            className={`${styles.segment} ${level ? `${styles.rated} ${styles[level]}` : ''} ${
              index === cursor ? styles.current : ''
            }`}
            aria-label={`Pair ${index + 1}, ${pair.a.name} versus ${pair.b.name}, ${status}`}
            aria-current={index === cursor ? 'true' : undefined}
            disabled={disabled}
            onClick={() => onSelect(index)}
          >
            <span className={styles.fill} />
          </button>
        )
      })}
    </div>
  )
}
