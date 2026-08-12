import { SIMILARITY_OPTIONS } from '../data/similarityLevels.ts'
import type { SimilarityLevel } from '../types.ts'
import styles from './SimilarityScale.module.css'

type Props = {
  selected: SimilarityLevel | null
  disabled: boolean
  onSelect: (level: SimilarityLevel) => void
}

export function SimilarityScale({ selected, disabled, onSelect }: Props) {
  return (
    <div className={styles.wrap}>
      <p className={styles.prompt} id="similarity-prompt">
        How visually similar are these?
      </p>
      <div
        className={styles.options}
        role="group"
        aria-labelledby="similarity-prompt"
      >
        {SIMILARITY_OPTIONS.map((option) => {
          const isSelected = selected === option.level
          return (
            <button
              key={option.level}
              type="button"
              className={`${styles.option} ${styles[option.level]} ${
                isSelected ? styles.selected : ''
              } ${isSelected && disabled ? styles.committing : ''}`}
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => onSelect(option.level)}
            >
              <span>{option.label}</span>
              <kbd className={styles.hotkey}>{option.hotkey}</kbd>
            </button>
          )
        })}
      </div>
    </div>
  )
}
