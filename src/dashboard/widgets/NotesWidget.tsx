import { Plus } from '@phosphor-icons/react'
import { Icon } from '../../components/icons'
import { noteTitle } from '../../lib/notes'
import { navigate } from '../../lib/router'
import { useNotes } from '../../lib/useNotes'
import { NEW_NOTE_FLAG } from '../../pages/NotesPage'
import { WidgetCard, type WidgetProps } from './WidgetCard'

const SHOWN = { klein: 5, middel: 5, groot: 6 } as const
const dateFmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })

/** Notities-tegel: titels van de laatste notities (klein/middel 5, groot 6 + "Nieuwe notitie"); klik = lezen. */
export function NotesWidget({ size, onOpen }: WidgetProps) {
  const { notes, failed } = useNotes()
  const list = notes ?? []
  const newNote = () => {
    try {
      sessionStorage.setItem(NEW_NOTE_FLAG, '1')
    } catch {
      // geen sessie-opslag: dan opent gewoon de pagina
    }
    navigate('/notities')
  }
  return (
    <WidgetCard title="Notities" icon={<Icon name="notities" size={24} weight="duotone" />} size={size} onOpen={onOpen} className="widget-notities">
      {notes === null ? (
        <p className="widget-muted">{failed ? 'Notities konden niet laden' : 'Laden…'}</p>
      ) : list.length === 0 ? (
        <p className="widget-muted">Nog geen notities</p>
      ) : (
        <ul className="widget-list widget-notes">
          {list.slice(0, SHOWN[size]).map((n) => (
            <li key={n.id}>
              <span className="widget-clip">{noteTitle(n)}</span>
              {size !== 'klein' && <span className="widget-time">{dateFmt.format(new Date(n.updated_at)).replace('.', '')}</span>}
            </li>
          ))}
        </ul>
      )}
      {size === 'groot' && (
        <button className="settings-button widget-note-new" type="button" onClick={newNote}>
          <Plus size={16} weight="bold" /> Nieuwe notitie
        </button>
      )}
    </WidgetCard>
  )
}
