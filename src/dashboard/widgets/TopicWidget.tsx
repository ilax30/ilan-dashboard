import { Icon } from '../../components/icons'
import type { Topic } from '../topics'
import { WidgetCard, type WidgetProps } from './WidgetCard'

/** Onderwerp-tegel (Doelen, Financiën, …): plaatje + "Binnenkort", met meer tekst naarmate de tegel groter is. */
export function TopicWidget({ size, onOpen, topic }: WidgetProps & { topic: Topic }) {
  return (
    <WidgetCard title={topic.title} icon={<Icon name={topic.id} size={24} weight="duotone" />} size={size} onOpen={onOpen} className={`widget-topic widget-${topic.id}${topic.later ? ' widget-later' : ''}`}>
      <div className="widget-topic-body">
        <span className="widget-art" aria-hidden="true">
          <Icon name={topic.id} size={size === 'groot' ? 64 : size === 'middel' ? 48 : 34} weight="duotone" />
        </span>
        <span className="widget-topic-text">
          <span className="widget-soon">{topic.later ? 'Volgende week' : 'Binnenkort'}</span>
          {size !== 'klein' && <span className="widget-muted">{topic.line}</span>}
          {size === 'groot' && <span className="widget-muted">{topic.empty}</span>}
        </span>
      </div>
    </WidgetCard>
  )
}
