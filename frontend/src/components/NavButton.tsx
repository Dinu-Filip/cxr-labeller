import { useRepeatPress } from '../hooks/useRepeatPress.ts'
import styles from './NavButton.module.css'

type Props = {
  direction: 'back' | 'forward'
  disabled: boolean
  onTrigger: () => void
}

export function NavButton({ direction, disabled, onTrigger }: Props) {
  const back = direction === 'back'
  const repeat = useRepeatPress(onTrigger, disabled)

  return (
    <button
      type="button"
      className={styles.nav}
      aria-label={back ? 'Previous pair' : 'Next pair'}
      disabled={disabled}
      {...repeat}
    >
      {back ? (
        <span className={styles.glyph} aria-hidden="true">
          ‹
        </span>
      ) : null}
      {back ? 'Previous' : 'Next'}
      <kbd className={styles.hint}>{back ? '←' : '→'}</kbd>
      {back ? null : (
        <span className={styles.glyph} aria-hidden="true">
          ›
        </span>
      )}
    </button>
  )
}
