import styles from './Toggle.module.css'

type Props = {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}

export function Toggle({ checked, label, onChange }: Props) {
  return (
    <button
      type="button"
      className={styles.toggle}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.track}>
        <span className={styles.knob} />
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  )
}
