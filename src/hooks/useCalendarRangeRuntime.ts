import { Temporal } from '@js-temporal/polyfill'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import type { CalendarRuntime } from '../components/Calendar.types'
import {
  clampDate,
  DEFAULT_MAX_DATE,
  DEFAULT_MIN_DATE,
  monthsInclusiveCount,
  weekdayLabels,
} from '../components/Calendar.utils'
import type { CalendarRangeProps } from '../core/api.types'
import { toPlainDate } from '../core/calendarDate'
import { DEFAULT_CALENDAR_MESSAGES, defaultNavigatorLocale } from '../core/calendarLocale'
import { useCalendarSecondaryView } from './useCalendarSecondaryView'
import { useRangeSelection } from './useRangeSelection'

export function useCalendarRangeRuntime(props: CalendarRangeProps): CalendarRuntime {
  const {
    locale: localeProp,
    weekStartsOn: weekStartsOnProp,
    messages: messagesProp,
    minDate,
    maxDate,
    keyboardNavigation = true,
    includeTime,
    onMonthChange,
    onFocusedDateChange,
    value,
    defaultValue,
    onSelect,
    onRangePreview,
  } = props

  const runtimeId = useId()
  const locale = localeProp ?? defaultNavigatorLocale()
  const weekStartsOn = weekStartsOnProp ?? 0
  const messages = useMemo(() => ({ ...DEFAULT_CALENDAR_MESSAGES, ...messagesProp }), [messagesProp])
  const rawSelection = useRangeSelection({
    value,
    defaultValue,
    minDate,
    maxDate,
    includeTime,
    onSelect,
    onRangePreview,
  })
  const selection = useMemo(
    () => ({
      selectDate: rawSelection.selectDate,
      setRangeTime: rawSelection.setRangeTime,
      previewDate: rawSelection.previewDate,
    }),
    [rawSelection.previewDate, rawSelection.selectDate, rawSelection.setRangeTime],
  )
  const today = useMemo(() => Temporal.Now.plainDateISO(), [])
  const selectedPlain = rawSelection.value.start ? toPlainDate(rawSelection.value.start) : null
  const rangePlain = useMemo(
    () => ({
      start: rawSelection.value.start ? toPlainDate(rawSelection.value.start) : null,
      end: rawSelection.value.end ? toPlainDate(rawSelection.value.end) : null,
    }),
    [rawSelection.value.end, rawSelection.value.start],
  )
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

  const { displayMode, setDisplayMode, timeEditTarget, openTimeView } = useCalendarSecondaryView()

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
    mode: 'range',
    locale,
    weekStartsOn,
    messages,
    includeTime,
    rangeHeaderValue: rawSelection.preview ?? rawSelection.value,
    rangeHeaderPreviewActive: rawSelection.preview != null,
    selectionSnapshot: {
      mode: 'range',
      value: rawSelection.value,
      plain: rangePlain,
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
    selection,
    isDateDisabled: rawSelection.isDisabled,
    setFocusedDate,
  }
}
