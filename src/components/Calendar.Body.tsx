import type { CalendarProps } from '../core'
import { CalendarMultipleMode } from './Calendar.MultipleMode'
import { CalendarRangeMode } from './Calendar.RangeMode'
import { CalendarSingleMode } from './Calendar.SingleMode'

export default function CalendarBody({ mode }: { mode: CalendarProps['mode'] }) {
  const modeBody =
    mode === 'single' ? <CalendarSingleMode /> : mode === 'multiple' ? <CalendarMultipleMode /> : <CalendarRangeMode />

  return <div className="calendar__body">{modeBody}</div>
}
