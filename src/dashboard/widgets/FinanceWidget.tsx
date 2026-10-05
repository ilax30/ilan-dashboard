import { Plus } from '@phosphor-icons/react'
import { Icon } from '../../components/icons'
import { dueSoon, formatEuro, openThisMonth } from '../../lib/bills'
import { navigate } from '../../lib/router'
import { useBills } from '../../lib/useBills'
import { formatDueShort, NEW_BILL_FLAG } from '../../pages/FinancePage'
import { WidgetCard, type WidgetProps } from './WidgetCard'

const SHOWN = { klein: 0, middel: 3, groot: 4 } as const

/** Financiën-tegel: openstaand deze maand, aantal betalingen binnen 7 dagen en de eerstvolgende betalingen. */
export function FinanceWidget({ size, onOpen }: WidgetProps) {
  const { bills, failed } = useBills()
  const now = new Date()
  const list = bills ?? []
  const upcoming = dueSoon(list, now, 3650)
  const soon = dueSoon(list, now, 7).length
  const newBill = () => {
    try {
      sessionStorage.setItem(NEW_BILL_FLAG, '1')
    } catch {
      // geen sessie-opslag: dan opent gewoon de pagina
    }
    navigate('/financien')
  }
  return (
    <WidgetCard title="Financiën" icon={<Icon name="financien" size={24} weight="duotone" />} size={size} onOpen={onOpen} className="widget-financien">
      {bills === null ? (
        <p className="widget-muted">{failed ? 'Vaste lasten konden niet laden' : 'Laden…'}</p>
      ) : list.length === 0 ? (
        <p className="widget-muted">Nog geen vaste lasten</p>
      ) : (
        <>
          <div className="fin-w-top">
            <span className="fin-w-label">Openstaand</span>
            <span className="widget-big">{formatEuro(openThisMonth(list, now))}</span>
            {soon > 0 && (
              <span className="fin-badge" data-tone="soon">
                {soon === 1 ? '1 betaling' : `${soon} betalingen`}
              </span>
            )}
          </div>
          {SHOWN[size] > 0 && (
            <ul className="widget-list fin-w-list">
              {upcoming.slice(0, SHOWN[size]).map((b) => (
                <li key={b.id}>
                  <span className="fin-avatar" aria-hidden="true">
                    {b.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="fin-w-name">
                    <span className="widget-clip">{b.name}</span>
                    <span className="widget-time">{formatDueShort(b.next_due)}</span>
                  </span>
                  <span className="fin-w-amount">{formatEuro(b.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {size === 'groot' && (
        <button className="settings-button widget-note-new" type="button" onClick={newBill}>
          <Plus size={16} weight="bold" /> Vaste last
        </button>
      )}
    </WidgetCard>
  )
}
