// Wanneer de app om de pincode vraagt. Desktop (muis) staat vaak lang open op de achtergrond: daar niet
// steeds vergrendelen, alleen bij opnieuw openen na lange tijd. Telefoon/tablet: na 10 minuten.

const MIN = 60 * 1000

export function lockPolicy(desktop: boolean): { lockAfterMs: number; lockWhileOpen: boolean } {
  return desktop ? { lockAfterMs: 2 * 60 * MIN, lockWhileOpen: false } : { lockAfterMs: 10 * MIN, lockWhileOpen: true }
}

/** Desktop = muis als primaire aanwijzer (geen touchscreen-telefoon/tablet). */
export function isDesktop(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}
