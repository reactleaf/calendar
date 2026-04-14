import { Temporal } from '@js-temporal/polyfill'
import { describe, expect, it } from 'vitest'
import { rangePointerDown, rangePointerPreview, sortRangeEndpoints } from './rangePointer'

describe('rangePointer', () => {
  it('sorts reversed endpoints', () => {
    const a = Temporal.PlainDate.from('2024-06-20')
    const b = Temporal.PlainDate.from('2024-06-10')
    const sorted = sortRangeEndpoints(a, b)
    expect(sorted.start.toString()).toBe('2024-06-10')
    expect(sorted.end.toString()).toBe('2024-06-20')
  })

  it('commits on second click', () => {
    const idle = { kind: 'idle' as const }
    const first = rangePointerDown(idle, Temporal.PlainDate.from('2024-06-10'))
    expect(first.committed).toBeNull()
    expect(first.next).toEqual({ kind: 'anchored', anchor: Temporal.PlainDate.from('2024-06-10') })

    const second = rangePointerDown(first.next, Temporal.PlainDate.from('2024-06-05'))
    expect(second.next).toEqual({ kind: 'idle' })
    expect(second.committed?.start.toString()).toBe('2024-06-05')
    expect(second.committed?.end.toString()).toBe('2024-06-10')
  })

  it('preview while anchored', () => {
    const state = { kind: 'anchored' as const, anchor: Temporal.PlainDate.from('2024-06-10') }
    const preview = rangePointerPreview(state, Temporal.PlainDate.from('2024-06-15'))
    expect(preview?.start.toString()).toBe('2024-06-10')
    expect(preview?.end.toString()).toBe('2024-06-15')
    expect(rangePointerPreview(state, null)).toBeNull()
  })

  it('sorts range when anchor and end are in different months', () => {
    const idle = { kind: 'idle' as const }
    const first = rangePointerDown(idle, Temporal.PlainDate.from('2024-03-05'))
    const second = rangePointerDown(first.next, Temporal.PlainDate.from('2024-02-10'))
    expect(second.committed?.start.toString()).toBe('2024-02-10')
    expect(second.committed?.end.toString()).toBe('2024-03-05')
  })

  it('commits a single-day range when second click matches anchor', () => {
    const idle = { kind: 'idle' as const }
    const first = rangePointerDown(idle, Temporal.PlainDate.from('2024-06-10'))
    const second = rangePointerDown(first.next, Temporal.PlainDate.from('2024-06-10'))
    expect(second.committed?.start.toString()).toBe('2024-06-10')
    expect(second.committed?.end.toString()).toBe('2024-06-10')
  })

  it('previews across a year boundary', () => {
    const state = { kind: 'anchored' as const, anchor: Temporal.PlainDate.from('2024-12-30') }
    const preview = rangePointerPreview(state, Temporal.PlainDate.from('2025-01-02'))
    expect(preview?.start.toString()).toBe('2024-12-30')
    expect(preview?.end.toString()).toBe('2025-01-02')
  })
})
