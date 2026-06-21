import { describe, it, expect } from 'vitest'
import { ADULT_TABS, TEENS_TABS, buildTheme } from './tokens.js'

describe('ADULT_TABS / TEENS_TABS', () => {
  it('both personas define the same three tab keys', () => {
    expect(Object.keys(ADULT_TABS).sort()).toEqual(['comm', 'weight', 'yoga'])
    expect(Object.keys(TEENS_TABS).sort()).toEqual(['comm', 'weight', 'yoga'])
  })

  it('every tab has the fields buildTheme depends on', () => {
    for (const tabs of [ADULT_TABS, TEENS_TABS]) {
      for (const tab of Object.values(tabs)) {
        expect(tab).toHaveProperty('A')
        expect(tab).toHaveProperty('B')
        expect(tab).toHaveProperty('vivBg')
        expect(tab).toHaveProperty('fg')
        expect(tab).toHaveProperty('fgMid')
        expect(tab).toHaveProperty('fgSoft')
        expect(tab).toHaveProperty('fgGhost')
      }
    }
  })
})

describe('buildTheme', () => {
  it('dark mode uses a fixed near-black palette regardless of tab', () => {
    const yoga = buildTheme('dark', ADULT_TABS, 'yoga')
    const weight = buildTheme('dark', ADULT_TABS, 'weight')
    expect(yoga.mode).toBe('dark')
    expect(yoga.appBg).toBe('#06060f')
    expect(weight.appBg).toBe(yoga.appBg)
  })

  it('dark mode still ties accent colors to the tab', () => {
    const yoga = buildTheme('dark', ADULT_TABS, 'yoga')
    expect(yoga.acc).toBe(ADULT_TABS.yoga.A)
    const weight = buildTheme('dark', ADULT_TABS, 'weight')
    expect(weight.acc).toBe(ADULT_TABS.weight.A)
  })

  it('vivid mode uses the tab gradient as the app background', () => {
    const yoga = buildTheme('vivid', ADULT_TABS, 'yoga')
    expect(yoga.mode).toBe('vivid')
    expect(yoga.appBg).toBe(ADULT_TABS.yoga.vivBg)
  })

  it('vivid mode differs per tab (no shared hardcoded background)', () => {
    const yoga = buildTheme('vivid', ADULT_TABS, 'yoga')
    const comm = buildTheme('vivid', ADULT_TABS, 'comm')
    expect(yoga.appBg).not.toBe(comm.appBg)
  })

  it('works for the teens persona tab set too', () => {
    const theme = buildTheme('dark', TEENS_TABS, 'comm')
    expect(theme.acc).toBe(TEENS_TABS.comm.A)
  })
})
