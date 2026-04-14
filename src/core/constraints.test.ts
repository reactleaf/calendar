import { Temporal } from '@js-temporal/polyfill'
import { describe, expect, it } from 'vitest'
import { clampDateValue, isDateDisabled } from './constraints'

describe('constraints', () => {
  it('disables by min/max on calendar day', () => {
    const min = Temporal.PlainDate.from('2024-06-10')
    const max = Temporal.PlainDate.from('2024-06-20')
    expect(isDateDisabled(Temporal.PlainDate.from('2024-06-09'), { minDate: min })).toBe(true)
    expect(isDateDisabled(Temporal.PlainDate.from('2024-06-10'), { minDate: min })).toBe(false)
    expect(isDateDisabled(Temporal.PlainDate.from('2024-06-21'), { maxDate: max })).toBe(true)
  })

  it('disables by weekday (0 Sunday)', () => {
    const sat = Temporal.PlainDate.from('2024-06-15')
    expect(sat.dayOfWeek).toBe(6)
    expect(isDateDisabled(sat, { disabledDays: [6] })).toBe(true)
    expect(isDateDisabled(sat, { disabledDays: [0] })).toBe(false)
  })

  it('disables by disabledDates list', () => {
    const d = Temporal.PlainDate.from('2024-06-12')
    expect(
      isDateDisabled(d, {
        disabledDates: [Temporal.PlainDateTime.from('2024-06-12T08:00:00')],
      }),
    ).toBe(true)
  })

  it('clampDateValue preserves wall time for PlainDateTime', () => {
    const value = Temporal.PlainDateTime.from('2024-06-25T15:30:00')
    const min = Temporal.PlainDate.from('2024-06-10')
    const max = Temporal.PlainDate.from('2024-06-20')
    const clamped = clampDateValue(value, min, max)
    expect(clamped instanceof Temporal.PlainDateTime).toBe(true)
    if (clamped instanceof Temporal.PlainDateTime) {
      expect(clamped.toString()).toBe('2024-06-20T15:30:00')
    }
  })

  it('treats Feb 29 as disabled when max is Feb 28 in a leap year', () => {
    const feb29 = Temporal.PlainDate.from('2024-02-29')
    const max = Temporal.PlainDate.from('2024-02-28')
    expect(isDateDisabled(feb29, { maxDate: max })).toBe(true)
    expect(isDateDisabled(Temporal.PlainDate.from('2024-02-28'), { maxDate: max })).toBe(false)
  })

  it('allows only the single day when min and max are the same', () => {
    const day = Temporal.PlainDate.from('2025-07-04')
    expect(isDateDisabled(day, { minDate: day, maxDate: day })).toBe(false)
    expect(isDateDisabled(Temporal.PlainDate.from('2025-07-03'), { minDate: day, maxDate: day })).toBe(true)
    expect(isDateDisabled(Temporal.PlainDate.from('2025-07-05'), { minDate: day, maxDate: day })).toBe(true)
  })

  it('compares PlainDateTime by calendar day for min/max', () => {
    const late = Temporal.PlainDateTime.from('2024-02-29T23:59:00')
    const max = Temporal.PlainDate.from('2024-02-28')
    expect(isDateDisabled(late, { maxDate: max })).toBe(true)
  })
})
