import { describe, expect, it } from 'vitest'
import { DEFAULT_LAYOUT, normalizeLayout, swapSlots, type Layout, type WidgetId } from './layout'

const ALL: WidgetId[] = ['agenda', 'todo', 'doelen', 'financien', 'notities', 'projecten']
const ids = (l: Layout) => [l.groot, l.middel, ...l.klein]

describe('swapSlots', () => {
  it('ruilt een kleine tegel met de grote plek', () => {
    const l = swapSlots(DEFAULT_LAYOUT, 'groot', 1)
    expect(l.groot).toBe('doelen')
    expect(l.klein[1]).toBe('agenda')
    expect(DEFAULT_LAYOUT.groot).toBe('agenda') // origineel blijft ongewijzigd
  })
  it('ruilt middel met een kleine plek', () => {
    const l = swapSlots(DEFAULT_LAYOUT, 3, 'middel')
    expect(l.middel).toBe('projecten')
    expect(l.klein[3]).toBe('todo')
  })
  it('doet niets bij dezelfde plek', () => {
    expect(swapSlots(DEFAULT_LAYOUT, 'middel', 'middel')).toEqual(DEFAULT_LAYOUT)
  })
})

describe('normalizeLayout', () => {
  it('geeft de standaardindeling bij niets of rommel', () => {
    expect(normalizeLayout(null)).toEqual(DEFAULT_LAYOUT)
    expect(normalizeLayout('kapot')).toEqual(DEFAULT_LAYOUT)
    expect(normalizeLayout({ groot: 42 })).toEqual(DEFAULT_LAYOUT)
  })
  it('maakt van dubbele, onbekende en ontbrekende tegels een geldige indeling', () => {
    const l = normalizeLayout({ groot: 'todo', middel: 'todo', klein: ['x', 'agenda'] })
    expect(l.groot).toBe('todo')
    expect(l.klein).toHaveLength(4)
    expect([...ids(l)].sort()).toEqual([...ALL].sort())
  })
  it('laat een geldige indeling ongemoeid', () => {
    const custom: Layout = { groot: 'notities', middel: 'agenda', klein: ['todo', 'doelen', 'financien', 'projecten'] }
    expect(normalizeLayout(custom)).toEqual(custom)
  })
})
