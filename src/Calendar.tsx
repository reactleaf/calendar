import type { JSX } from 'react'
import './Calendar.css'
import { CalendarHeader } from './components/Calendar.Header'
import { CalendarTimeInput } from './components/Calendar.TimeInput'
import { CalendarMultipleMode } from './components/Calendar.MultipleMode'
import { CalendarRangeMode } from './components/Calendar.RangeMode'
import { CalendarRoot } from './components/Calendar.Root'
import { CalendarSingleMode } from './components/Calendar.SingleMode'
import { CalendarWeekdays } from './components/Calendar.Weekdays'
import type { CalendarProps } from './core/api.types'

/* eslint-disable react-refresh/only-export-components -- compound component 정적 프로퍼티 조합 */

function CalendarImpl(props: CalendarProps) {
  const modeBody =
    props.mode === 'single' ? (
      <CalendarSingleMode />
    ) : props.mode === 'multiple' ? (
      <CalendarMultipleMode />
    ) : (
      <CalendarRangeMode />
    )

  return (
    <CalendarRoot {...props}>
      <CalendarHeader />
      <CalendarWeekdays />
      {modeBody}
    </CalendarRoot>
  )
}

type CalendarCompound = ((props: CalendarProps) => JSX.Element) & {
  Root: typeof CalendarRoot
  Header: typeof CalendarHeader
  TimeInput: typeof CalendarTimeInput
  Weekdays: typeof CalendarWeekdays
  SingleMode: typeof CalendarSingleMode
  MultipleMode: typeof CalendarMultipleMode
  RangeMode: typeof CalendarRangeMode
}

export const Calendar: CalendarCompound = Object.assign(CalendarImpl, {
  Root: CalendarRoot,
  Header: CalendarHeader,
  TimeInput: CalendarTimeInput,
  Weekdays: CalendarWeekdays,
  SingleMode: CalendarSingleMode,
  MultipleMode: CalendarMultipleMode,
  RangeMode: CalendarRangeMode,
})

export {
  CalendarHeader,
  CalendarMultipleMode,
  CalendarRangeMode,
  CalendarRoot,
  CalendarSingleMode,
  CalendarTimeInput,
  CalendarWeekdays,
}
