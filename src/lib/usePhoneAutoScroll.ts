import { useEffect, useRef } from 'react'

const EDGE = 72 // px: zone bovenaan het scherm en vlak boven de Gedaan-balk
const DWELL_MS = 280 // eerst even stilhouden voordat er gescrold wordt

/**
 * Scrollen tijdens slepen op een telefoon. De standaard auto-scroll van dnd-kit scrollt zodra je
 * bij de onderrand komt, en daar zit juist de Gedaan-balk. Hier: nooit scrollen boven Gedaan;
 * alleen als je je vinger even stilhoudt bovenaan het scherm of vlak bóven de balk.
 */
export function usePhoneAutoScroll(active: boolean, startY: number | null, dropZoneSelector: string) {
  const pointerY = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    pointerY.current = startY

    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) pointerY.current = t.clientY
    }
    const onMouse = (e: MouseEvent) => {
      pointerY.current = e.clientY
    }
    window.addEventListener('touchmove', onTouch, { capture: true, passive: true })
    window.addEventListener('mousemove', onMouse, { capture: true, passive: true })

    let raf = 0
    let zone: 'up' | 'down' | null = null
    let zoneSince = 0

    const tick = () => {
      const y = pointerY.current
      const drop = document.querySelector(dropZoneSelector)
      let next: typeof zone = null
      let strength = 0
      if (y !== null && drop) {
        const top = drop.getBoundingClientRect().top
        if (y < EDGE) {
          next = 'up'
          strength = (EDGE - y) / EDGE
        } else if (y < top && y > top - EDGE) {
          next = 'down'
          strength = (y - (top - EDGE)) / EDGE
        }
      }
      if (next !== zone) {
        zone = next
        zoneSince = performance.now()
      }
      if (zone && performance.now() - zoneSince > DWELL_MS) {
        const speed = 3 + 14 * Math.min(1, strength) ** 2
        window.scrollBy(0, zone === 'up' ? -speed : speed)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('touchmove', onTouch, { capture: true })
      window.removeEventListener('mousemove', onMouse, { capture: true })
    }
  }, [active, startY, dropZoneSelector])
}
