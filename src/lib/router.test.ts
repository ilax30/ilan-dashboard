import { describe, expect, it } from 'vitest'
import { parseRoute } from './router'

describe('parseRoute', () => {
  it('herkent het dashboard en de to-do pagina', () => {
    expect(parseRoute('')).toBe('/')
    expect(parseRoute('#/')).toBe('/')
    expect(parseRoute('#/todo')).toBe('/todo')
  })
  it('valt bij onbekende routes terug op het dashboard', () => {
    expect(parseRoute('#/bestaat-niet')).toBe('/')
    expect(parseRoute('#todo')).toBe('/')
  })
  it("herkent de onderwerp-pagina's", () => {
    expect(parseRoute('#/doelen')).toBe('/doelen')
    expect(parseRoute('#/financien')).toBe('/financien')
    expect(parseRoute('#/notities')).toBe('/notities')
    expect(parseRoute('#/projecten')).toBe('/projecten')
    expect(parseRoute('#/onbekend')).toBe('/')
  })
})
