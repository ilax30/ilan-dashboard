import { useDroppable } from '@dnd-kit/core'
import { Heart } from './Decor'

type Props = { doneToday: number; pop: number; dragging: boolean }

export function DoneZone({ doneToday, pop, dragging }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'done' })

  return (
    <aside
      ref={setNodeRef}
      className="done"
      data-over={isOver || undefined}
      data-dragging={dragging || undefined}
      aria-label="Gedaan: sleep een taak hierheen om hem af te ronden"
    >
      <span className="done-icon">
        {/* Unieke keys per soort: zelfde key bij broertjes laat oude hartjes staan. */}
        <Heart key={`heart-${pop}`} className={pop ? 'done-heart pop' : 'done-heart'} size={30} />
        {pop > 0 && (
          <span className="done-plus" key={`plus-${pop}`} aria-hidden="true">
            +1
          </span>
        )}
      </span>
      <div className="done-text">
        <h2 className="done-title">Gedaan</h2>
        <p className="done-hint">
          {isOver ? 'Laat maar los!' : dragging ? 'Hierheen slepen' : doneToday === 0 ? 'Nog niks vandaag' : `${doneToday} vandaag afgerond`}
        </p>
      </div>
    </aside>
  )
}
