import type { Pair } from '../types.ts'
import { PrimitiveCard } from './PrimitiveCard.tsx'
import styles from './RatingArena.module.css'

type Props = {
  pair: Pair
  /** True while a rating is committing, which plays the cards out. */
  exiting: boolean
}

export function RatingArena({ pair, exiting }: Props) {
  return (
    <div className={`${styles.arena} ${exiting ? styles.exiting : ''}`}>
      <PrimitiveCard
        primitive={pair.a}
        className={`${styles.card} ${styles.cardA}`}
      />
      <span className={styles.versus} aria-hidden="true">
        vs
      </span>
      <PrimitiveCard
        primitive={pair.b}
        className={`${styles.card} ${styles.cardB}`}
      />
    </div>
  )
}
