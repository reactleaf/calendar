import type { JSX } from 'react'
import type { CalendarSingleProps } from '../core/api.types'
import { CalendarHeader } from './calendar/CalendarHeader'
import { CalendarRoot } from './calendar/CalendarRoot'
import { CalendarSingleMode } from './calendar/CalendarSingleMode'
import { CalendarWeekdays } from './calendar/CalendarWeekdays'
import './Calendar.css'

/* eslint-disable react-refresh/only-export-components -- compound component 정적 프로퍼티 조합 */

function CalendarImpl(props: CalendarSingleProps) {
  return (
    <CalendarRoot {...props}>
      <CalendarWeekdays />
      <CalendarSingleMode />
    </CalendarRoot>
  )
}

type CalendarCompound = ((props: CalendarSingleProps) => JSX.Element) & {
  Root: typeof CalendarRoot
  Header: typeof CalendarHeader
  Weekdays: typeof CalendarWeekdays
  SingleMode: typeof CalendarSingleMode
}

export const Calendar: CalendarCompound = Object.assign(CalendarImpl, {
  Root: CalendarRoot,
  Header: CalendarHeader,
  Weekdays: CalendarWeekdays,
  SingleMode: CalendarSingleMode,
})

export { CalendarHeader, CalendarRoot, CalendarSingleMode, CalendarWeekdays }
