import type { ReactNode, SyntheticEvent } from 'react'

// http(s)://… of www.…; leestekens aan het eind (punt, komma, haakje) horen niet bij de link.
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"]*[^\s<>".,:;!?'()[\]{}]/gi

const stop = (e: SyntheticEvent) => e.stopPropagation()

function prettyUrl(url: string) {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')
}

/** Tekst waarin URL's klikbare links worden (openen in een nieuw tabblad). */
export function LinkifiedText({ text, interactive = true }: { text: string; interactive?: boolean }) {
  const parts: ReactNode[] = []
  let last = 0

  for (const match of text.matchAll(URL_RE)) {
    const url = match[0]
    const start = match.index
    if (start > last) parts.push(text.slice(last, start))
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
    parts.push(
      <a
        key={start}
        className="link-chip"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={href}
        tabIndex={interactive ? 0 : -1}
        // Klikken op een link mag geen sleep- of bewerkactie starten.
        onMouseDown={stop}
        onTouchStart={stop}
        onKeyDown={stop}
        onDoubleClick={stop}
      >
        {prettyUrl(url)}
      </a>,
    )
    last = start + url.length
  }
  if (last < text.length) parts.push(text.slice(last))

  return <>{parts}</>
}
