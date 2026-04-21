import type { DateValue } from '@reactleaf/calendar'
import { Calendar } from '@reactleaf/calendar'
import { useState } from 'react'
import '@/styles/doc-example.css'

export function MultipleModeExample() {
  const [dates, setDates] = useState<DateValue[]>([])

  return (
    <div className="doc-example not-prose">
      <div className="doc-example__card">
        <Calendar className="doc-example__calendar" mode="multiple" value={dates} onSelect={setDates} />
      </div>
      <output className="doc-example__output" aria-live="polite">
        <span className="doc-example__outputLabel">Selected</span>{' '}
        <span className="doc-example__outputValue">
          {dates.length === 0 ? '—' : dates.map((d) => d.toString()).join(', ')}
        </span>
      </output>
    </div>
  )
}
