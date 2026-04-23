import { Temporal } from '@js-temporal/polyfill'
import { toPlainDate } from '../core'
import type { WeekStartsOn } from '../core/monthGrid'
import { weekStartToIsoDay } from '../core/monthGrid'
import type { CalendarSelectionSnapshot } from './Calendar.types'
export const PRELOAD_MONTH_COUNT = 8
export const PAGE_MONTH_COUNT = 6
export const EDGE_THRESHOLD_PX = 220
export const DEFAULT_MIN_DATE = Temporal.PlainDate.from('1980-01-01')
export const DEFAULT_MAX_DATE = Temporal.PlainDate.from('2050-12-31')

/** CSS `--calendar-row-height` 와 맞춘 기본 fallback. */
export const DEFAULT_CALENDAR_ROW_HEIGHT_PX = 52

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
  value: Temporal.PlainDate | Temporal.PlainDateTime,
  minDate: Temporal.PlainDate,
  maxDate: Temporal.PlainDate,
): Temporal.PlainDate {
  if (Temporal.PlainDate.compare(value, minDate) < 0) return minDate
  if (Temporal.PlainDate.compare(value, maxDate) > 0) return maxDate
  return toPlainDate(value)
}

export function compareMonth(a: Temporal.PlainYearMonth, b: Temporal.PlainYearMonth): number {
  return Temporal.PlainYearMonth.compare(a, b)
}

export function monthsInclusiveCount(minMonth: Temporal.PlainYearMonth, maxMonth: Temporal.PlainYearMonth): number {
  return (maxMonth.year - minMonth.year) * 12 + (maxMonth.month - minMonth.month) + 1
}

/**
 * `Temporal.PlainYearMonth.add({ months })` 대신 숫자 산술로 목표 연/월을 계산한다.
 * 가상화 경로처럼 동일 기준 월에서 대량 호출될 때 polyfill 오버헤드를 줄이기 위한 fast path.
 */
export function plainYearMonthAt(baseYear: number, baseMonth: number, offsetMonths: number): Temporal.PlainYearMonth {
  const totalMonths = baseYear * 12 + (baseMonth - 1) + offsetMonths
  const year = Math.floor(totalMonths / 12)
  const month = totalMonths - year * 12 + 1
  return Temporal.PlainYearMonth.from({ year, month })
}

export function monthAtOffset(minMonth: Temporal.PlainYearMonth, index: number): Temporal.PlainYearMonth {
  return plainYearMonthAt(minMonth.year, minMonth.month, index)
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
  rowHeightPx = DEFAULT_CALENDAR_ROW_HEIGHT_PX,
): number {
  const { rowCount, firstPartial } = monthGridSizing(month, weekStartsOn)
  const overlap = monthIndex > 0 && firstPartial ? rowHeightPx : 0
  return rowCount * rowHeightPx - overlap
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

export function getInitialMonth(
  selectionSnapshot: CalendarSelectionSnapshot,
  minDate: Temporal.PlainDate,
  maxDate: Temporal.PlainDate,
): Temporal.PlainYearMonth {
  const today = Temporal.Now.plainDateISO()

  switch (selectionSnapshot.mode) {
    case 'single': {
      const initialDate = selectionSnapshot.value ?? today
      const clamped = clampDate(initialDate, minDate, maxDate)
      return toPlainDate(clamped).toPlainYearMonth()
    }
    case 'multiple': {
      const initialDate = selectionSnapshot.values[0] ?? today
      const clamped = clampDate(initialDate, minDate, maxDate)
      return toPlainDate(clamped).toPlainYearMonth()
    }

    case 'range': {
      const initialDate = selectionSnapshot.value.end ?? today
      const clamped = clampDate(initialDate, minDate, maxDate)
      return toPlainDate(clamped).toPlainYearMonth()
    }

    default:
      return Temporal.PlainYearMonth.from(minDate)
  }
}
