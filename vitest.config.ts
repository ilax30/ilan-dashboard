import { defineConfig } from 'vitest/config'

// Tests draaien altijd in Amsterdamse tijd, zodat zomer-/wintertijd-gevallen op elke machine hetzelfde zijn.
export default defineConfig({
  test: {
    env: { TZ: 'Europe/Amsterdam' },
  },
})
