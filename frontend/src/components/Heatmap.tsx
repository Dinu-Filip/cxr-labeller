import { SIMILARITY_OPTIONS } from '../data/similarityLevels.ts'
import type { Primitive, SimilarityLevel } from '../types.ts'
import styles from './Heatmap.module.css'

type Props = {
  primitives: Primitive[]
  levelByPairId: Map<string, SimilarityLevel>
  /** Position of each pair in the rating queue, for jumping to it. */
  indexByPairId: Map<string, number>
  onSelect: (index: number) => void
}

const LABELS = new Map(
  SIMILARITY_OPTIONS.map((option) => [option.level, option.label.toLowerCase()]),
)

function pairId(a: Primitive, b: Primitive): string {
  return a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`
}

/**
 * Lower-triangle matrix of every primitive pair, coloured by the rating given.
 *
 * Similarity is symmetric, so the upper triangle would only mirror this one —
 * omitting it halves the noise and leaves room for bigger cells. Rows carry the
 * full primitive names and double as the key for the numbered column axis.
 */
export function Heatmap({
  primitives,
  levelByPairId,
  indexByPairId,
  onSelect,
}: Props) {
  const ordered = [...primitives].sort((a, b) => a.id - b.id)

  return (
    <div className={styles.wrap}>
      <div className={styles.grid} role="group" aria-label="Your ratings by pair">
        {ordered.map((row, i) => (
          <div className={styles.row} key={row.id}>
            <span className={styles.rowLabel} title={row.name}>
              <span className={styles.index}>{i + 1}.</span> {row.name}
            </span>
            {ordered.slice(0, i + 1).map((column, j) => {
              if (i === j) {
                return (
                  <span
                    key={column.id}
                    className={styles.diagonal}
                    aria-hidden="true"
                  />
                )
              }
              const id = pairId(row, column)
              const level = levelByPairId.get(id)
              const index = indexByPairId.get(id)
              const status = level ? `rated ${LABELS.get(level)}` : 'not yet rated'
              return (
                <button
                  key={column.id}
                  type="button"
                  className={`${styles.cell} ${level ? `${styles.rated} ${styles[level]}` : ''}`}
                  aria-label={`${row.name} versus ${column.name}, ${status}`}
                  title={`${row.name} vs ${column.name} — ${status}`}
                  disabled={index === undefined}
                  onClick={() => index !== undefined && onSelect(index)}
                />
              )
            })}
          </div>
        ))}

        <div className={styles.axis} aria-hidden="true">
          <span className={styles.axisSpacer} />
          {ordered.map((primitive, i) => (
            <span className={styles.axisLabel} key={primitive.id}>
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      <ul className={styles.legend}>
        {SIMILARITY_OPTIONS.map((option) => (
          <li
            key={option.level}
            className={`${styles.legendItem} ${styles[option.level]}`}
          >
            <span className={styles.swatch} />
            {option.label}
          </li>
        ))}
        <li className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchEmpty}`} />
          Not yet rated
        </li>
      </ul>
    </div>
  )
}
