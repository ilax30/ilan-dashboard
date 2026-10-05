import { useEffect, useRef } from 'react'

// Kleine app-brede seintjes tussen zijbalk, vensters en pagina's (zonder props door alle lagen heen).
export type AppEvent = 'open-settings' | 'open-agenda' | 'settings-saved' | 'todos-changed'

export function emit(name: AppEvent) {
  window.dispatchEvent(new Event(`app:${name}`))
}

export function useAppEvent(name: AppEvent, handler: () => void) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const listener = () => ref.current()
    window.addEventListener(`app:${name}`, listener)
    return () => window.removeEventListener(`app:${name}`, listener)
  }, [name])
}
