import { SIMILARITY_OPTIONS } from '../data/similarityLevels.ts'
import type { Judgement, SimilarityLevel } from '../types.ts'
import styles from './SessionComplete.module.css'

type Props = {
  judgements: Judgement[]
  /** Omitted once ratings live on the server, where a local reset would be a
      destructive bulk delete rather than clearing a scratch session. */
  onReset: (() => void) | null
}

function countByLevel(judgements: Judgement[]): Record<SimilarityLevel, number> {
  const counts = { clear: 0, moderate: 0, weak: 0, none: 0 }
  for (const judgement of judgements) {
    counts[judgement.level] += 1
  }
  return counts
}

export function SessionComplete({ judgements, onReset }: Props) {
  const counts = countByLevel(judgements)

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>All pairs rated</h2>
      <p className={styles.subtitle}>
        {judgements.length} {judgements.length === 1 ? 'pair' : 'pairs'} in this
        set.
      </p>

      <div
        className={styles.distribution}
        role="img"
        aria-label="Distribution of ratings"
      >
        {SIMILARITY_OPTIONS.map((option) => (
          <span
            key={option.level}
            className={`${styles.slice} ${styles[option.level]}`}
            style={{ flexGrow: counts[option.level] }}
          />
        ))}
      </div>

      <ul className={styles.legend}>
        {SIMILARITY_OPTIONS.map((option) => (
          <li
            key={option.level}
            className={`${styles.legendItem} ${styles[option.level]}`}
          >
            <span className={styles.swatch} />
            {option.label}
            <span className={styles.count}>{counts[option.level]}</span>
          </li>
        ))}
      </ul>

      {onReset ? (
        <button type="button" className={styles.reset} onClick={onReset}>
          Start over
        </button>
      ) : (
        <p className={styles.subtitle}>
          Use ← to go back and revisit any pair.
        </p>
      )}
    </section>
  )
}
