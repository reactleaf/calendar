import './Calendar.css'
import CalendarBody from './components/body/Calendar.Body'
import { CalendarHeader } from './components/header/Calendar.Header'
import { CalendarRoot } from './components/Calendar.Root'
import type { CalendarProps } from './core/api.types'

export function Calendar(props: CalendarProps) {
  return (
    <CalendarRoot {...props}>
      <CalendarHeader />
      <CalendarBody mode={props.mode} />
    </CalendarRoot>
  )
}

export default Calendar
