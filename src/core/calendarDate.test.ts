import { Temporal } from '@js-temporal/polyfill'
import { describe, expect, it } from 'vitest'
import { compareCalendarDays, sameCalendarDay, selectionEquals, toPlainDate } from './calendarDate'

describe('calendarDate', () => {
  it('toPlainDate strips time', () => {
    const dt = Temporal.PlainDateTime.from('2024-06-15T14:30:00')
    expect(toPlainDate(dt).equals(Temporal.PlainDate.from('2024-06-15'))).toBe(true)
  })

  it('sameCalendarDay matches across PlainDate and PlainDateTime', () => {
    const d = Temporal.PlainDate.from('2024-06-15')
    const dt = Temporal.PlainDateTime.from('2024-06-15T09:00:00')
    expect(sameCalendarDay(d, dt)).toBe(true)
  })

  it('compareCalendarDays compares by calendar day', () => {
    const a = Temporal.PlainDateTime.from('2024-06-15T23:59:00')
    const b = Temporal.PlainDate.from('2024-06-16')
    expect(compareCalendarDays(a, b)).toBeLessThan(0)
  })

  it('selectionEquals compares full datetime when both are PlainDateTime', () => {
    const a = Temporal.PlainDateTime.from('2024-06-15T10:00:00')
    const b = Temporal.PlainDateTime.from('2024-06-15T11:00:00')
    expect(selectionEquals(a, b)).toBe(false)
    expect(selectionEquals(a, Temporal.PlainDateTime.from('2024-06-15T10:00:00'))).toBe(true)
  })

  it('compareCalendarDays orders across month and year boundaries', () => {
    expect(
      compareCalendarDays(Temporal.PlainDate.from('2023-12-31'), Temporal.PlainDate.from('2024-01-01')),
    ).toBeLessThan(0)
    expect(
      compareCalendarDays(Temporal.PlainDate.from('2024-02-28'), Temporal.PlainDate.from('2024-03-01')),
    ).toBeLessThan(0)
  })
})
