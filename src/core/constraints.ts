import { Temporal } from '@js-temporal/polyfill'
import { compareCalendarDays, sameCalendarDay, toPlainDate, type PlainDay } from './calendarDate'

export interface DisableConstraints {
  minDate?: PlainDay
  maxDate?: PlainDay
  disabledDates?: readonly PlainDay[]
  disabledDays?: readonly number[]
}

function jsDayOfWeek(date: Temporal.PlainDate): number {
  return date.dayOfWeek === 7 ? 0 : date.dayOfWeek
}

export function isDateDisabled(date: PlainDay, constraints: DisableConstraints): boolean {
  const plain = toPlainDate(date)
  const { minDate, maxDate, disabledDates, disabledDays } = constraints

  if (minDate !== undefined && compareCalendarDays(date, minDate) < 0) return true
  if (maxDate !== undefined && compareCalendarDays(date, maxDate) > 0) return true

  if (disabledDays !== undefined && disabledDays.length > 0) {
    const dow = jsDayOfWeek(plain)
    if (disabledDays.includes(dow)) return true
  }

  if (disabledDates !== undefined && disabledDates.length > 0) {
    for (const d of disabledDates) {
      if (sameCalendarDay(d, date)) return true
    }
  }

  return false
}

export function clampDateValue(
  value: PlainDay,
  min?: PlainDay,
  max?: PlainDay,
): Temporal.PlainDate | Temporal.PlainDateTime {
  const day = toPlainDate(value)
  const minDay = min === undefined ? undefined : toPlainDate(min)
  const maxDay = max === undefined ? undefined : toPlainDate(max)

  let clampedDay = day
  if (minDay !== undefined && Temporal.PlainDate.compare(clampedDay, minDay) < 0) {
    clampedDay = minDay
  }
  if (maxDay !== undefined && Temporal.PlainDate.compare(clampedDay, maxDay) > 0) {
    clampedDay = maxDay
  }

  if (value instanceof Temporal.PlainDateTime) {
    return Temporal.PlainDateTime.from({
      year: clampedDay.year,
      month: clampedDay.month,
      day: clampedDay.day,
      hour: value.hour,
      minute: value.minute,
      second: value.second,
      millisecond: value.millisecond,
      microsecond: value.microsecond,
      nanosecond: value.nanosecond,
    })
  }

  return clampedDay
}
