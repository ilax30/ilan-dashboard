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
})
