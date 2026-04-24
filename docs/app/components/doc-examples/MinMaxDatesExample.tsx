import { Temporal } from '@js-temporal/polyfill'
import type { DateValue } from '@reactleaf/calendar'
import { Calendar } from '@reactleaf/calendar'
import { useState } from 'react'
import '@/styles/doc-example.css'

const minDate = Temporal.PlainDate.from('2026-04-08')
const maxDate = Temporal.PlainDate.from('2026-10-22')

export function MinMaxDatesExample() {
  const [date, setDate] = useState<DateValue | null>(Temporal.PlainDate.from('2026-04-15'))

  return (
    <div className="doc-example not-prose">
      <div className="doc-example__card">
        <Calendar
          className="doc-example__calendar"
          mode="single"
          value={date}
          onSelect={setDate}
          minDate={minDate}
          maxDate={maxDate}
        />
      </div>
      <output className="doc-example__output" aria-live="polite">
        <span className="doc-example__outputLabel">Allowed range</span>{' '}
        <span className="doc-example__outputValue">
          {minDate.toString()} → {maxDate.toString()}
        </span>
      </output>
    </div>
  )
}
