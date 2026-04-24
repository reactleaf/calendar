import { Temporal } from '@js-temporal/polyfill'
import type { DateValue } from '@reactleaf/calendar'
import { Calendar } from '@reactleaf/calendar'
import { useCallback, useState } from 'react'
import '@/styles/doc-example.css'

const blocked = new Set(['2026-04-10', '2026-04-17'])

export function DisabledDatesExample() {
  const [date, setDate] = useState<DateValue | null>(Temporal.PlainDate.from('2026-04-08'))
  const isDateDisabled = useCallback((day: Temporal.PlainDate) => {
    return day.dayOfWeek >= 6 || blocked.has(day.toString())
  }, [])

  return (
    <div className="doc-example not-prose">
      <div className="doc-example__card">
        <Calendar
          className="doc-example__calendar"
          mode="single"
          value={date}
          onSelect={setDate}
          isDateDisabled={isDateDisabled}
        />
      </div>
      <output className="doc-example__output" aria-live="polite">
        <span className="doc-example__outputLabel">Selected</span>{' '}
        <span className="doc-example__outputValue">{date === null ? '—' : date.toString()}</span>
      </output>
    </div>
  )
}
