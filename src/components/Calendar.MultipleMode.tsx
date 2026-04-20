import type { Temporal } from '@js-temporal/polyfill'
import type { KeyboardEvent, UIEvent } from 'react'
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { toPlainDate } from '../core/calendarDate'
import { useCalendarContext } from './Calendar.context'
import { dayStamp } from './Calendar.utils'
import { CalendarModeBody } from './Calendar.ModeBody'
import { CalendarMonthPicker } from './Calendar.MonthPicker'
import { CalendarTimeSelectView } from './Calendar.TimeSelectView'

export function CalendarMultipleMode() {
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
    if (selectionSnapshot.mode !== 'multiple') return ''
    return selectionSnapshot.values
      .map((value) => dayStamp(toPlainDate(value)))
      .sort()
      .join('|')
  }, [selectionSnapshot])

  const multiplePrimaryDateStamp = useMemo(() => {
    if (selectionSnapshot.mode !== 'multiple') return null
    return selectionSnapshot.primaryPlainDate !== null ? dayStamp(selectionSnapshot.primaryPlainDate) : null
  }, [selectionSnapshot])

  const onDateClick = useCallback(
    (date: Temporal.PlainDate) => {
      setFocusedDate(date)
      selection.selectDate(date, 'click')
      scrollRef.current?.focus({ preventScroll: true })
    },
    [scrollRef, selection, setFocusedDate],
  )
  const onDateHover = useCallback(() => {}, [])
  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => handleScrollRef.current(event), [])
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => handleKeyDownRef.current(event), [])
  const isDateSelected = useCallback((date: Temporal.PlainDate) => selection.isSelected(date), [selection])
  const isDateDisabled = useCallback((date: Temporal.PlainDate) => selection.isDisabled(date), [selection])
  const alwaysFalse = useCallback(() => false, [])

  if (displayMode === 'months') return <CalendarMonthPicker />
  if (displayMode === 'time') return <CalendarTimeSelectView />

  return (
    <CalendarModeBody
      mode="multiple"
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
      isRangeStart={alwaysFalse}
      isRangeEnd={alwaysFalse}
      isInPreviewRange={alwaysFalse}
      onDateHover={onDateHover}
      onDateClick={onDateClick}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      selectionRenderKey={selectedDateKey}
      multiplePrimaryDateStamp={multiplePrimaryDateStamp}
    />
  )
}
