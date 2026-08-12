import styles from './Doughnut.module.css'

const RADIUS = 8
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

type Props = {
  done: number
  total: number
  /** Rendered edge length in px; the geometry scales with the viewBox. */
  size?: number
}

export function Doughnut({ done, total, size = 22 }: Props) {
  const fraction = total === 0 ? 0 : done / total
  return (
    <svg
      className={styles.doughnut}
      style={{ width: size, height: size }}
      viewBox="0 0 22 22"
      role="img"
      aria-label={`${done} of ${total} pairs rated`}
    >
      <circle className={styles.track} cx="11" cy="11" r={RADIUS} fill="none" />
      <circle
        className={styles.value}
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
