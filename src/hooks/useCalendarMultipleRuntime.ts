import { Temporal } from '@js-temporal/polyfill'
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useState } from 'react'
import type { CalendarRuntime } from '../components/Calendar.types'
import {
  clampDate,
  dayStamp,
  DEFAULT_MAX_DATE,
  DEFAULT_MIN_DATE,
  monthsInclusiveCount,
  weekdayLabels,
} from '../components/Calendar.utils'
import type { CalendarMultipleProps, DateValue } from '../core/api.types'
import { toPlainDate } from '../core/calendarDate'
import { DEFAULT_CALENDAR_MESSAGES, defaultNavigatorLocale } from '../core/calendarLocale'
import { useCalendarSecondaryView } from './useCalendarSecondaryView'
import { useMultipleSelection } from './useMultipleSelection'

function maxPlainAmong(values: readonly DateValue[]): Temporal.PlainDate | null {
  if (values.length === 0) return null
  let max = toPlainDate(values[0]!)
  for (let i = 1; i < values.length; i += 1) {
    const p = toPlainDate(values[i]!)
    if (Temporal.PlainDate.compare(p, max) > 0) max = p
  }
  return max
}

export function useCalendarMultipleRuntime(props: CalendarMultipleProps): CalendarRuntime {
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
    maxSelections,
  } = props

  const runtimeId = useId()
  const locale = localeProp ?? defaultNavigatorLocale()
  const weekStartsOn = weekStartsOnProp ?? 0
  const messages = useMemo(() => ({ ...DEFAULT_CALENDAR_MESSAGES, ...messagesProp }), [messagesProp])
  const rawSelection = useMultipleSelection({
    value,
    defaultValue,
    minDate,
    maxDate,
    isDateDisabled,
    includeTime,
    onSelect,
    maxSelections,
  })
  const { isSelected, isDisabled, toggleDate, setTimeForPlainDate } = rawSelection
  const selectedPlainValues = useMemo(() => rawSelection.value.map((value) => toPlainDate(value)), [rawSelection.value])

  const [primaryPlainDate, setPrimaryPlainDate] = useState<Temporal.PlainDate | null>(() =>
    maxPlainAmong(rawSelection.value),
  )

  const selectionPlainKey = useMemo(
    () =>
      selectedPlainValues
        .map((value) => dayStamp(value))
        .sort()
        .join('|'),
    [selectedPlainValues],
  )

  useLayoutEffect(() => {
    if (rawSelection.value.length === 0) {
      setPrimaryPlainDate(null)
      return
    }
    setPrimaryPlainDate((prev) => {
      if (prev !== null && selectedPlainValues.some((value) => value.equals(prev))) return prev
      return maxPlainAmong(rawSelection.value)
    })
  }, [rawSelection.value, selectedPlainValues, selectionPlainKey])

  const setMultiplePrimaryPlainDate = useCallback(
    (date: Temporal.PlainDate) => {
      if (!selectedPlainValues.some((value) => value.equals(date))) return
      setPrimaryPlainDate(date)
    },
    [selectedPlainValues],
  )

  const today = useMemo(() => Temporal.Now.plainDateISO(), [])
  const selectedPlain = rawSelection.value[0] ? toPlainDate(rawSelection.value[0]) : null
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

  /**
   * multiple: 마우스·키보드 동일 규칙. 클릭 경로에서 `focusedDate` 업데이트와 선택 토글이 같은 틱에 일어난다.
   * - 가상 커서가 그 날이고 이미 선택됨 → 선택 해제
   * - 선택 안 됨 → 추가
   * - 선택됐지만 가상 커서가 다른 날(주로 마우스) → 선택 유지, 대표일만 이동
   * Enter/Space 는 `selectDate(focusedDate)` 이므로 항상 wasFocused.
   */
  const selectDate = useCallback(
    (date: Temporal.PlainDate, source?: 'click' | 'keyboard') => {
      if (isDisabled(date)) return

      const sel = isSelected(date)
      const wasFocused = focusedDate.equals(date)

      if (wasFocused && sel) {
        const result = toggleDate(date, source)
        if (!result.changed) return
        setPrimaryPlainDate((prev) => {
          if (prev !== null && prev.equals(date)) return maxPlainAmong(result.nextValues)
          return prev
        })
        return
      }

      if (!sel) {
        const result = toggleDate(date, source)
        if (!result.changed) return
        if (result.added) setPrimaryPlainDate(date)
        return
      }

      setPrimaryPlainDate(date)
    },
    [focusedDate, isDisabled, isSelected, toggleDate],
  )

  const selection = useMemo(
    () => ({
      selectDate,
      setSelectedTime:
        includeTime && primaryPlainDate !== null
          ? (hour: number, minute: number) => setTimeForPlainDate(primaryPlainDate, hour, minute)
          : undefined,
    }),
    [includeTime, primaryPlainDate, selectDate, setTimeForPlainDate],
  )
  const setCurrentMonth = useCallback((month: Temporal.PlainYearMonth) => {
    setCurrentMonthState((prev) => (Temporal.PlainYearMonth.compare(prev, month) === 0 ? prev : month))
  }, [])

  useEffect(() => {
    onMonthChange?.(currentMonth)
  }, [currentMonth, onMonthChange])

  return {
    id: runtimeId,
    mode: 'multiple',
    locale,
    weekStartsOn,
    messages,
    includeTime,
    selectionSnapshot: {
      mode: 'multiple',
      values: rawSelection.value,
      plain: {
        values: selectedPlainValues,
        primary: primaryPlainDate,
      },
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
    isDateDisabled: isDisabled,
    setFocusedDate,
    setMultiplePrimaryPlainDate,
  }
}
