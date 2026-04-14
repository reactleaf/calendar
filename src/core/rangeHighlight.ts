import { Temporal } from '@js-temporal/polyfill'
import { toPlainDate, type PlainDay } from './calendarDate'

export function isDayInInclusiveRange(day: PlainDay, start: PlainDay, end: PlainDay): boolean {
  const x = toPlainDate(day)
  const a = toPlainDate(start)
  const b = toPlainDate(end)
  const lo = Temporal.PlainDate.compare(a, b) <= 0 ? a : b
  const hi = Temporal.PlainDate.compare(a, b) <= 0 ? b : a
  return Temporal.PlainDate.compare(x, lo) >= 0 && Temporal.PlainDate.compare(x, hi) <= 0
}
