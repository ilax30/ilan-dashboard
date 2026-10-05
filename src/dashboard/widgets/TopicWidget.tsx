import { ICONS } from '../../components/icons'
import type { Topic } from '../topics'
import { WidgetCard, type WidgetProps } from './WidgetCard'

/** Onderwerp-tegel (Doelen, Financiën, …): plaatje + "Binnenkort", met meer tekst naarmate de tegel groter is. */
export function TopicWidget({ size, onOpen, topic }: WidgetProps & { topic: Topic }) {
  const { Art } = topic
  return (
    <WidgetCard title={topic.title} icon={ICONS[topic.id]} size={size} onOpen={onOpen} className="widget-topic">
      <div className="widget-topic-body">
        <span className="widget-art" aria-hidden="true">
          <Art />
        </span>
        <span className="widget-topic-text">
          <span className="widget-soon">Binnenkort</span>
          {size !== 'klein' && <span className="widget-muted">{topic.line}</span>}
          {size === 'groot' && <span className="widget-muted">{topic.empty}</span>}
        </span>
      </div>
    </WidgetCard>
  )
}
