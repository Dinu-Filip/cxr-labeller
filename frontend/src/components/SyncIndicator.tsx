import type { SyncStatus } from '../hooks/useSyncQueue.ts'
import styles from './SyncIndicator.module.css'

type Props = {
  status: SyncStatus
  pendingCount: number
}

export function SyncIndicator({ status, pendingCount }: Props) {
  const label =
    status === 'offline'
      ? `${pendingCount} unsaved`
      : status === 'syncing'
        ? 'Saving'
        : 'Saved'

  return (
    <p className={`${styles.indicator} ${styles[status]}`} aria-live="polite">
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </p>
  )
}
