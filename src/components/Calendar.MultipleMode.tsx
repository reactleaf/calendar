import type { Temporal } from '@js-temporal/polyfill'
import { useCallback } from 'react'
import { useCalendarContext } from './Calendar.context'
import CalendarDatePicker from './Calendar.DatePicker'
import { CalendarMonthPicker } from './Calendar.MonthPicker'
import { CalendarTimeSelectView } from './Calendar.TimeSelectView'

export function CalendarMultipleMode() {
  const runtime = useCalendarContext()
  const { selection, setFocusedDate, scrollRef, displayMode } = runtime

  const onDateClick = useCallback(
    (date: Temporal.PlainDate) => {
      setFocusedDate(date)
      selection.selectDate(date, 'click')
      scrollRef.current?.focus({ preventScroll: true })
    },
    [scrollRef, selection, setFocusedDate],
  )
  const onDateHover = useCallback(() => {}, [])

  return (
    <>
      <CalendarDatePicker onDateHover={onDateHover} onDateClick={onDateClick} />
      {displayMode === 'months' ? <CalendarMonthPicker /> : null}
      {displayMode === 'time' ? <CalendarTimeSelectView /> : null}
    </>
  )
}
