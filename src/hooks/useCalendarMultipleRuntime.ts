import { Temporal } from '@js-temporal/polyfill'
import type { KeyboardEvent } from 'react'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CalendarMultipleProps, DateValue } from '../core/api.types'
import { DEFAULT_CALENDAR_MESSAGES, defaultNavigatorLocale } from '../core/calendarLocale'
import { toPlainDate } from '../core/calendarDate'
import type { CalendarRuntime } from '../components/Calendar.types'
import { clampDate, dayStamp, DEFAULT_MAX_DATE, DEFAULT_MIN_DATE, monthIndexFromMin } from '../components/Calendar.utils'
import { useCalendarSecondaryView } from './useCalendarSecondaryView'
import { useInfiniteMonthScroll } from './useInfiniteMonthScroll'
import { useMultipleSelection } from './useMultipleSelection'
import { useSuppressMonthOverlayOnReturnToDays } from './useSuppressMonthOverlayOnReturnToDays'

/* eslint-disable react-hooks/preserve-manual-memoization -- Temporal 값 의존 useCallback 패턴 유지 */

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
    minuteStep,
    onMonthChange,
    onFocusedDateChange,
    value,
    defaultValue,
    onSelect,
    maxSelections,
  } = props

  const locale = localeProp ?? defaultNavigatorLocale()
  const weekStartsOn = weekStartsOnProp ?? 0
  const messages = useMemo(
    () => ({ ...DEFAULT_CALENDAR_MESSAGES, ...messagesProp }),
    [messagesProp],
  )
  const rawSelection = useMultipleSelection({
    value,
    defaultValue,
    minDate,
    maxDate,
    isDateDisabled,
    includeTime,
    minuteStep,
    onSelect,
    maxSelections,
  })
  const { isSelected, isDisabled, toggleDate, setTimeForPlainDate, value: selectedValues } = rawSelection

  const [primaryPlainDate, setPrimaryPlainDate] = useState<Temporal.PlainDate | null>(() =>
    maxPlainAmong(rawSelection.value),
  )

  const selectionPlainKey = useMemo(
    () => rawSelection.value.map((v) => dayStamp(toPlainDate(v))).sort().join('|'),
    [rawSelection.value],
  )

  useLayoutEffect(() => {
    if (rawSelection.value.length === 0) {
      setPrimaryPlainDate(null)
      return
    }
    setPrimaryPlainDate((prev) => {
      if (prev !== null && rawSelection.value.some((v) => toPlainDate(v).equals(prev))) return prev
      return maxPlainAmong(rawSelection.value)
    })
  }, [selectionPlainKey, rawSelection.value])

  const setMultiplePrimaryPlainDate = useCallback((date: Temporal.PlainDate) => {
    if (!selectedValues.some((v) => toPlainDate(v).equals(date))) return
    setPrimaryPlainDate(date)
  }, [selectedValues])

  const today = Temporal.Now.plainDateISO()
  const selectedPlain = rawSelection.value[0] ? toPlainDate(rawSelection.value[0]) : null
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

  /**
   * multiple: 마우스·키보드 동일 규칙. `focusedDate`는 클릭 시 아직 이전 값(ModeBody 가 먼저 setFocusedDate).
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
      isSelected,
      isDisabled,
      selectDate,
      setSelectedTime:
        includeTime && primaryPlainDate !== null
          ? (hour: number, minute: number) => setTimeForPlainDate(primaryPlainDate, hour, minute)
          : undefined,
    }),
    [includeTime, primaryPlainDate, isDisabled, isSelected, selectDate, setTimeForPlainDate],
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
    weekStartsOn,
    messages,
    includeTime,
    minuteStep,
    selectionSnapshot: { mode: 'multiple', values: rawSelection.value, primaryPlainDate },
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
    setMultiplePrimaryPlainDate,
  }
}
