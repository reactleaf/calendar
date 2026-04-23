import { Temporal } from '@js-temporal/polyfill'

function dayStamp(day: Temporal.PlainDate): number {
  return day.year * 10000 + day.month * 100 + day.day
}

export function isDayInInclusiveRange(
  day: Temporal.PlainDate,
  start: Temporal.PlainDate,
  end: Temporal.PlainDate,
): boolean {
  const x = dayStamp(day)
  const a = dayStamp(start)
  const b = dayStamp(end)
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return x >= lo && x <= hi
}
