import type { Judgement, Pair, Primitive, SimilarityLevel } from '../types.ts'

const BASE_URL = (
  import.meta.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:8000'
).replace(/\/$/, '')

/** Thrown when the server rejects our token, so callers can drop it. */
export class UnauthorizedError extends Error {
  constructor() {
    super('token rejected')
    this.name = 'UnauthorizedError'
  }
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RatingResponse = {
  pair_id: string
  level: SimilarityLevel
  updated_at: string
}

async function request<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })

  if (response.status === 401) throw new UnauthorizedError()
  if (!response.ok) {
    throw new ApiError(response.status, await response.text())
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export type Reviewer = {
  id: number
  name: string
  rated: number
  total_pairs: number
  remaining: number
}

export function createClient(token: string) {
  return {
    me: () => request<Reviewer>(token, '/me'),

    primitives: () => request<Primitive[]>(token, '/primitives'),

    // Must exceed C(n,2) or the server's queue is truncated and the tail falls
    // back to plain id order, quietly weakening the shuffle. 2000 covers 63
    // primitives; the list is currently 36.
    pairs: (limit = 2000) => request<Pair[]>(token, `/pairs?limit=${limit}`),

    ratings: async (): Promise<Judgement[]> => {
      const rows = await request<RatingResponse[]>(token, '/ratings')
      return rows.map((row) => ({
        pairId: row.pair_id,
        level: row.level,
        ratedAt: row.updated_at,
      }))
    },

    putRating: (pairId: string, level: SimilarityLevel) =>
      request<RatingResponse>(token, `/ratings/${pairId}`, {
        method: 'PUT',
        body: JSON.stringify({ level }),
      }),

    deleteRating: async (pairId: string) => {
      try {
        await request<void>(token, `/ratings/${pairId}`, { method: 'DELETE' })
      } catch (error) {
        // Already absent server-side is the state we wanted anyway.
        if (error instanceof ApiError && error.status === 404) return
        throw error
      }
    },

    batchRatings: (entries: { pair_id: string; level: SimilarityLevel }[]) =>
      request<RatingResponse[]>(token, '/ratings/batch', {
        method: 'POST',
        body: JSON.stringify(entries),
      }),
  }
}

export type ApiClient = ReturnType<typeof createClient>
