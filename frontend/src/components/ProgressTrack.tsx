import { useEffect, useState } from 'react'
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

/** Segments stay legible up to this many; past it the track slides. */
const WINDOW = 20

const LABELS = new Map(
  SIMILARITY_OPTIONS.map((option) => [option.level, option.label.toLowerCase()]),
)

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

/** Start of the page holding `focus`, so following it lands on the same
    boundaries the arrows step between. */
function pageFor(focus: number, maxOffset: number): number {
  return clamp(Math.floor(focus / WINDOW) * WINDOW, 0, maxOffset)
}

const RADIUS = 8
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function Doughnut({ done, total }: { done: number; total: number }) {
  const fraction = total === 0 ? 0 : done / total
  return (
    <svg
      className={styles.doughnut}
      viewBox="0 0 22 22"
      role="img"
      aria-label={`${done} of ${total} pairs rated`}
    >
      <circle
        className={styles.doughnutTrack}
        cx="11"
        cy="11"
        r={RADIUS}
        fill="none"
      />
      <circle
        className={styles.doughnutValue}
        cx="11"
        cy="11"
        r={RADIUS}
        fill="none"
        strokeDasharray={`${CIRCUMFERENCE * fraction} ${CIRCUMFERENCE}`}
        strokeLinecap={done > 0 ? 'round' : 'butt'}
        transform="rotate(-90 11 11)"
      />
    </svg>
  )
}

export function ProgressTrack({
  pairs,
  levelByPairId,
  cursor,
  disabled,
  onSelect,
}: Props) {
  const total = pairs.length
  const maxOffset = Math.max(0, total - WINDOW)
  // The cursor sits past the last pair once everything is rated.
  const focus = Math.min(cursor, Math.max(total - 1, 0))
  const [offset, setOffset] = useState(() => pageFor(focus, maxOffset))

  // Follow the cursor, so navigating past the edge of the window does not
  // leave it off-screen. Manual sliding holds while the cursor is in view.
  useEffect(() => {
    setOffset((prev) => {
      const base = clamp(prev, 0, maxOffset)
      const visible = focus >= base && focus < base + WINDOW
      return visible ? base : pageFor(focus, maxOffset)
    })
  }, [focus, maxOffset])

  const windowed = maxOffset > 0
  const visible = Math.min(WINDOW, total)
  const done = levelByPairId.size
  const first = total === 0 ? 0 : offset + 1
  const last = offset + visible

  return (
    <div className={styles.wrap}>
      <Doughnut done={done} total={total} />

      {windowed ? (
        <button
          type="button"
          className={styles.slide}
          aria-label="Show earlier pairs"
          disabled={offset === 0}
          onClick={() => setOffset((prev) => clamp(prev - WINDOW, 0, maxOffset))}
        >
          <span aria-hidden="true">‹</span>
        </button>
      ) : null}

      <div
        className={styles.track}
        role="group"
        aria-label={`Jump to pair. Showing ${first} to ${last} of ${total}`}
      >
        {Array.from({ length: visible }, (_, slot) => {
          const index = offset + slot
          const pair = pairs[index]
          if (!pair) return null
          const level = levelByPairId.get(pair.id)
          const status = level ? `rated ${LABELS.get(level)}` : 'not yet rated'
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

      {windowed ? (
        <button
          type="button"
          className={styles.slide}
          aria-label="Show later pairs"
          disabled={offset >= maxOffset}
          onClick={() => setOffset((prev) => clamp(prev + WINDOW, 0, maxOffset))}
        >
          <span aria-hidden="true">›</span>
        </button>
      ) : null}

      <p className={styles.range}>
        {first}&ndash;{last}
      </p>
      <span className={styles.srOnly} aria-live="polite">
        {done} of {total} pairs rated
      </span>
    </div>
  )
}
