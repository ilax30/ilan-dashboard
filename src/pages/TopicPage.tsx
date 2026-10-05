import { Sprig } from '../components/Decor'
import type { Topic } from '../dashboard/topics'

/** Pagina van een onderwerp (Doelen, Financiën, …). In ronde 2 nog leeg. */
export function TopicPage({ topic }: { topic: Topic }) {
  const { Art } = topic
  return (
    <>
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
