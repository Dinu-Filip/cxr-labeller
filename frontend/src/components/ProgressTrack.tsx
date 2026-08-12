import { useEffect, useState } from 'react'
import styles from './ProgressTrack.module.css'

type Props = {
  done: number
  total: number
}

/** Segments stay legible up to this many; past it the track slides. */
const WINDOW = 20

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

/** Start of the page holding `frontier`, so following it lands on the same
    boundaries the arrows step between. */
function pageFor(frontier: number, maxOffset: number): number {
  return clamp(Math.floor(frontier / WINDOW) * WINDOW, 0, maxOffset)
}

export function ProgressTrack({ done, total }: Props) {
  const maxOffset = Math.max(0, total - WINDOW)
  // `done` equals `total` once finished, which is past the last segment.
  const frontier = Math.min(done, Math.max(total - 1, 0))
  const [offset, setOffset] = useState(() => pageFor(frontier, maxOffset))

  // Follow the frontier, so rating past the edge of the window does not leave
  // your progress off-screen. Manual sliding holds while the frontier is still
  // in view.
  useEffect(() => {
    setOffset((prev) => {
      const base = clamp(prev, 0, maxOffset)
      const visible = frontier >= base && frontier < base + WINDOW
      return visible ? base : pageFor(frontier, maxOffset)
    })
  }, [frontier, maxOffset])

  const windowed = maxOffset > 0
  const visible = Math.min(WINDOW, total)
  const label = windowed
    ? `${done} of ${total} pairs rated, showing ${offset + 1} to ${offset + visible}`
    : `${done} of ${total} pairs rated`

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

      <div className={styles.track} role="img" aria-label={label}>
        {Array.from({ length: visible }, (_, slot) => {
          const index = offset + slot
          return (
            <span
              key={index}
              className={`${styles.segment} ${index < done ? styles.segmentDone : ''}`}
            />
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
