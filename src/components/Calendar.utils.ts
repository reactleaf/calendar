import { Temporal } from '@js-temporal/polyfill'

export const WEEK_STARTS_ON = 0 as const
export const PRELOAD_MONTH_COUNT = 8
export const PAGE_MONTH_COUNT = 6
export const EDGE_THRESHOLD_PX = 220
export const DEFAULT_MIN_DATE = Temporal.PlainDate.from('1900-01-01')
export const DEFAULT_MAX_DATE = Temporal.PlainDate.from('2100-12-31')

export function monthKey(month: Temporal.PlainYearMonth): string {
  return `${month.year}-${String(month.month).padStart(2, '0')}`
}

export function weekdayLabels(locale: string): string[] {
  const sunday = Temporal.PlainDate.from({ year: 2026, month: 1, day: 4 })
  return Array.from({ length: 7 }, (_, i) =>
    sunday.add({ days: i }).toLocaleString(locale, { weekday: 'short' }),
  )
}

export function sameDay(a: Temporal.PlainDate, b: Temporal.PlainDate): boolean {
  return Temporal.PlainDate.compare(a, b) === 0
}

export function clampDate(
  value: Temporal.PlainDate,
  minDate: Temporal.PlainDate,
  maxDate: Temporal.PlainDate,
): Temporal.PlainDate {
  if (Temporal.PlainDate.compare(value, minDate) < 0) return minDate
  if (Temporal.PlainDate.compare(value, maxDate) > 0) return maxDate
  return value
}

export function compareMonth(a: Temporal.PlainYearMonth, b: Temporal.PlainYearMonth): number {
  return Temporal.PlainYearMonth.compare(a, b)
}

export function buildMonthWindow(
  center: Temporal.PlainYearMonth,
  minMonth: Temporal.PlainYearMonth,
  maxMonth: Temporal.PlainYearMonth,
  before = PRELOAD_MONTH_COUNT,
  after = PRELOAD_MONTH_COUNT,
): Temporal.PlainYearMonth[] {
  const out: Temporal.PlainYearMonth[] = []
  for (let i = before; i >= 1; i -= 1) {
    const candidate = center.subtract({ months: i })
    if (compareMonth(candidate, minMonth) >= 0) out.push(candidate)
  }
  out.push(center)
  for (let i = 1; i <= after; i += 1) {
    const candidate = center.add({ months: i })
    if (compareMonth(candidate, maxMonth) <= 0) out.push(candidate)
  }
  return out
}

export function monthRows(month: Temporal.PlainYearMonth): Temporal.PlainDate[][] {
  const first = month.toPlainDate({ day: 1 })
  const lead = (first.dayOfWeek % 7 - WEEK_STARTS_ON + 7) % 7
  const rows: Temporal.PlainDate[][] = []

  let day = 1
  let rowLen = lead === 0 ? 7 : 7 - lead

  while (day <= month.daysInMonth) {
    const remaining = month.daysInMonth - day + 1
    rowLen = Math.min(rowLen, remaining)
    const row: Temporal.PlainDate[] = []
    for (let i = 0; i < rowLen; i += 1) {
      row.push(Temporal.PlainDate.from({ year: month.year, month: month.month, day: day + i }))
    }
    rows.push(row)
    day += rowLen
    rowLen = 7
  }

  return rows
}

export function monthLabel(month: Temporal.PlainYearMonth, locale: string): string {
  return Temporal.PlainDate.from({ year: month.year, month: month.month, day: 1 }).toLocaleString(locale, {
    month: 'long',
    year: 'numeric',
  })
}
