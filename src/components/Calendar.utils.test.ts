import { Temporal } from '@js-temporal/polyfill'
import { describe, expect, it } from 'vitest'
import {
  CALENDAR_MONTH_BORDER_PX,
  CALENDAR_ROW_HEIGHT_PX,
  estimateMonthBlockHeightPx,
  monthRowCount,
  monthRows,
} from './Calendar.utils'

describe('monthRowCount', () => {
  it('matches monthRows length for every month in a wide year range', () => {
    for (let y = 1980; y <= 2050; y += 1) {
      for (let m = 1; m <= 12; m += 1) {
        const ym = Temporal.PlainYearMonth.from({ year: y, month: m })
        expect(monthRowCount(ym)).toBe(monthRows(ym).length)
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
    for (const ym of samples) {
      const rows = monthRows(ym)
      const firstPartial = rows[0] ? rows[0].length !== 7 : false
      for (let monthIndex = 0; monthIndex < 3; monthIndex += 1) {
        const overlap = monthIndex > 0 && firstPartial ? CALENDAR_ROW_HEIGHT_PX : 0
        const fromRows = rows.length * CALENDAR_ROW_HEIGHT_PX + CALENDAR_MONTH_BORDER_PX - overlap
        expect(estimateMonthBlockHeightPx(ym, monthIndex)).toBe(fromRows)
      }
    }
  })
})
