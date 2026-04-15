import { Temporal } from '@js-temporal/polyfill'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { toPlainDate } from '../core/calendarDate'
import type { CalendarSelectionSnapshot } from './Calendar.types'
import { useCalendarContext } from './Calendar.context'

interface CalendarHeaderProps {
  className?: string
  children?: ReactNode
}

function formatDay(day: Temporal.PlainDate, locale: string) {
  return day.toLocaleString(locale, { month: 'short', day: 'numeric' })
}

function formatTime(value: Temporal.PlainDateTime, locale: string) {
  return value.toLocaleString(locale, { hour: 'numeric', minute: '2-digit' })
}

function labelsFromSnapshot(
  locale: string,
  includeTime: boolean | undefined,
  snapshot: CalendarSelectionSnapshot,
): { headerYear: string | null; headerDate: string; showTimeRow: boolean; headerTime: string | null } {
  const showTimeRow = includeTime === true
  let headerYear: string | null = null
  let headerDate = ''
  let headerTime: string | null = null

  switch (snapshot.mode) {
    case 'single': {
      const v = snapshot.value
      const selectedDay = v ? toPlainDate(v) : null
      headerYear = selectedDay ? String(selectedDay.year) : null
      headerDate = selectedDay ? formatDay(selectedDay, locale) : 'Select a date...'
      if (showTimeRow) {
        headerTime = v instanceof Temporal.PlainDateTime ? formatTime(v, locale) : 'Time selection coming soon'
      }
      break
    }
    case 'multiple': {
      const sorted = [...snapshot.values].sort((a, b) => Temporal.PlainDate.compare(toPlainDate(a), toPlainDate(b)))
      const selectedValue = sorted[sorted.length - 1] ?? null
      const selectedDay = selectedValue ? toPlainDate(selectedValue) : null
      headerYear = selectedDay ? String(selectedDay.year) : null
      headerDate = selectedDay ? formatDay(selectedDay, locale) : 'Select a date...'
      if (showTimeRow) {
        headerTime =
          selectedValue instanceof Temporal.PlainDateTime ? formatTime(selectedValue, locale) : 'Time selection coming soon'
      }
      break
    }
    case 'range': {
      const { start, end } = snapshot.value
      const startDay = start ? toPlainDate(start) : null
      const endDay = end ? toPlainDate(end) : null
      headerYear =
        startDay && endDay
          ? startDay.year === endDay.year
            ? String(startDay.year)
            : `${startDay.year} - ${endDay.year}`
          : startDay
            ? String(startDay.year)
            : null
      headerDate =
        startDay && endDay
          ? `${formatDay(startDay, locale)} - ${formatDay(endDay, locale)}`
          : startDay
            ? `${formatDay(startDay, locale)} - ?`
            : 'Select a date...'
      if (showTimeRow) {
        if (start instanceof Temporal.PlainDateTime && end instanceof Temporal.PlainDateTime) {
          headerTime = `${formatTime(start, locale)} - ${formatTime(end, locale)}`
        } else if (start instanceof Temporal.PlainDateTime) {
          headerTime = `${formatTime(start, locale)} - ?`
        } else {
          headerTime = 'Time selection coming soon'
        }
      }
      break
    }
  }

  return { headerYear, headerDate, showTimeRow, headerTime }
}

export function CalendarHeader({ className, children }: CalendarHeaderProps) {
  const { locale, includeTime, selectionSnapshot } = useCalendarContext()
  const { headerYear, headerDate, showTimeRow, headerTime } = useMemo(
    () => labelsFromSnapshot(locale, includeTime, selectionSnapshot),
    [locale, includeTime, selectionSnapshot],
  )

  const classes = ['calendar__header', className].filter(Boolean).join(' ')
  if (children) return <div className={classes}>{children}</div>

  return (
    <div className={classes}>
      <div className="calendar__headerYear">{headerYear ?? ''}</div>
      <div className="calendar__headerDate">{headerDate}</div>
      {showTimeRow ? <div className="calendar__headerTime">{headerTime ?? 'Time selection coming soon'}</div> : null}
    </div>
  )
}
