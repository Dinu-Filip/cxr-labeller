import type { AuthTokens, User } from '../types/types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json()
    return data.detail ?? response.statusText
  } catch {
    return response.statusText
  }
}

export async function signUp(username: string, email: string, password: string): Promise<User> {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  })
  if (!response.ok) throw new Error(await parseError(response))
  return response.json()
}

export async function logIn(username: string, password: string): Promise<AuthTokens> {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password }),
  })
  if (!response.ok) throw new Error(await parseError(response))
  return response.json()
}

export async function logOut(token: string): Promise<void> {
  const response = await fetch(`${API_URL}/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(await parseError(response))
}
