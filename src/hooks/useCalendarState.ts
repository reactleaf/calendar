import { Temporal } from '@js-temporal/polyfill'
import { useCallback, useRef, useState } from 'react'
import type { CalendarMode, DateValue, MonthValue } from '../core/api.types'
import { addCalendarDays, toMonthStartPlain, toPlainDate, type PlainDay } from '../core/calendarDate'
import { clampDateValue } from '../core/constraints'

export interface UseCalendarStateOptions {
  mode: CalendarMode
  minDate?: DateValue
  maxDate?: DateValue
  initialFocusedDate?: DateValue | null
  initialVisibleMonth?: DateValue | null
  keyboardNavigation?: boolean
  includeTime?: boolean
  minuteStep?: number
  onFocusedDateChange?: (date: DateValue | null) => void
  onMonthChange?: (monthStart: MonthValue) => void
}

export interface UseCalendarStateResult {
  focusedDate: DateValue | null
  visibleMonth: DateValue
  setFocusedDate: (date: DateValue | null) => void
  setVisibleMonth: (monthStart: DateValue) => void
  focusNextDay: () => void
  focusPrevDay: () => void
  focusNextWeek: () => void
  focusPrevWeek: () => void
}

function clampDay(value: PlainDay | null, min?: DateValue, max?: DateValue): PlainDay | null {
  if (value === null) return null
  if (min === undefined && max === undefined) return value
  return clampDateValue(value, min, max) as PlainDay
}

function defaultInitialMonth(options: UseCalendarStateOptions): Temporal.PlainDate {
  if (options.initialVisibleMonth) return toMonthStartPlain(options.initialVisibleMonth)
  if (options.initialFocusedDate) return toMonthStartPlain(options.initialFocusedDate)
  if (options.minDate) return toMonthStartPlain(options.minDate)
  return toMonthStartPlain(Temporal.Now.plainDateISO())
}

export function useCalendarState(options: UseCalendarStateOptions): UseCalendarStateResult {
  const { minDate, maxDate, initialFocusedDate, onFocusedDateChange, onMonthChange } = options

  const [visibleMonth, setVisibleMonthState] = useState<Temporal.PlainDate>(() => defaultInitialMonth(options))
  const [focusedDate, setFocusedDateState] = useState<DateValue | null>(() =>
    clampDay(initialFocusedDate ?? null, minDate, maxDate),
  )

  const lastEmittedMonth = useRef<Temporal.PlainYearMonth | null>(null)

  const emitMonthIfNeeded = useCallback(
    (day: PlainDay) => {
      const ym = toPlainDate(day).toPlainYearMonth()
      if (lastEmittedMonth.current === null || !ym.equals(lastEmittedMonth.current)) {
        lastEmittedMonth.current = ym
        onMonthChange?.(ym)
      }
    },
    [onMonthChange],
  )

  const setFocusedDate = useCallback(
    (date: DateValue | null) => {
      const next = clampDay(date, minDate, maxDate)
      setFocusedDateState(next)
      onFocusedDateChange?.(next)
      if (next !== null) {
        emitMonthIfNeeded(next)
      }
    },
    [emitMonthIfNeeded, maxDate, minDate, onFocusedDateChange],
  )

  const setVisibleMonth = useCallback(
    (monthStart: DateValue) => {
      const next = toMonthStartPlain(monthStart)
      setVisibleMonthState(next)
      emitMonthIfNeeded(next)
    },
    [emitMonthIfNeeded],
  )

  const moveFocusByDays = useCallback(
    (delta: number) => {
      setFocusedDateState((prev) => {
        const base: PlainDay = prev ?? visibleMonth
        const moved = addCalendarDays(base, delta)
        const next = clampDay(moved, minDate, maxDate)
        onFocusedDateChange?.(next)
        if (next !== null) emitMonthIfNeeded(next)
        return next
      })
    },
    [emitMonthIfNeeded, maxDate, minDate, onFocusedDateChange, visibleMonth],
  )

  const focusNextDay = useCallback(() => moveFocusByDays(1), [moveFocusByDays])
  const focusPrevDay = useCallback(() => moveFocusByDays(-1), [moveFocusByDays])
  const focusNextWeek = useCallback(() => moveFocusByDays(7), [moveFocusByDays])
  const focusPrevWeek = useCallback(() => moveFocusByDays(-7), [moveFocusByDays])

  return {
    focusedDate,
    visibleMonth,
    setFocusedDate,
    setVisibleMonth,
    focusNextDay,
    focusPrevDay,
    focusNextWeek,
    focusPrevWeek,
  }
}
