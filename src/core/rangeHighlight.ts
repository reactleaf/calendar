import { calendarDayStamp, type PlainDay } from './calendarDate'

export function isDayInInclusiveRange(day: PlainDay, start: PlainDay, end: PlainDay): boolean {
  const x = calendarDayStamp(day)
  const a = calendarDayStamp(start)
  const b = calendarDayStamp(end)
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return x >= lo && x <= hi
}
