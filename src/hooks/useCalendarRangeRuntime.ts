import { Temporal } from '@js-temporal/polyfill'
import type { KeyboardEvent } from 'react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { CalendarRangeProps } from '../core/api.types'
import { toPlainDate } from '../core/calendarDate'
import type { CalendarRuntime } from '../components/Calendar.types'
import { clampDate, DEFAULT_MAX_DATE, DEFAULT_MIN_DATE, monthIndexFromMin } from '../components/Calendar.utils'
import { useInfiniteMonthScroll } from './useInfiniteMonthScroll'
import { useRangeSelection } from './useRangeSelection'

/* eslint-disable react-hooks/preserve-manual-memoization -- Temporal 값 의존 useCallback 패턴 유지 */

export function useCalendarRangeRuntime(props: CalendarRangeProps): CalendarRuntime {
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
    allowRangePreview,
    onRangePreview,
  } = props

  const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US'
  const rawSelection = useRangeSelection({
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
    allowRangePreview,
    onRangePreview,
  })
  const selection = {
    isSelected: rawSelection.isSelected,
    isDisabled: rawSelection.isDisabled,
    selectDate: rawSelection.selectDate,
    setRangeTime: rawSelection.setRangeTime,
    previewDate: rawSelection.previewDate,
    isInPreviewRange: rawSelection.isInPreviewRange,
    isRangeStart: rawSelection.isRangeStart,
    isRangeEnd: rawSelection.isRangeEnd,
  }
  const today = Temporal.Now.plainDateISO()
  const selectedPlain = rawSelection.value.start ? toPlainDate(rawSelection.value.start) : null
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
      if (allowRangePreview) selection.previewDate?.(next, 'keyboard')
      focusDateRequestRef.current = next
      requestAnimationFrame(() => keepDateVisible(next))
    },
    [allowRangePreview, focusedDate, keepDateVisible, maxDay, minDay, selection, setFocusedDate],
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
    mode: 'range',
    locale,
    includeTime,
    minuteStep,
    selectionSnapshot: { mode: 'range', value: rawSelection.value },
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
    selection,
    setFocusedDate,
    handleScroll,
    handleKeyDown,
  }
}
