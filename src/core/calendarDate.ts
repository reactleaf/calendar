import { Temporal } from '@js-temporal/polyfill'

export type PlainDay = Temporal.PlainDate | Temporal.PlainDateTime

export function toPlainDate(value: PlainDay): Temporal.PlainDate {
  if (value instanceof Temporal.PlainDate) return value
  return value.toPlainDate()
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
