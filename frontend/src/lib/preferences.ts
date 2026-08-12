const SHUFFLE_KEY = 'primitive-scorer.shuffle'

export function loadShuffle(): boolean {
  try {
    return localStorage.getItem(SHUFFLE_KEY) === 'true'
  } catch {
    return false
  }
}

export function saveShuffle(shuffle: boolean): void {
  try {
    localStorage.setItem(SHUFFLE_KEY, String(shuffle))
  } catch {
    // Preference is not worth failing over; it just won't persist.
  }
}
