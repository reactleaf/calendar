import '@/styles/doc-example.css'
import { Temporal } from '@js-temporal/polyfill'
import type { CalendarFormatters, DateValue } from '@reactleaf/calendar'
import { Calendar } from '@reactleaf/calendar'
import { useState } from 'react'

const padTimePart = (value: number) => String(value).padStart(2, '0')

const japaneseFormatters: CalendarFormatters = {
  year: (year) => `${year}年`,
  month: (month) => `${month}月`,
  monthYear: (month) => `${month.year}年 ${month.month}月`,
  monthDate: (day) => `${day.month}月 ${day.day}日`,
  date: (day) => `${day.year}年 ${day.month}月 ${day.day}日`,
  dateTime: (value) =>
    `${value.year}年 ${value.month}月 ${value.day}日 ${padTimePart(value.hour)}:${padTimePart(value.minute)}`,
  todayLabel: () => '今日',
}

export function LocaleWeekStartExample() {
  const [date, setDate] = useState<DateValue | null>(Temporal.PlainDate.from('2026-04-15'))

  return (
    <div className="doc-example not-prose">
      <div className="doc-example__card">
        <Calendar
          className="doc-example__calendar"
          mode="single"
          locale="ja-JP"
          formatters={japaneseFormatters}
          value={date}
          onSelect={setDate}
        />
      </div>
      <output className="doc-example__output" aria-live="polite">
        <span className="doc-example__outputLabel">Selected</span>{' '}
        <span className="doc-example__outputValue">{date === null ? '—' : date.toString()}</span>
      </output>
    </div>
  )
}
