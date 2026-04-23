import type { Temporal } from '@js-temporal/polyfill'
import { useCallback } from 'react'
import { useCalendarContext, useCalendarViewportHandle } from '../Calendar.context'
import CalendarDatePickerView from './Calendar.DatePickerView'
import { CalendarMonthPickerView } from './Calendar.MonthPickerView'
import { CalendarTimePickerView } from './Calendar.TimePickerView'

export function CalendarMultipleMode() {
  const runtime = useCalendarContext()
  const viewportHandle = useCalendarViewportHandle()
  const {
    mode,
    locale,
    weekStartsOn,
    messages,
    keyboardNavigation,
    minDay,
    maxDay,
    minMonth,
    maxMonth,
    focusedDate,
    displayMode,
    setCurrentMonth,
    selection,
    isDateDisabled,
    setFocusedDate,
  } = runtime

  const onDateClick = useCallback(
    (date: Temporal.PlainDate) => {
      setFocusedDate(date)
      selection.selectDate(date, 'click')
    },
    [selection, setFocusedDate],
  )
  const onDateHover = useCallback(() => {}, [])

  return (
    <>
      <CalendarDatePickerView
        ref={viewportHandle}
        mode={mode}
        locale={locale}
        weekStartsOn={weekStartsOn}
        messages={messages}
        keyboardNavigation={keyboardNavigation}
        minDay={minDay}
        maxDay={maxDay}
        minMonth={minMonth}
        maxMonth={maxMonth}
        focusedDate={focusedDate}
        displayMode={displayMode}
        setCurrentMonth={setCurrentMonth}
        setFocusedDate={setFocusedDate}
        onDateHover={onDateHover}
        onDateClick={onDateClick}
        selectDate={selection.selectDate}
        isDateDisabled={isDateDisabled}
      />
      {displayMode === 'months' ? <CalendarMonthPickerView /> : null}
      {displayMode === 'time' ? <CalendarTimePickerView /> : null}
    </>
  )
}
