import { Sprig } from '../components/Decor'
import { Landscape } from '../components/Landscape'
import type { Topic } from '../dashboard/topics'
import { navigate } from '../lib/router'

/** Pagina van een onderwerp (Doelen, Financiën, …). In ronde 2 nog leeg. */
export function TopicPage({ topic }: { topic: Topic }) {
  const { Art } = topic
  return (
    <>
      <Landscape />
      <button className="back-button" type="button" onClick={() => navigate('/')} aria-label="Terug naar het dashboard">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M14.5 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="back-label">Dashboard</span>
      </button>
      <main className="topic-page">
        <div className="topic-art" aria-hidden="true">
          <Art />
        </div>
        <h1 className="title">{topic.title}</h1>
        <Sprig className="sprig" />
        <p className="topic-empty">{topic.empty}</p>
      </main>
    </>
  )
}
