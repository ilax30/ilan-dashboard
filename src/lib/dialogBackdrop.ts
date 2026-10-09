import type { MouseEvent } from 'react'

// Een venster sluit pas als zowel het indrukken als het loslaten van de muis op de achtergrond was.
// Tekst selecteren in een veld en buiten het venster loslaten sloot hem anders per ongeluk.
let pressedOnBackdrop = false

/** Handlers voor het <dialog>-element: klik op de achtergrond sluit het venster. */
export function backdropClose(onClose: () => void) {
  return {
    onMouseDown: (e: MouseEvent) => {
      pressedOnBackdrop = e.target === e.currentTarget
    },
    onClick: (e: MouseEvent) => {
      const close = pressedOnBackdrop && e.target === e.currentTarget
      pressedOnBackdrop = false
      if (close) onClose()
    },
  }
}
