import { Temporal } from '@js-temporal/polyfill'
import type { DateValue } from './api.types'
import { compareCalendarDays, toPlainDate, type PlainDay } from './calendarDate'

export interface DisableConstraints {
  minDate?: PlainDay
  maxDate?: PlainDay
  /** `minDate`/`maxDate` 범위 밖이 아닐 때 추가로 막을 날. */
  isDateDisabled?: (date: Temporal.PlainDate) => boolean
}

interface DisableConstraintsOptions {
  minDate?: DateValue
  maxDate?: DateValue
  isDateDisabled?: (date: Temporal.PlainDate) => boolean
}

export function disableConstraintsFromOptions(input: DisableConstraintsOptions): DisableConstraints {
  return {
    minDate: input.minDate ? toPlainDate(input.minDate) : undefined,
    maxDate: input.maxDate ? toPlainDate(input.maxDate) : undefined,
    isDateDisabled: input.isDateDisabled,
  }
}

/**
 * 날짜가 선택/포커스 이동 등에서 막혀야 하는지 판정한다.
 * `minDate`/`maxDate`는 캘린더의 스크롤 가능 월 범위에도 쓰이며, 여기서는 달력 일 단위로 범위 밖이면 비활성으로 본다.
 */
export function isDateDisabled(date: PlainDay, constraints: DisableConstraints): boolean {
  const plain = toPlainDate(date)

  if (constraints.minDate !== undefined && compareCalendarDays(plain, constraints.minDate) < 0) {
    return true
  }
  if (constraints.maxDate !== undefined && compareCalendarDays(plain, constraints.maxDate) > 0) {
    return true
  }
  if (constraints.isDateDisabled?.(plain)) {
    return true
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
