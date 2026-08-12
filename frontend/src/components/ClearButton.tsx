import styles from './ClearButton.module.css'

type Props = {
  hasRating: boolean
  disabled: boolean
  onClear: () => void
}

export function ClearButton({ hasRating, disabled, onClear }: Props) {
  return (
    <button
      type="button"
      className={styles.button}
      disabled={disabled || !hasRating}
      onClick={onClear}
    >
      <span aria-hidden="true">↩</span>
      Clear rating
      <kbd>Backspace</kbd>
    </button>
  )
}
