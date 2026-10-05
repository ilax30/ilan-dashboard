import {
  DndContext,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import type { CSSProperties, ReactNode } from 'react'
import { swapSlots, type Layout, type SlotRef, type SlotSize, type WidgetId } from '../lib/layout'
import { SteadyMouseSensor, SteadyTouchSensor } from '../lib/sensors'

const SLOTS: { ref: SlotRef; size: SlotSize }[] = [
  { ref: 'groot', size: 'groot' },
  { ref: 'middel', size: 'middel' },
  { ref: 0, size: 'klein' },
  { ref: 1, size: 'klein' },
  { ref: 2, size: 'klein' },
  { ref: 3, size: 'klein' },
]

const slotId = (ref: SlotRef) => (typeof ref === 'number' ? `klein-${ref}` : ref)
const refOf = (id: string): SlotRef => (id.startsWith('klein-') ? (Number(id.slice(6)) as 0 | 1 | 2 | 3) : (id as SlotRef))
const SIZE_LABEL: Record<SlotSize, string> = { groot: 'grote', middel: 'middelgrote', klein: 'kleine' }

type Props = {
  layout: Layout
  editing: boolean
  onChange: (layout: Layout) => void
  render: (id: WidgetId, size: SlotSize) => ReactNode
}

function Slot({ slot, size, editing, children, title }: { slot: SlotRef; size: SlotSize; editing: boolean; children: ReactNode; title: string }) {
  const id = slotId(slot)
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id, disabled: !editing })
  const { setNodeRef: setDragRef, attributes, listeners, transform, isDragging } = useDraggable({ id, disabled: !editing })
  const style: CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 }
    : undefined
  return (
    <div ref={setDropRef} className="slot" data-slot={size} data-over={(editing && isOver && !isDragging) || undefined}>
      <div ref={setDragRef} className="slot-inner" data-dragging={isDragging || undefined} style={style}>
        {children}
        {editing && (
          <div
            className="slot-handle"
            {...attributes}
            {...listeners}
            aria-label={`${title} op de ${SIZE_LABEL[size]} plek. Sleep naar een andere plek om te ruilen.`}
          >
            <span className="slot-grip" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <circle cx="9" cy="6" r="1.6" />
                <circle cx="15" cy="6" r="1.6" />
                <circle cx="9" cy="12" r="1.6" />
                <circle cx="15" cy="12" r="1.6" />
                <circle cx="9" cy="18" r="1.6" />
                <circle cx="15" cy="18" r="1.6" />
              </svg>
              Sleep
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

const TITLES: Record<WidgetId, string> = {
  agenda: 'Agenda',
  todo: 'To-do',
  doelen: 'Doelen',
  financien: 'Financiën',
  notities: 'Notities',
  projecten: 'Projecten',
}

/** De 6 plekken; in de aanpas-stand sleep je een tegel op een andere plek en ze ruilen. */
export function SlotGrid({ layout, editing, onChange, render }: Props) {
  const sensors = useSensors(
    useSensor(SteadyMouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(SteadyTouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    onChange(swapSlots(layout, refOf(String(active.id)), refOf(String(over.id))))
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      {SLOTS.map(({ ref, size }) => {
        const id = typeof ref === 'number' ? layout.klein[ref] : layout[ref]
        return (
          <Slot key={slotId(ref)} slot={ref} size={size} editing={editing} title={TITLES[id]}>
            {render(id, size)}
          </Slot>
        )
      })}
    </DndContext>
  )
}
