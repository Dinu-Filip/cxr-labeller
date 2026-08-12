import { useEffect, useRef } from 'react'

type Bindings = Record<string, () => void>

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}

/**
 * Binds `event.key` to handlers on the window. Bindings are held in a ref so
 * changing handlers never re-registers the listener.
 */
export function useHotkeys(bindings: Bindings): void {
  const ref = useRef(bindings)

  useEffect(() => {
    ref.current = bindings
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      const handler = ref.current[event.key]
      if (!handler) return

      event.preventDefault()
      handler()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
