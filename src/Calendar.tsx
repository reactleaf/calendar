import './Calendar.css'
import CalendarBody from './components/Calendar.Body'
import { CalendarHeader } from './components/Calendar.Header'
import { CalendarMonthPicker } from './components/Calendar.MonthPicker'
import { CalendarMultipleMode } from './components/Calendar.MultipleMode'
import { CalendarRangeMode } from './components/Calendar.RangeMode'
import { CalendarRoot } from './components/Calendar.Root'
import { CalendarSingleMode } from './components/Calendar.SingleMode'
import { CalendarTimeInput } from './components/Calendar.TimeInput'
import { CalendarTimeSelectView } from './components/Calendar.TimeSelectView'
import { CalendarWeekdays } from './components/Calendar.Weekdays'
import type { CalendarProps } from './core/api.types'

/* eslint-disable react-refresh/only-export-components -- compound component 정적 프로퍼티 조합 */

export function Calendar(props: CalendarProps) {
  return (
    <CalendarRoot {...props}>
      <CalendarHeader />
      <CalendarBody mode={props.mode} />
    </CalendarRoot>
  )
}

Calendar.Root = CalendarRoot
Calendar.Header = CalendarHeader
Calendar.Body = CalendarBody
Calendar.TimeInput = CalendarTimeInput
Calendar.TimeSelectView = CalendarTimeSelectView
Calendar.Weekdays = CalendarWeekdays
Calendar.MonthPicker = CalendarMonthPicker
Calendar.SingleMode = CalendarSingleMode
Calendar.MultipleMode = CalendarMultipleMode
Calendar.RangeMode = CalendarRangeMode

export default Calendar
