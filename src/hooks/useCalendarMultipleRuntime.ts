import { Temporal } from '@js-temporal/polyfill'
import type { KeyboardEvent } from 'react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { CalendarMultipleProps } from '../core/api.types'
import { toPlainDate } from '../core/calendarDate'
import type { CalendarRuntime } from '../components/Calendar.types'
import { clampDate, DEFAULT_MAX_DATE, DEFAULT_MIN_DATE, monthIndexFromMin } from '../components/Calendar.utils'
import { useCalendarSecondaryView } from './useCalendarSecondaryView'
import { useInfiniteMonthScroll } from './useInfiniteMonthScroll'
import { useMultipleSelection } from './useMultipleSelection'

/* eslint-disable react-hooks/preserve-manual-memoization -- Temporal 값 의존 useCallback 패턴 유지 */

export function useCalendarMultipleRuntime(props: CalendarMultipleProps): CalendarRuntime {
  const {
    disabled,
    minDate,
    maxDate,
    disabledDates,
    disabledDays,
    keyboardNavigation = true,
    includeTime,
    minuteStep,
    onMonthChange,
    onFocusedDateChange,
    value,
    defaultValue,
    onSelect,
    maxSelections,
  } = props

  const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US'
  const rawSelection = useMultipleSelection({
    value,
    defaultValue,
    disabled,
    minDate,
    maxDate,
    disabledDates,
    disabledDays,
    includeTime,
    minuteStep,
    onSelect,
    maxSelections,
  })
  const selection = {
    isSelected: rawSelection.isSelected,
    isDisabled: rawSelection.isDisabled,
    selectDate: rawSelection.toggleDate,
    setSelectedTime: rawSelection.setLatestSelectedTime,
  }
  const today = Temporal.Now.plainDateISO()
  const selectedPlain = rawSelection.value[0] ? toPlainDate(rawSelection.value[0]) : null
  const minDay = minDate ? toPlainDate(minDate) : DEFAULT_MIN_DATE
  const maxDay = maxDate ? toPlainDate(maxDate) : DEFAULT_MAX_DATE
  const initialDate = clampDate(selectedPlain ?? today, minDay, maxDay)
  const initialMonth = initialDate.toPlainYearMonth()

  const [focusedDate, setFocusedDateState] = useState<Temporal.PlainDate>(initialDate)
  const initializedScrollRef = useRef(false)
  const focusDateRequestRef = useRef<Temporal.PlainDate | null>(null)

  const {
    weekdays,
    minMonth,
    maxMonth,
    monthCount,
    monthVirtualizer,
    currentMonth,
    isScrolling,
    monthRefs,
    scrollRef,
    handleScroll,
    keepDateVisible,
  } = useInfiniteMonthScroll({
    locale,
    initialMonth,
    minMonth: minDay.toPlainYearMonth(),
    maxMonth: maxDay.toPlainYearMonth(),
    onMonthChange,
  })

  const { displayMode, setDisplayMode, scrollToMonth, timeEditTarget, openTimeView } = useCalendarSecondaryView({
    minMonth,
    monthCount,
    monthVirtualizer,
  })

  const setFocusedDate = useCallback(
    (next: Temporal.PlainDate) => {
      const clamped = clampDate(next, minDay, maxDay)
      setFocusedDateState(clamped)
      onFocusedDateChange?.(clamped)
    },
    [maxDay, minDay, onFocusedDateChange],
  )

  const moveFocusedByDays = useCallback(
    (days: number) => {
      const next = clampDate(focusedDate.add({ days }), minDay, maxDay)
      setFocusedDate(next)
      focusDateRequestRef.current = next
      requestAnimationFrame(() => keepDateVisible(next))
    },
    [focusedDate, keepDateVisible, maxDay, minDay, setFocusedDate],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!keyboardNavigation) return
      if (event.key === 'ArrowLeft') moveFocusedByDays(-1)
      else if (event.key === 'ArrowRight') moveFocusedByDays(1)
      else if (event.key === 'ArrowUp') moveFocusedByDays(-7)
      else if (event.key === 'ArrowDown') moveFocusedByDays(7)
      else if (event.key === 'Enter' || event.key === ' ') selection.selectDate(focusedDate, 'keyboard')
      else return
      event.preventDefault()
    },
    [focusedDate, keyboardNavigation, moveFocusedByDays, selection],
  )

  useLayoutEffect(() => {
    if (initializedScrollRef.current) return
    const idx = monthIndexFromMin(minMonth, initialMonth)
    monthVirtualizer.scrollToIndex(Math.max(0, Math.min(monthCount - 1, idx)), { align: 'start' })
    initializedScrollRef.current = true
  }, [initialMonth, minMonth, monthCount, monthVirtualizer])

  useLayoutEffect(() => {
    const requested = focusDateRequestRef.current
    if (!requested) return
    keepDateVisible(requested)
    focusDateRequestRef.current = null
  }, [keepDateVisible])

  return {
    mode: 'multiple',
    locale,
    includeTime,
    minuteStep,
    selectionSnapshot: { mode: 'multiple', values: rawSelection.value },
    weekdays,
    keyboardNavigation,
    isScrolling,
    minMonth,
    maxMonth,
    monthCount,
    monthVirtualizer,
    monthRefs,
    scrollRef,
    focusedDate,
    today,
    currentMonth,
    displayMode,
    setDisplayMode,
    scrollToMonth,
    timeEditTarget,
    openTimeView,
    selection,
    setFocusedDate,
    handleScroll,
    handleKeyDown,
  }
}
