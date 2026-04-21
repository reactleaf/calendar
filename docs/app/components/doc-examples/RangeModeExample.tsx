import type { CalendarRangeValue } from '@reactleaf/calendar'
import { Calendar } from '@reactleaf/calendar'
import { useState } from 'react'
import '@/styles/doc-example.css'

const empty: CalendarRangeValue = { start: null, end: null }

export function RangeModeExample() {
  const [range, setRange] = useState<CalendarRangeValue>(empty)

  const label =
    range.start === null && range.end === null
      ? '—'
      : `${range.start?.toString() ?? '…'} → ${range.end?.toString() ?? '…'}`

  return (
    <div className="doc-example not-prose">
      <div className="doc-example__card">
        <Calendar className="doc-example__calendar" mode="range" value={range} onSelect={setRange} />
      </div>
      <output className="doc-example__output" aria-live="polite">
        <span className="doc-example__outputLabel">Range</span>{' '}
        <span className="doc-example__outputValue">{label}</span>
      </output>
    </div>
  )
}
