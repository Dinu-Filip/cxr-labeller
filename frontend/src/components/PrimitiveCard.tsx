import type { Primitive } from '../types.ts'
import styles from './PrimitiveCard.module.css'

type Props = {
  primitive: Primitive
  /** Lets the arena attach its enter/exit animation to the card itself. */
  className?: string
}

export function PrimitiveCard({ primitive, className }: Props) {
  return (
    <article className={`${styles.card} ${className ?? ''}`}>
      <h2 className={styles.name}>{primitive.name}</h2>
    </article>
  )
}
