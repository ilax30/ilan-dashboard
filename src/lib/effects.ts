const STAR = '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="currentColor"/></svg>'
const HEART = '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 21c-.4 0-.8-.2-1.1-.4C6.6 17.3 3 14.2 3 9.9 3 7.1 5.1 5 7.7 5c1.7 0 3.2.9 4.3 2.3C13.1 5.9 14.6 5 16.3 5 18.9 5 21 7.1 21 9.9c0 4.3-3.6 7.4-7.9 10.7-.3.2-.7.4-1.1.4Z" fill="currentColor"/></svg>'
const DOT = '<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="9" fill="currentColor"/></svg>'

const COLORS = ['var(--accent)', 'var(--gold)', 'var(--blush)', 'var(--accent-ink)']

type Kind = 'done' | 'star'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Feestelijk burstje deeltjes vanaf een punt op het scherm (viewport-coördinaten). */
export function burst(x: number, y: number, kind: Kind = 'done') {
  if (reducedMotion()) return

  const layer = document.createElement('div')
  layer.className = 'fx-layer'
  document.body.appendChild(layer)

  const count = kind === 'done' ? 18 : 9
  const spread = kind === 'done' ? 110 : 42
  let longest = 0

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span')
    p.className = 'fx-p'
    const shape = kind === 'star' ? (i % 3 === 0 ? DOT : STAR) : [STAR, HEART, DOT][i % 3]
    p.innerHTML = shape
    const size = kind === 'done' ? 9 + Math.random() * 10 : 6 + Math.random() * 7
    p.style.width = p.style.height = `${size}px`
    p.style.left = `${x}px`
    p.style.top = `${y}px`
    p.style.color = kind === 'star' ? (i % 2 ? 'var(--gold)' : 'var(--gold-hi)') : COLORS[i % COLORS.length]
    layer.appendChild(p)

    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
    const dist = spread * (0.55 + Math.random() * 0.45)
    const dx = Math.cos(angle) * dist
    const dy = Math.sin(angle) * dist - (kind === 'done' ? 20 : 0)
    const rot = (Math.random() - 0.5) * 240
    const duration = (kind === 'done' ? 750 : 560) + Math.random() * 250
    longest = Math.max(longest, duration)

    p.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${rot}deg)`, opacity: 1, offset: 0.65 },
        {
          transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + (kind === 'done' ? 26 : 6)}px)) scale(0.6) rotate(${rot * 1.4}deg)`,
          opacity: 0,
        },
      ],
      { duration, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' },
    )
  }

  setTimeout(() => layer.remove(), longest + 50)
}

export function burstAt(el: Element | null, kind: Kind = 'done') {
  if (!el) return
  const r = el.getBoundingClientRect()
  burst(r.left + r.width / 2, r.top + r.height / 2, kind)
}
