export function Sprig({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 20" width="160" height="20" aria-hidden="true">
      <line x1="6" y1="12" x2="154" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="6" cy="12" r="2.4" fill="currentColor" />
      <circle cx="154" cy="12" r="2.4" fill="currentColor" />
      <path d="M80 11 C 74 9, 72 4, 75 1 C 79 2, 81 6, 80 11 Z" fill="currentColor" />
      <path d="M80 11 C 86 9, 88 4, 85 1 C 81 2, 79 6, 80 11 Z" fill="currentColor" />
      <path d="M80 12 C 77 15, 77 18, 80 19 C 83 18, 83 15, 80 12 Z" fill="currentColor" />
    </svg>
  )
}

export function Heart({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M12 21c-.4 0-.8-.2-1.1-.4C6.6 17.3 3 14.2 3 9.9 3 7.1 5.1 5 7.7 5c1.7 0 3.2.9 4.3 2.3C13.1 5.9 14.6 5 16.3 5 18.9 5 21 7.1 21 9.9c0 4.3-3.6 7.4-7.9 10.7-.3.2-.7.4-1.1.4Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** Drie kleine streepjes, zoals de accenten naast de letters in de referentie. */
export function Sparks({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        <line x1="4" y1="14" x2="9" y2="16" />
        <line x1="9" y1="5" x2="11" y2="10" />
        <line x1="17" y1="4" x2="16" y2="9" />
      </g>
    </svg>
  )
}

