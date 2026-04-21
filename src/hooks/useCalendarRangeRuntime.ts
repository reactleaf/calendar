import { Temporal } from '@js-temporal/polyfill'
import type { KeyboardEvent } from 'react'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CalendarRangeProps } from '../core/api.types'
import { DEFAULT_CALENDAR_MESSAGES, defaultNavigatorLocale } from '../core/calendarLocale'
import { toPlainDate } from '../core/calendarDate'
import type { CalendarRuntime } from '../components/Calendar.types'
import { clampDate, DEFAULT_MAX_DATE, DEFAULT_MIN_DATE, monthIndexFromMin } from '../components/Calendar.utils'
import { useCalendarSecondaryView } from './useCalendarSecondaryView'
import { useInfiniteMonthScroll } from './useInfiniteMonthScroll'
import { useRangeSelection } from './useRangeSelection'
import { useSuppressMonthOverlayOnReturnToDays } from './useSuppressMonthOverlayOnReturnToDays'

/* oxlint-disable react-hooks/exhaustive-deps -- range selection 콜백이 매 렌더 갱신되는 스냅샷 객체에 의존 */

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
  /** 보조 뷰 → 일 그리드 복귀 시 월 오버레이 깜빡임 방지 — `useSuppressMonthOverlayOnReturnToDays` + `useInfiniteMonthScroll` */
  const overlaySuppressUntilRef = useRef(0)

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
    getDateViewportPlacement,
  } = useInfiniteMonthScroll({
    locale,
    weekStartsOn,
    initialMonth,
    minMonth: minDay.toPlainYearMonth(),
    maxMonth: maxDay.toPlainYearMonth(),
    onMonthChange,
    overlaySuppressUntilRef,
  })

  const { displayMode, setDisplayMode, scrollToMonth, timeEditTarget, openTimeView } = useCalendarSecondaryView({
    minMonth,
    monthCount,
    monthVirtualizer,
  })

  useSuppressMonthOverlayOnReturnToDays(displayMode, overlaySuppressUntilRef)

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
      selection.previewDate?.(next, 'keyboard')
      focusDateRequestRef.current = next
      requestAnimationFrame(() => keepDateVisible(next))
    },
    [focusedDate, keepDateVisible, maxDay, minDay, selection, setFocusedDate],
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
    weekStartsOn,
    messages,
    includeTime,
    rangeHeaderValue: rawSelection.preview ?? rawSelection.value,
    rangeHeaderPreviewActive: rawSelection.preview != null,
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
    currentMonth,
    displayMode,
    setDisplayMode,
    scrollToMonth,
    timeEditTarget,
    openTimeView,
    selection,
    setFocusedDate,
    keepDateVisible,
    getDateViewportPlacement,
    handleScroll,
    handleKeyDown,
  }
}
