import type { Temporal } from '@js-temporal/polyfill'
import { startTransition, useCallback } from 'react'
import { useCalendarContext, useCalendarViewportHandle } from './Calendar.context'
import CalendarDatePicker from './Calendar.DatePicker'
import { CalendarMonthPicker } from './Calendar.MonthPicker'
import { CalendarTimeSelectView } from './Calendar.TimeSelectView'

export function CalendarRangeMode() {
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
  const { selectDate, previewDate } = selection

  const onDateClick = useCallback(
    (date: Temporal.PlainDate) => {
      startTransition(() => {
        setFocusedDate(date)
        selectDate(date, 'click')
      })
    },
    [selectDate, setFocusedDate],
  )
  const onDateHover = useCallback((date: Temporal.PlainDate) => previewDate?.(date, 'hover'), [previewDate])

  return (
    <>
      <CalendarDatePicker
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
        selectDate={selectDate}
        previewDate={previewDate}
        isDateDisabled={isDateDisabled}
      />
      {displayMode === 'months' ? <CalendarMonthPicker /> : null}
      {displayMode === 'time' ? <CalendarTimeSelectView /> : null}
    </>
  )
}
