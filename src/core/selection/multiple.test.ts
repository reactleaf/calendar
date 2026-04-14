import { Temporal } from '@js-temporal/polyfill'
import { describe, expect, it } from 'vitest'
import { toggleMultipleSelection } from './multiple'

describe('toggleMultipleSelection', () => {
  it('toggles membership', () => {
    const a = Temporal.PlainDate.from('2024-06-10')
    const b = Temporal.PlainDate.from('2024-06-11')
    const first = toggleMultipleSelection([a], b, undefined)
    expect(first.changed).toBe(true)
    expect(first.next.map((d) => d.toString())).toEqual(['2024-06-10', '2024-06-11'])

    const second = toggleMultipleSelection(first.next, b, undefined)
    expect(second.changed).toBe(true)
    expect(second.next.map((d) => d.toString())).toEqual(['2024-06-10'])
  })

  it('respects maxSelections with ignore-new policy', () => {
    const a = Temporal.PlainDate.from('2024-06-10')
    const b = Temporal.PlainDate.from('2024-06-11')
    const c = Temporal.PlainDate.from('2024-06-12')
    const filled = toggleMultipleSelection([a, b], c, 2)
    expect(filled.changed).toBe(false)
    expect(filled.next.map((d) => d.toString())).toEqual(['2024-06-10', '2024-06-11'])
  })

  it('adds first selection from an empty list', () => {
    const d = Temporal.PlainDate.from('2024-12-31')
    const r = toggleMultipleSelection([], d, undefined)
    expect(r.changed).toBe(true)
    expect(r.next.map((x) => x.toString())).toEqual(['2024-12-31'])
  })
})
