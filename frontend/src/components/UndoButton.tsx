import type { Pair } from '../types.ts'
import styles from './UndoButton.module.css'

type Props = {
  previous: Pair | null
  disabled: boolean
  onUndo: () => void
}

export function UndoButton({ previous, disabled, onUndo }: Props) {
  return (
    <button
      type="button"
      className={styles.undo}
      disabled={disabled || !previous}
      onClick={onUndo}
    >
      <span aria-hidden="true">↩</span>
      Undo
      {previous ? (
        <span className={styles.target}>
          {previous.a.name} vs {previous.b.name}
        </span>
      ) : null}
      <kbd>Backspace</kbd>
    </button>
  )
}
