import { Temporal } from '@js-temporal/polyfill'
import { useState } from 'react'
import './App.css'
import { Calendar } from './Calendar'
import type { CalendarRangeValue, DateValue } from './core/api.types'

function App() {
  const [singleSelected, setSingleSelected] = useState<DateValue | null>(
    Temporal.PlainDateTime.from('2026-04-14T09:00'),
  )
  const [multipleSelected, setMultipleSelected] = useState<DateValue[]>([
    Temporal.PlainDateTime.from('2026-04-12T10:30'),
    Temporal.PlainDateTime.from('2026-04-18T14:00'),
  ])
  const [rangeSelected, setRangeSelected] = useState<CalendarRangeValue>({
    start: Temporal.PlainDateTime.from('2026-04-08T00:00'),
    end: Temporal.PlainDateTime.from('2026-04-20T13:33'),
  })

  return (
    <main className="app-calendar-demo">
      <h1 className="app-calendar-demo__title">Calendar mode playground</h1>
      <p className="app-calendar-demo__hint">single / multiple / range를 각각 직접 조작해 동작을 확인할 수 있습니다.</p>

      <section className="app-calendar-demo__section">
        <h2>Single</h2>
        <Calendar
          className="mx-auto"
          mode="single"
          includeTime
          value={singleSelected}
          onSelect={setSingleSelected}
          minDate={Temporal.PlainDate.from('2025-01-01')}
          maxDate={Temporal.PlainDate.from('2027-12-31')}
        />
        <p className="app-calendar-demo__value" aria-live="polite">
          선택됨: <strong>{singleSelected === null ? '없음' : singleSelected.toString()}</strong>
        </p>
      </section>

      <section className="app-calendar-demo__section">
        <h2>Multiple</h2>
        <Calendar
          className="mx-auto"
          mode="multiple"
          includeTime
          value={multipleSelected}
          onSelect={setMultipleSelected}
          minDate={Temporal.PlainDate.from('2025-01-01')}
          maxDate={Temporal.PlainDate.from('2027-12-31')}
        />
        <p className="app-calendar-demo__value" aria-live="polite">
          선택됨:{' '}
          <strong>
            {multipleSelected.length === 0 ? '없음' : multipleSelected.map((d) => d.toString()).join(', ')}
          </strong>
        </p>
      </section>

      <section className="app-calendar-demo__section">
        <h2>Range</h2>
        <Calendar
          className="mx-auto"
          mode="range"
          includeTime
          value={rangeSelected}
          onSelect={setRangeSelected}
          allowRangePreview
          minDate={Temporal.PlainDate.from('2025-01-01')}
          maxDate={Temporal.PlainDate.from('2027-12-31')}
        />
        <p className="app-calendar-demo__value" aria-live="polite">
          선택됨:{' '}
          <strong>
            {rangeSelected.start ? rangeSelected.start.toString() : '없음'} ~{' '}
            {rangeSelected.end ? rangeSelected.end.toString() : '없음'}
          </strong>
        </p>
      </section>
    </main>
  )
}

export default App
