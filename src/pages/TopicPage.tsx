import { Sprig } from '../components/Decor'
import { Icon } from '../components/icons'
import type { Topic } from '../dashboard/topics'

/** Pagina van een onderwerp (Doelen, Financiën, …). In ronde 2 nog leeg. */
export function TopicPage({ topic }: { topic: Topic }) {
  return (
    <>
      <main className="topic-page">
        <div className={`topic-art widget-${topic.id}`} aria-hidden="true">
          <Icon name={topic.id} size={88} weight="duotone" />
        </div>
        <h1 className="title">{topic.title}</h1>
        <Sprig className="sprig" />
        <p className="topic-empty">{topic.empty}</p>
      </main>
    </>
  )
}
