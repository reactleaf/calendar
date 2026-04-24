import { Temporal } from '@js-temporal/polyfill'
import type { DateValue } from '@reactleaf/calendar'
import { Calendar } from '@reactleaf/calendar'
import { useState } from 'react'
import '@/styles/doc-example.css'

const initialDates: DateValue[] = [Temporal.PlainDate.from('2026-04-07'), Temporal.PlainDate.from('2026-04-09')]

export function MultipleMaxSelectionsExample() {
  const [dates, setDates] = useState<DateValue[]>(initialDates)

  return (
    <div className="doc-example not-prose">
      <div className="doc-example__card">
        <Calendar
          className="doc-example__calendar"
          mode="multiple"
          maxSelections={3}
          value={dates}
          onSelect={setDates}
        />
      </div>
      <output className="doc-example__output" aria-live="polite">
        <span className="doc-example__outputLabel">Selected ({dates.length}/3)</span>{' '}
        <span className="doc-example__outputValue">
          {dates.length === 0 ? '—' : dates.map((date) => date.toString()).join(', ')}
        </span>
      </output>
    </div>
  )
}
