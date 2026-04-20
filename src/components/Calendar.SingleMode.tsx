import type { Temporal } from '@js-temporal/polyfill'
import type { KeyboardEvent, UIEvent } from 'react'
import { useCallback, useMemo, useRef } from 'react'
import { toPlainDate } from '../core/calendarDate'
import { useCalendarContext } from './Calendar.context'
import { dayStamp } from './Calendar.utils'
import { CalendarModeBody } from './Calendar.ModeBody'
import { CalendarMonthPicker } from './Calendar.MonthPicker'
import { CalendarTimeSelectView } from './Calendar.TimeSelectView'

export function CalendarSingleMode() {
  const runtime = useCalendarContext()
  const {
    locale,
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

  const selectionRef = useRef(selection)
  const setFocusedDateRef = useRef(setFocusedDate)
  const handleScrollRef = useRef(handleScroll)
  const handleKeyDownRef = useRef(handleKeyDown)
  selectionRef.current = selection
  setFocusedDateRef.current = setFocusedDate
  handleScrollRef.current = handleScroll
  handleKeyDownRef.current = handleKeyDown

  const selectedDateKey = useMemo(() => {
    if (selectionSnapshot.mode !== 'single' || selectionSnapshot.value === null) return ''
    return String(dayStamp(toPlainDate(selectionSnapshot.value)))
  }, [selectionSnapshot])

  const onDateClick = useCallback(
    (date: Temporal.PlainDate) => {
      setFocusedDateRef.current(date)
      selectionRef.current.selectDate(date, 'click')
      scrollRef.current?.focus({ preventScroll: true })
    },
    [scrollRef],
  )
  const onDateHover = useCallback(() => {}, [])
  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => handleScrollRef.current(event), [])
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => handleKeyDownRef.current(event), [])
  const isDateSelected = useCallback((date: Temporal.PlainDate) => selectionRef.current.isSelected(date), [])
  const isDateDisabled = useCallback((date: Temporal.PlainDate) => selectionRef.current.isDisabled(date), [])
  const alwaysFalse = useCallback(() => false, [])

  if (displayMode === 'months') return <CalendarMonthPicker />
  if (displayMode === 'time') return <CalendarTimeSelectView />

  return (
    <CalendarModeBody
      mode="single"
      locale={locale}
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
    />
  )
}
