import { Temporal } from '@js-temporal/polyfill'
import type { KeyboardEvent } from 'react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { CalendarRangeProps } from '../core/api.types'
import { toPlainDate } from '../core/calendarDate'
import type { CalendarRuntime } from '../components/calendar/types'
import { clampDate, DEFAULT_MAX_DATE, DEFAULT_MIN_DATE, monthKey } from '../components/calendar/utils'
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

  void minuteStep

  const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US'
  const rawSelection = useRangeSelection({
    ...(value !== undefined ? { value } : {}),
    ...(defaultValue !== undefined ? { defaultValue } : {}),
    ...(disabled !== undefined ? { disabled } : {}),
    ...(minDate !== undefined ? { minDate } : {}),
    ...(maxDate !== undefined ? { maxDate } : {}),
    ...(disabledDates !== undefined ? { disabledDates } : {}),
    ...(disabledDays !== undefined ? { disabledDays } : {}),
    ...(includeTime !== undefined ? { includeTime } : {}),
    ...(onSelect !== undefined ? { onSelect } : {}),
    ...(allowRangePreview !== undefined ? { allowRangePreview } : {}),
    ...(onRangePreview !== undefined ? { onRangePreview } : {}),
  })
  const selection = {
    isSelected: rawSelection.isSelected,
    isDisabled: rawSelection.isDisabled,
    selectDate: rawSelection.selectDate,
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
  const focusMonthRequestRef = useRef<Temporal.PlainYearMonth | null>(null)

  const { weekdays, months, isScrolling, monthRefs, scrollRef, handleScroll, expandForTargetMonth, keepMonthVisible } =
    useInfiniteMonthScroll({
      locale,
      initialMonth,
      minMonth: minDay.toPlainYearMonth(),
      maxMonth: maxDay.toPlainYearMonth(),
      ...(onMonthChange !== undefined ? { onMonthChange } : {}),
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
      const nextMonth = next.toPlainYearMonth()
      focusMonthRequestRef.current = nextMonth
      expandForTargetMonth(nextMonth)
      requestAnimationFrame(() => keepMonthVisible(nextMonth))
    },
    [allowRangePreview, expandForTargetMonth, focusedDate, keepMonthVisible, maxDay, minDay, selection, setFocusedDate],
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
    const scrollEl = scrollRef.current
    if (!scrollEl) return
    const node = monthRefs.current.get(monthKey(initialMonth))
    if (!node) return
    scrollEl.scrollTop = Math.max(0, node.offsetTop - 12)
    initializedScrollRef.current = true
  }, [initialMonth, monthRefs, months, scrollRef])

  useLayoutEffect(() => {
    const requested = focusMonthRequestRef.current
    if (!requested) return
    keepMonthVisible(requested)
    focusMonthRequestRef.current = null
  }, [keepMonthVisible, months])

  return {
    mode: 'range',
    locale,
    weekdays,
    keyboardNavigation,
    isScrolling,
    months,
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
