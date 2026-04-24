import { Temporal } from '@js-temporal/polyfill'
import type { CalendarRangeValue } from '@reactleaf/calendar'
import { Calendar } from '@reactleaf/calendar'
import { useState } from 'react'
import '@/styles/doc-example.css'

const initialRange: CalendarRangeValue = {
  start: Temporal.PlainDateTime.from('2026-04-15T10:00'),
  end: Temporal.PlainDateTime.from('2026-04-18T18:00'),
}

export function RangeTimeExample() {
  const [range, setRange] = useState<CalendarRangeValue>(initialRange)

  return (
    <div className="doc-example not-prose">
      <div className="doc-example__card">
        <Calendar className="doc-example__calendar" mode="range" includeTime value={range} onSelect={setRange} />
      </div>
      <output className="doc-example__output" aria-live="polite">
        <span className="doc-example__outputLabel">Range</span>{' '}
        <span className="doc-example__outputValue">
          {range.start?.toString() ?? '…'} → {range.end?.toString() ?? '…'}
        </span>
      </output>
    </div>
  )
}
