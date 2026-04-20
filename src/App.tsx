import { Temporal } from '@js-temporal/polyfill'
import { useCallback, useMemo, useState } from 'react'
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

  const demoBlockedDayStrings = useMemo(() => new Set(['2026-04-15', '2026-04-22', '2026-05-01']), [])
  const demoIsDateDisabled = useCallback(
    (date: Temporal.PlainDate) => demoBlockedDayStrings.has(date.toString()),
    [demoBlockedDayStrings],
  )

  return (
    <main className="app-calendar-demo">
      <h1 className="app-calendar-demo__title">Calendar mode playground</h1>
      <p className="app-calendar-demo__hint">
        single / multiple에서 2026-04-15, 04-22, 05-01은 <code>isDateDisabled</code>로 비활성입니다. range 모드는 일
        단위 비활성을 지원하지 않습니다. Single 예시는 <code>locale=&quot;ko-KR&quot;</code>,{' '}
        <code>weekStartsOn=&#123;1&#125;</code>(월요일 시작)입니다.
      </p>

      <section className="app-calendar-demo__section">
        <h2>Single</h2>
        <Calendar
          className="mx-auto"
          mode="single"
          includeTime
          locale="ko-KR"
          weekStartsOn={1}
          messages={{
            selectDate: '날짜를 선택하세요',
            rangeIncompleteEnd: '?',
            rangeFromPrefix: '시작 ',
            rangeToPrefix: '종료 ',
            ariaOpenMonthPicker: '월 선택',
            ariaOpenDayGrid: '날짜 그리드',
            ariaCalendarGrid: '달력 그리드',
          }}
          value={singleSelected}
          onSelect={setSingleSelected}
          isDateDisabled={demoIsDateDisabled}
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
          isDateDisabled={demoIsDateDisabled}
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
