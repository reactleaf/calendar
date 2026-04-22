import type { Temporal } from '@js-temporal/polyfill'
import { startTransition, useCallback } from 'react'
import { useCalendarContext } from './Calendar.context'
import CalendarDatePicker from './Calendar.DatePicker'
import { CalendarMonthPicker } from './Calendar.MonthPicker'
import { CalendarTimeSelectView } from './Calendar.TimeSelectView'

export function CalendarRangeMode() {
  const runtime = useCalendarContext()
  const { selection, setFocusedDate, scrollRef, displayMode } = runtime

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

  return (
    <>
      <CalendarDatePicker onDateHover={onDateHover} onDateClick={onDateClick} />
      {displayMode === 'months' ? <CalendarMonthPicker /> : null}
      {displayMode === 'time' ? <CalendarTimeSelectView /> : null}
    </>
  )
}
