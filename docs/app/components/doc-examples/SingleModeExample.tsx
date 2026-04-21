import type { DateValue } from '@reactleaf/calendar'
import { Calendar } from '@reactleaf/calendar'
import { useState } from 'react'
import '@/styles/doc-example.css'

export function SingleModeExample() {
  const [date, setDate] = useState<DateValue | null>(null)

  return (
    <div className="doc-example not-prose">
      <div className="doc-example__card">
        <Calendar className="doc-example__calendar" mode="single" value={date} onSelect={setDate} />
      </div>
      <output className="doc-example__output" aria-live="polite">
        <span className="doc-example__outputLabel">Selected</span>{' '}
        <span className="doc-example__outputValue">{date === null ? '—' : date.toString()}</span>
      </output>
    </div>
  )
}
