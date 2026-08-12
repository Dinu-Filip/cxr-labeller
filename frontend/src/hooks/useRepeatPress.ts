import { useCallback, useEffect, useRef } from 'react'
import type { MouseEvent, PointerEvent } from 'react'

/** Pause before a held button starts repeating, matching typical key repeat. */
const HOLD_DELAY_MS = 350
const REPEAT_MS = 80

export type RepeatHandlers = {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerLeave: () => void
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
}

/**
 * Fires once on press, then repeatedly while the button is held down.
 *
 * Pointer and keyboard activation are handled separately: pressing with a mouse
 * runs through `pointerdown` so the repeat can start, and the synthetic click
 * that follows is ignored. Keyboard activation only produces a click, which the
 * browser marks with `detail === 0`, so that path fires exactly once.
 */
export function useRepeatPress(
  onTrigger: () => void,
  disabled: boolean,
): RepeatHandlers {
  const latest = useRef(onTrigger)
  const delay = useRef<number | null>(null)
  const repeat = useRef<number | null>(null)

  useEffect(() => {
    latest.current = onTrigger
  })

  const stop = useCallback(() => {
    if (delay.current !== null) {
      window.clearTimeout(delay.current)
      delay.current = null
    }
    if (repeat.current !== null) {
      window.clearInterval(repeat.current)
      repeat.current = null
    }
  }, [])

  const start = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (disabled || event.button !== 0) return
      stop()
      latest.current()
      delay.current = window.setTimeout(() => {
        delay.current = null
        repeat.current = window.setInterval(() => latest.current(), REPEAT_MS)
      }, HOLD_DELAY_MS)
      // The release often lands outside the button, so watch the window.
      window.addEventListener('pointerup', stop, { once: true })
      window.addEventListener('pointercancel', stop, { once: true })
    },
    [disabled, stop],
  )

  // Reaching the end of the queue disables the button mid-hold.
  useEffect(() => {
    if (disabled) stop()
  }, [disabled, stop])

  useEffect(() => stop, [stop])

  return {
    onPointerDown: start,
    onPointerLeave: stop,
    onClick: (event) => {
      if (event.detail === 0 && !disabled) latest.current()
    },
  }
}
