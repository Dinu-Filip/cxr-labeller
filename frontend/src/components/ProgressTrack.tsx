import styles from './ProgressTrack.module.css'

type Props = {
  done: number
  total: number
}

/** Beyond this many pairs, individual segments get too thin to read. */
const MAX_SEGMENTS = 20

export function ProgressTrack({ done, total }: Props) {
  const label = `${done} of ${total} pairs rated`

  if (total > MAX_SEGMENTS) {
    const percent = total === 0 ? 0 : (done / total) * 100
    return (
      <div className={styles.bar} role="img" aria-label={label}>
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
    )
  }

  return (
    <div className={styles.track} role="img" aria-label={label}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`${styles.segment} ${index < done ? styles.segmentDone : ''}`}
        />
      ))}
    </div>
  )
}
