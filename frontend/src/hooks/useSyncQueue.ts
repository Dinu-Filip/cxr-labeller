import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApiClient } from '../api/client.ts'
import { UnauthorizedError } from '../api/client.ts'
import { loadPending, savePending, type PendingWrites } from '../lib/storage.ts'
import type { SimilarityLevel } from '../types.ts'

const RETRY_MS = 5000

export type SyncStatus = 'synced' | 'syncing' | 'offline'

export type SyncQueue = {
  status: SyncStatus
  pendingCount: number
  enqueue: (pairId: string, level: SimilarityLevel | null) => void
}

export function useSyncQueue(
  client: ApiClient,
  onUnauthorized: () => void,
): SyncQueue {
  const [pending, setPending] = useState<PendingWrites>(loadPending)
  const [status, setStatus] = useState<SyncStatus>('synced')
  const inFlight = useRef(false)
  const retry = useRef<number | null>(null)

  useEffect(() => {
    savePending(pending)
  }, [pending])

  const enqueue = useCallback((pairId: string, level: SimilarityLevel | null) => {
    setPending((prev) => ({ ...prev, [pairId]: level }))
  }, [])

  const flush = useCallback(async () => {
    if (inFlight.current) return
    const batch = Object.entries(pending)
    if (batch.length === 0) {
      setStatus('synced')
      return
    }

    inFlight.current = true
    setStatus('syncing')
    try {
      const upserts = batch.filter(([, level]) => level !== null)
      const deletes = batch.filter(([, level]) => level === null)

      if (upserts.length > 0) {
        await client.batchRatings(
          upserts.map(([pair_id, level]) => ({
            pair_id,
            level: level as SimilarityLevel,
          })),
        )
      }
      for (const [pairId] of deletes) {
        await client.deleteRating(pairId)
      }

      // Drop only what we actually sent, and only if it has not been
      // superseded while the request was in flight.
      setPending((prev) => {
        const next = { ...prev }
        for (const [pairId, level] of batch) {
          if (next[pairId] === level) delete next[pairId]
        }
        return next
      })
      setStatus('synced')
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        onUnauthorized()
        return
      }
      setStatus('offline')
      retry.current = window.setTimeout(() => {
        retry.current = null
        void flush()
      }, RETRY_MS)
    } finally {
      inFlight.current = false
    }
  }, [client, onUnauthorized, pending])

  useEffect(() => {
    if (Object.keys(pending).length > 0) void flush()
  }, [pending, flush])

  useEffect(() => {
    const onOnline = () => void flush()
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('online', onOnline)
      if (retry.current !== null) window.clearTimeout(retry.current)
    }
  }, [flush])

  return { status, pendingCount: Object.keys(pending).length, enqueue }
}
