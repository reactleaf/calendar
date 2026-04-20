import type { Temporal } from '@js-temporal/polyfill'
import type { KeyboardEvent, UIEvent } from 'react'
import { startTransition, useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { toPlainDate } from '../core/calendarDate'
import { useCalendarContext } from './Calendar.context'
import { dayStamp } from './Calendar.utils'
import { CalendarModeBody } from './Calendar.ModeBody'
import { CalendarMonthPicker } from './Calendar.MonthPicker'
import { CalendarTimeSelectView } from './Calendar.TimeSelectView'

export function CalendarRangeMode() {
  const runtime = useCalendarContext()
  const {
    locale,
    weekStartsOn,
    messages,
    keyboardNavigation,
    isScrolling,
    minMonth,
    monthVirtualizer,
    monthRefs,
    scrollRef,
    focusedDate,
    today,
    selectionSnapshot,
    selection,
    setFocusedDate,
    handleScroll,
    handleKeyDown,
    displayMode,
  } = runtime

  const handleScrollRef = useRef(handleScroll)
  const handleKeyDownRef = useRef(handleKeyDown)
  useLayoutEffect(() => {
    handleScrollRef.current = handleScroll
    handleKeyDownRef.current = handleKeyDown
  }, [handleScroll, handleKeyDown])

  const selectedDateKey = useMemo(() => {
    if (selectionSnapshot.mode !== 'range') return ''
    const start = selectionSnapshot.value.start ? dayStamp(toPlainDate(selectionSnapshot.value.start)) : ''
    const end = selectionSnapshot.value.end ? dayStamp(toPlainDate(selectionSnapshot.value.end)) : ''
    return `${start}|${end}`
  }, [selectionSnapshot])

  const onDateClick = useCallback(
    (date: Temporal.PlainDate) => {
      startTransition(() => {
        setFocusedDate(date)
        selection.selectDate(date, 'click')
      })
      queueMicrotask(() => {
        scrollRef.current?.focus({ preventScroll: true })
      })
    },
    [scrollRef, selection, setFocusedDate],
  )
  const onDateHover = useCallback((date: Temporal.PlainDate) => selection.previewDate?.(date, 'hover'), [selection])
  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => handleScrollRef.current(event), [])
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => handleKeyDownRef.current(event), [])
  const isDateSelected = useCallback((date: Temporal.PlainDate) => selection.isSelected(date), [selection])
  const isDateDisabled = useCallback((date: Temporal.PlainDate) => selection.isDisabled(date), [selection])
  const isRangeStart = useCallback((date: Temporal.PlainDate) => selection.isRangeStart?.(date) ?? false, [selection])
  const isRangeEnd = useCallback((date: Temporal.PlainDate) => selection.isRangeEnd?.(date) ?? false, [selection])
  const isInPreviewRange = useCallback(
    (date: Temporal.PlainDate) => selection.isInPreviewRange?.(date) ?? false,
    [selection],
  )

  if (displayMode === 'months') return <CalendarMonthPicker />
  if (displayMode === 'time') return <CalendarTimeSelectView />

  return (
    <CalendarModeBody
      mode="range"
      locale={locale}
      weekStartsOn={weekStartsOn}
      messages={messages}
      keyboardNavigation={keyboardNavigation}
      isScrolling={isScrolling}
      minMonth={minMonth}
      monthVirtualizer={monthVirtualizer}
      monthRefs={monthRefs}
      scrollRef={scrollRef}
      focusedDateStamp={dayStamp(focusedDate)}
      todayDateStamp={dayStamp(today)}
      todayYear={today.year}
      isDateSelected={isDateSelected}
      isDateDisabled={isDateDisabled}
      isRangeStart={isRangeStart}
      isRangeEnd={isRangeEnd}
      isInPreviewRange={isInPreviewRange}
      onDateHover={onDateHover}
      onDateClick={onDateClick}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      selectionRenderKey={selectedDateKey}
      previewIdentity={selection.isInPreviewRange}
    />
  )
}
