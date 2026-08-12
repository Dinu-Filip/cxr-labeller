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
  const label = windowed
    ? `Jump to pair. ${done} of ${total} rated, showing ${offset + 1} to ${offset + visible}`
    : `Jump to pair. ${done} of ${total} rated`

  return (
    <div className={styles.wrap}>
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

      <div className={styles.track} role="group" aria-label={label}>
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
              className={`${styles.segment} ${level ? styles.rated : ''} ${
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
    </div>
  )
}
