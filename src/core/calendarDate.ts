import { Temporal } from '@js-temporal/polyfill'

export type PlainDay = Temporal.PlainDate | Temporal.PlainDateTime

export function toPlainDate(value: PlainDay): Temporal.PlainDate {
  if (value instanceof Temporal.PlainDate) return value
  return value.toPlainDate()
}

/** 달력 날짜 비교·범위 판별용 정수 키 (`YYYYMMDD` 형태) */
export function calendarDayStamp(value: PlainDay): number {
  const d = toPlainDate(value)
  return d.year * 10000 + d.month * 100 + d.day
}

export function compareCalendarDays(a: PlainDay, b: PlainDay): Temporal.ComparisonResult {
  return Temporal.PlainDate.compare(toPlainDate(a), toPlainDate(b))
}

export function sameCalendarDay(a: PlainDay, b: PlainDay): boolean {
  return toPlainDate(a).equals(toPlainDate(b))
}

export function selectionEquals(a: PlainDay | null, b: PlainDay): boolean {
  if (a === null) return false
  if (a instanceof Temporal.PlainDateTime && b instanceof Temporal.PlainDateTime) {
    return a.equals(b)
  }
  return sameCalendarDay(a, b)
}

export function addCalendarDays(value: PlainDay, days: number): PlainDay {
  if (value instanceof Temporal.PlainDate) {
    return value.add({ days })
  }
  const time = value.toPlainTime()
  return value.toPlainDate().add({ days }).toPlainDateTime(time)
}

export function toMonthStartPlain(value: PlainDay): Temporal.PlainDate {
  const d = toPlainDate(value)
  return Temporal.PlainDate.from({ year: d.year, month: d.month, day: 1 })
}

/** `includeTime`이면 같은 달력 날의 00:00 `PlainDateTime`, 아니면 `PlainDate` */
export function toSelectionValue(day: PlainDay, includeTime?: boolean): PlainDay {
  if (!includeTime) return toPlainDate(day)
  if (day instanceof Temporal.PlainDateTime) return day
  const d = toPlainDate(day)
  return Temporal.PlainDateTime.from({
    year: d.year,
    month: d.month,
    day: d.day,
    hour: 0,
    minute: 0,
    second: 0,
  })
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  const n = Math.trunc(value)
  if (n < min) return min
  if (n > max) return max
  return n
}

export function normalizeMinuteStep(step?: number): number {
  if (!step || !Number.isFinite(step)) return 1
  const s = Math.trunc(step)
  if (s < 1) return 1
  if (s > 30) return 30
  return s
}

export function normalizeTimeParts(hour: number, minute: number, minuteStep?: number): { hour: number; minute: number } {
  const safeHour = clampInt(hour, 0, 23)
  const step = normalizeMinuteStep(minuteStep)
  const safeMinute = clampInt(Math.round(minute / step) * step, 0, 59)
  return { hour: safeHour, minute: safeMinute }
}

export function withTime(day: PlainDay, hour: number, minute: number, minuteStep?: number): Temporal.PlainDateTime {
  const base = toPlainDate(day)
  const next = normalizeTimeParts(hour, minute, minuteStep)
  return Temporal.PlainDateTime.from({
    year: base.year,
    month: base.month,
    day: base.day,
    hour: next.hour,
    minute: next.minute,
    second: 0,
  })
}
