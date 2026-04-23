import { Temporal } from '@js-temporal/polyfill'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import type { CalendarRuntime } from '../components/Calendar.types'
import { clampDate, DEFAULT_MAX_DATE, DEFAULT_MIN_DATE, monthsInclusiveCount, weekdayLabels } from '../components/Calendar.utils'
import type { CalendarSingleProps } from '../core/api.types'
import { toPlainDate } from '../core/calendarDate'
import { DEFAULT_CALENDAR_MESSAGES, defaultNavigatorLocale } from '../core/calendarLocale'
import { useCalendarSecondaryView } from './useCalendarSecondaryView'
import { useSingleSelection } from './useSingleSelection'

export function useCalendarSingleRuntime(props: CalendarSingleProps): CalendarRuntime {
  const {
    locale: localeProp,
    weekStartsOn: weekStartsOnProp,
    messages: messagesProp,
    minDate,
    maxDate,
    isDateDisabled,
    keyboardNavigation = true,
    includeTime,
    onMonthChange,
    onFocusedDateChange,
    value,
    defaultValue,
    onSelect,
  } = props

  const runtimeId = useId()
  const locale = localeProp ?? defaultNavigatorLocale()
  const weekStartsOn = weekStartsOnProp ?? 0
  const messages = useMemo(() => ({ ...DEFAULT_CALENDAR_MESSAGES, ...messagesProp }), [messagesProp])
  const selection = useSingleSelection({
    value,
    defaultValue,
    minDate,
    maxDate,
    isDateDisabled,
    includeTime,
    onSelect,
  })
  const today = useMemo(() => Temporal.Now.plainDateISO(), [])
  const selectedPlain = selection.value ? toPlainDate(selection.value) : null
  const minDay = useMemo(() => (minDate ? toPlainDate(minDate) : DEFAULT_MIN_DATE), [minDate])
  const maxDay = useMemo(() => (maxDate ? toPlainDate(maxDate) : DEFAULT_MAX_DATE), [maxDate])
  const initialDate = clampDate(selectedPlain ?? today, minDay, maxDay)
  const initialMonth = initialDate.toPlainYearMonth()

  const [focusedDate, setFocusedDateState] = useState<Temporal.PlainDate>(initialDate)
  const minMonth = useMemo(() => minDay.toPlainYearMonth(), [minDay])
  const maxMonth = useMemo(() => maxDay.toPlainYearMonth(), [maxDay])
  const monthCount = monthsInclusiveCount(minMonth, maxMonth)
  const weekdays = useMemo(() => weekdayLabels(locale, weekStartsOn), [locale, weekStartsOn])
  const [currentMonth, setCurrentMonthState] = useState(initialMonth)
  const selectionRuntime = useMemo(
    () => ({
      selectDate: selection.selectDate,
      setSelectedTime: selection.setSelectedTime,
    }),
    [selection.selectDate, selection.setSelectedTime],
  )

  const {
    displayMode,
    setDisplayMode,
    timeEditTarget,
    openTimeView,
  } = useCalendarSecondaryView()

  const setFocusedDate = useCallback(
    (next: Temporal.PlainDate) => {
      const clamped = clampDate(next, minDay, maxDay)
      setFocusedDateState(clamped)
      onFocusedDateChange?.(clamped)
    },
    [maxDay, minDay, onFocusedDateChange],
  )
  const setCurrentMonth = useCallback((month: Temporal.PlainYearMonth) => {
    setCurrentMonthState((prev) => (Temporal.PlainYearMonth.compare(prev, month) === 0 ? prev : month))
  }, [])

  useEffect(() => {
    onMonthChange?.(currentMonth)
  }, [currentMonth, onMonthChange])

  return {
    id: runtimeId,
    mode: 'single',
    locale,
    weekStartsOn,
    messages,
    includeTime,
    selectionSnapshot: {
      mode: 'single',
      value: selection.value,
      plain: { value: selectedPlain },
    },
    weekdays,
    keyboardNavigation,
    minDay,
    minMonth,
    maxMonth,
    monthCount,
    maxDay,
    focusedDate,
    today,
    currentMonth,
    setCurrentMonth,
    displayMode,
    setDisplayMode,
    timeEditTarget,
    openTimeView,
    selection: selectionRuntime,
    isDateDisabled: selection.isDisabled,
    setFocusedDate,
  }
}
