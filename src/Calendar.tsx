import './Calendar.css'
import CalendarBody from './components/body/Calendar.Body'
import { CalendarMonthPickerView } from './components/body/Calendar.MonthPickerView'
import { CalendarMultipleMode } from './components/body/Calendar.MultipleMode'
import { CalendarRangeMode } from './components/body/Calendar.RangeMode'
import { CalendarSingleMode } from './components/body/Calendar.SingleMode'
import { CalendarTimePickerView } from './components/body/Calendar.TimePickerView'
import { CalendarWeekdays } from './components/body/Calendar.Weekdays'
import { CalendarHeader } from './components/header/Calendar.Header'
import { CalendarTimeInput } from './components/header/Calendar.TimeInput'
import { CalendarRoot } from './components/Calendar.Root'
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
Calendar.TimePickerView = CalendarTimePickerView
Calendar.Weekdays = CalendarWeekdays
Calendar.MonthPickerView = CalendarMonthPickerView
Calendar.SingleMode = CalendarSingleMode
Calendar.MultipleMode = CalendarMultipleMode
Calendar.RangeMode = CalendarRangeMode

export default Calendar
