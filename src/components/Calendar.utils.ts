import { Temporal } from '@js-temporal/polyfill'
import type { WeekStartsOn } from '../core/monthGrid'
import { weekStartToIsoDay } from '../core/monthGrid'
export const PRELOAD_MONTH_COUNT = 8
export const PAGE_MONTH_COUNT = 6
export const EDGE_THRESHOLD_PX = 220
export const DEFAULT_MIN_DATE = Temporal.PlainDate.from('1980-01-01')
export const DEFAULT_MAX_DATE = Temporal.PlainDate.from('2050-12-31')

/** `3.2rem` 기준(루트 16px 가정) — 가상 스크롤 추정 높이용 */
export const CALENDAR_ROW_HEIGHT_PX = Math.round(3.2 * 16)
export const CALENDAR_MONTH_BORDER_PX = 1

export function monthKey(month: Temporal.PlainYearMonth): string {
  return `${month.year}-${String(month.month).padStart(2, '0')}`
}

export function dayStamp(date: Temporal.PlainDate): number {
  return date.year * 10000 + date.month * 100 + date.day
}

export function plainDateFromDayStamp(stamp: number): Temporal.PlainDate {
  const year = Math.floor(stamp / 10000)
  const month = Math.floor((stamp % 10000) / 100)
  const day = stamp % 100
  return Temporal.PlainDate.from({ year, month, day })
}

/** @param weekStartsOn — 0=일 … 6=토. 열 순서와 동일하게 라벨을 회전한다. */
export function weekdayLabels(locale: string, weekStartsOn: WeekStartsOn = 0): string[] {
  const sunday = Temporal.PlainDate.from({ year: 2026, month: 1, day: 4 })
  const base = Array.from({ length: 7 }, (_, i) =>
    String(sunday.add({ days: i }).toLocaleString(locale, { weekday: 'short' })),
  )
  return Array.from({ length: 7 }, (_, i) => base[(weekStartsOn + i) % 7]!)
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

export function monthsInclusiveCount(minMonth: Temporal.PlainYearMonth, maxMonth: Temporal.PlainYearMonth): number {
  return (maxMonth.year - minMonth.year) * 12 + (maxMonth.month - minMonth.month) + 1
}

export function monthAtOffset(minMonth: Temporal.PlainYearMonth, index: number): Temporal.PlainYearMonth {
  return minMonth.add({ months: index })
}

export function monthIndexFromMin(minMonth: Temporal.PlainYearMonth, month: Temporal.PlainYearMonth): number {
  return (month.year - minMonth.year) * 12 + (month.month - minMonth.month)
}

function monthGridSizing(
  month: Temporal.PlainYearMonth,
  weekStartsOn: WeekStartsOn = 0,
): {
  rowCount: number
  firstPartial: boolean
} {
  const dim = month.daysInMonth
  const first = month.toPlainDate({ day: 1 })
  const lead = (first.dayOfWeek - weekStartToIsoDay(weekStartsOn) + 7) % 7
  const firstRowLen = lead === 0 ? Math.min(7, dim) : Math.min(7 - lead, dim)
  const rowCount = dim <= firstRowLen ? 1 : 1 + Math.ceil((dim - firstRowLen) / 7)
  return { rowCount, firstPartial: firstRowLen !== 7 }
}

/** `monthRows(month, weekStartsOn).length` 과 동일 — 날짜 배열을 만들지 않음 (가상 스크롤 사이즈 추정용) */
export function monthRowCount(month: Temporal.PlainYearMonth, weekStartsOn: WeekStartsOn = 0): number {
  return monthGridSizing(month, weekStartsOn).rowCount
}

export function estimateMonthBlockHeightPx(
  month: Temporal.PlainYearMonth,
  monthIndex = 0,
  weekStartsOn: WeekStartsOn = 0,
): number {
  const { rowCount, firstPartial } = monthGridSizing(month, weekStartsOn)
  const overlap = monthIndex > 0 && firstPartial ? CALENDAR_ROW_HEIGHT_PX : 0
  return rowCount * CALENDAR_ROW_HEIGHT_PX + CALENDAR_MONTH_BORDER_PX - overlap
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

export function monthRows(month: Temporal.PlainYearMonth, weekStartsOn: WeekStartsOn = 0): Temporal.PlainDate[][] {
  const first = month.toPlainDate({ day: 1 })
  const lead = (first.dayOfWeek - weekStartToIsoDay(weekStartsOn) + 7) % 7
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

export function monthShortLabel(month: Temporal.PlainYearMonth, locale: string): string {
  return Temporal.PlainDate.from({ year: month.year, month: month.month, day: 1 }).toLocaleString(locale, {
    month: 'short',
  })
}

/** `react-infinite-calendar` 의 `todayLabel.short` 에 해당 — 선택 셀 상단에 월 대신 표시 */
export function todayWordLabel(locale: string): string {
  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'day')
  } catch {
    return 'Today'
  }
}
