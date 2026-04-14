import { Temporal } from '@js-temporal/polyfill'
import { describe, expect, it } from 'vitest'
import { getMonthGrid } from './monthGrid'

describe('monthGrid', () => {
  it('includes every day of the month exactly once', () => {
    const ym = Temporal.PlainYearMonth.from({ year: 2024, month: 2 })
    const grid = getMonthGrid(ym, 1)
    const inMonth = grid.flat().filter((c) => c.inCurrentMonth)
    expect(inMonth.length).toBe(29)
    const days = new Set(inMonth.map((c) => c.date.day))
    expect(days.size).toBe(29)
  })

  it('uses 28 days for non-leap February', () => {
    const ym = Temporal.PlainYearMonth.from({ year: 2023, month: 2 })
    const inMonth = getMonthGrid(ym, 1)
      .flat()
      .filter((c) => c.inCurrentMonth)
    expect(inMonth.length).toBe(28)
  })

  it('marks leading and trailing cells outside the target month', () => {
    const ym = Temporal.PlainYearMonth.from({ year: 2025, month: 3 })
    const cells = getMonthGrid(ym, 0).flat()
    const inMarch = cells.filter((c) => c.inCurrentMonth)
    const outMarch = cells.filter((c) => !c.inCurrentMonth)
    expect(inMarch.length).toBe(31)
    expect(outMarch.length).toBeGreaterThan(0)
    expect(outMarch.every((c) => c.date.month !== 3 || c.date.year !== 2025)).toBe(true)
  })

  it('aligns weeks to weekStartsOn', () => {
    const ym = Temporal.PlainYearMonth.from({ year: 2024, month: 1 })
    const grid = getMonthGrid(ym, 1)
    const row0 = grid[0]
    const cell00 = row0?.[0]
    expect(cell00).toBeDefined()
    expect(cell00!.date.equals(Temporal.PlainDate.from('2024-01-01'))).toBe(true)
  })
})
