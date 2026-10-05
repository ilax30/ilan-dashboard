import type { ReactNode } from 'react'
import type { Topic } from '../dashboard/topics'

// Lijn-iconen (20 px, kleur via currentColor) voor zijbalk en tegels.

export const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
)

export const ICONS: Record<'home' | 'agenda' | 'todo' | Topic['id'] | 'settings' | 'menu', ReactNode> = {
  home: icon(<path d="M4 11l8-6.5 8 6.5M6 9.5V19h12V9.5" />),
  agenda: icon(<><rect x="4" y="5.5" width="16" height="14" rx="3" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>),
  todo: icon(<><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8.5 12.2l2.4 2.4 4.6-5" /></>),
  doelen: icon(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></>),
  financien: icon(<><rect x="3.5" y="6.5" width="17" height="12" rx="3" /><path d="M3.5 10.5h17M16 14.5h1.5" /></>),
  notities: icon(<><path d="M6 3.5h9l3.5 3.5v13.5H6z" /><path d="M9 11h6M9 14.5h6M9 18h3.5" /></>),
  projecten: icon(<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />),
  settings: icon(<><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4L5.6 5.6" /></>),
  menu: icon(<path d="M4 7h16M4 12h16M4 17h16" />),
}

