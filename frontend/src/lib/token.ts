const TOKEN_KEY = 'primitive-scorer.token'

export function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Storage blocked; the token still works for this session.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nothing to do.
  }
}
