import { Temporal } from '@js-temporal/polyfill'
import { useState } from 'react'
import type { DateValue } from './core/api.types'
import { Calendar } from './components/Calendar'
import './App.css'

function App() {
  const [selected, setSelected] = useState<DateValue | null>(Temporal.PlainDate.from('2026-04-14'))

  return (
    <main className="app-calendar-demo">
      <h1 className="app-calendar-demo__title">단일 선택 캘린더</h1>
      <p className="app-calendar-demo__hint">
        날짜를 클릭하거나 그리드에 포커스를 둔 뒤 화살표·Enter로 선택할 수 있습니다.
      </p>
      <Calendar
        mode="single"
        value={selected}
        onSelect={setSelected}
        minDate={Temporal.PlainDate.from('2026-01-01')}
        maxDate={Temporal.PlainDate.from('2026-12-31')}
      />
      <p className="app-calendar-demo__value" aria-live="polite">
        선택됨: <strong>{selected === null ? '없음' : selected.toString()}</strong>
      </p>
    </main>
  )
}

export default App
