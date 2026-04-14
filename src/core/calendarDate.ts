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
