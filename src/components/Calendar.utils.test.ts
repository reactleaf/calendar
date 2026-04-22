import { Temporal } from '@js-temporal/polyfill'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CALENDAR_ROW_HEIGHT_PX,
  estimateMonthBlockHeightPx,
  monthRowCount,
  monthRows,
  weekdayLabels,
} from './Calendar.utils'

describe('weekdayLabels', () => {
  it('회전시켜 weekStartsOn 열 순서와 맞춘다', () => {
    const sunFirst = weekdayLabels('en-US', 0)
    const monFirst = weekdayLabels('en-US', 1)
    expect(monFirst[0]).toBe(sunFirst[1])
    expect(monFirst[6]).toBe(sunFirst[0])
  })
})

describe('monthRowCount', () => {
  it('matches monthRows length for every month in a wide year range', () => {
    for (const weekStartsOn of [0, 1] as const) {
      for (let y = 1980; y <= 2050; y += 1) {
        for (let m = 1; m <= 12; m += 1) {
          const ym = Temporal.PlainYearMonth.from({ year: y, month: m })
          expect(monthRowCount(ym, weekStartsOn)).toBe(monthRows(ym, weekStartsOn).length)
        }
      }
    }
  })

  it('matches previous height model built from monthRows (sample months)', () => {
    const samples = [
      Temporal.PlainYearMonth.from({ year: 2024, month: 2 }),
      Temporal.PlainYearMonth.from({ year: 2026, month: 1 }),
      Temporal.PlainYearMonth.from({ year: 1980, month: 1 }),
      Temporal.PlainYearMonth.from({ year: 2050, month: 12 }),
    ]
    for (const weekStartsOn of [0, 1] as const) {
      for (const ym of samples) {
        const rows = monthRows(ym, weekStartsOn)
        const firstPartial = rows[0] ? rows[0].length !== 7 : false
        for (let monthIndex = 0; monthIndex < 3; monthIndex += 1) {
          const overlap = monthIndex > 0 && firstPartial ? DEFAULT_CALENDAR_ROW_HEIGHT_PX : 0
          const fromRows = rows.length * DEFAULT_CALENDAR_ROW_HEIGHT_PX - overlap
          expect(estimateMonthBlockHeightPx(ym, monthIndex, weekStartsOn)).toBe(fromRows)
        }
      }
    }
  })
})
