import type { JSX } from 'react'
import type { CalendarProps } from '../core/api.types'
import { CalendarHeader } from './calendar/CalendarHeader'
import { CalendarMultipleMode } from './calendar/CalendarMultipleMode'
import { CalendarRangeMode } from './calendar/CalendarRangeMode'
import { CalendarRoot } from './calendar/CalendarRoot'
import { CalendarSingleMode } from './calendar/CalendarSingleMode'
import { CalendarWeekdays } from './calendar/CalendarWeekdays'
import './Calendar.css'

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
      <CalendarWeekdays />
      {modeBody}
    </CalendarRoot>
  )
}

type CalendarCompound = ((props: CalendarProps) => JSX.Element) & {
  Root: typeof CalendarRoot
  Header: typeof CalendarHeader
  Weekdays: typeof CalendarWeekdays
  SingleMode: typeof CalendarSingleMode
  MultipleMode: typeof CalendarMultipleMode
  RangeMode: typeof CalendarRangeMode
}

export const Calendar: CalendarCompound = Object.assign(CalendarImpl, {
  Root: CalendarRoot,
  Header: CalendarHeader,
  Weekdays: CalendarWeekdays,
  SingleMode: CalendarSingleMode,
  MultipleMode: CalendarMultipleMode,
  RangeMode: CalendarRangeMode,
})

export { CalendarHeader, CalendarMultipleMode, CalendarRangeMode, CalendarRoot, CalendarSingleMode, CalendarWeekdays }
