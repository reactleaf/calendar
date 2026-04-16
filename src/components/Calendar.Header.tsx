import { Temporal } from '@js-temporal/polyfill'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { toPlainDate, toSelectionValue } from '../core/calendarDate'
import type { DateValue } from '../core/api.types'
import { useCalendarContext } from './Calendar.context'
import { CalendarTimeInput } from './Calendar.TimeInput'
import type { CalendarSelectionSnapshot } from './Calendar.types'

interface CalendarHeaderProps {
  className?: string
  children?: ReactNode
}

function formatDay(day: Temporal.PlainDate, locale: string) {
  return day.toLocaleString(locale, { month: 'short', day: 'numeric' })
}

function labelsFromSnapshot(
  locale: string,
  snapshot: CalendarSelectionSnapshot,
): { headerYear: string | null; headerDate: string } {
  let headerYear: string | null = null
  let headerDate = ''

  switch (snapshot.mode) {
    case 'single': {
      const v = snapshot.value
      const selectedDay = v ? toPlainDate(v) : null
      headerYear = selectedDay ? String(selectedDay.year) : null
      headerDate = selectedDay ? formatDay(selectedDay, locale) : 'Select a date...'
      break
    }
    case 'multiple': {
      const sorted = [...snapshot.values].sort((a, b) => Temporal.PlainDate.compare(toPlainDate(a), toPlainDate(b)))
      const selectedValue = sorted[sorted.length - 1] ?? null
      const selectedDay = selectedValue ? toPlainDate(selectedValue) : null
      headerYear = selectedDay ? String(selectedDay.year) : null
      headerDate = selectedDay ? formatDay(selectedDay, locale) : 'Select a date...'
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
      break
    }
  }

  return { headerYear, headerDate }
}

function resolveEditorDateTime(value: DateValue | null) {
  if (value === null) return null
  if (value instanceof Temporal.PlainDateTime) return value
  return toSelectionValue(value, true) as Temporal.PlainDateTime
}

export function CalendarHeader({ className, children }: CalendarHeaderProps) {
  const { locale, mode, includeTime, minuteStep, selectionSnapshot, selection } = useCalendarContext()
  const { headerYear, headerDate } = useMemo(
    () => labelsFromSnapshot(locale, selectionSnapshot),
    [locale, selectionSnapshot],
  )
  const showTimeRow = includeTime === true

  const classes = ['calendar__header', className].filter(Boolean).join(' ')

  const singleTimeValue = selectionSnapshot.mode === 'single' ? resolveEditorDateTime(selectionSnapshot.value) : null
  const multipleLatestTime = useMemo(() => {
    if (selectionSnapshot.mode !== 'multiple') return null
    const sorted = [...selectionSnapshot.values].sort((a, b) =>
      Temporal.PlainDate.compare(toPlainDate(a), toPlainDate(b)),
    )
    const latest = sorted[sorted.length - 1] ?? null
    return resolveEditorDateTime(latest)
  }, [selectionSnapshot])
  const rangeStartTime =
    selectionSnapshot.mode === 'range' ? resolveEditorDateTime(selectionSnapshot.value.start) : null
  const rangeEndTime = selectionSnapshot.mode === 'range' ? resolveEditorDateTime(selectionSnapshot.value.end) : null

  if (children) return <div className={classes}>{children}</div>
  return (
    <div className={classes}>
      <div className="calendar__headerYear">{headerYear ?? ''}</div>
      <div className="calendar__headerDate">{headerDate}</div>
      {showTimeRow ? (
        <div className="calendar__headerTime">
          {mode === 'range' ? (
            <div className="calendar__timeEditorRow">
              <CalendarTimeInput
                label="Start"
                value={rangeStartTime}
                minuteStep={minuteStep}
                onTimeChange={(hour, minute) => selection.setRangeTime?.('start', hour, minute)}
              />
              <CalendarTimeInput
                label="End"
                value={rangeEndTime}
                minuteStep={minuteStep}
                onTimeChange={(hour, minute) => selection.setRangeTime?.('end', hour, minute)}
              />
            </div>
          ) : (
            <CalendarTimeInput
              value={mode === 'single' ? singleTimeValue : multipleLatestTime}
              minuteStep={minuteStep}
              onTimeChange={(hour, minute) => selection.setSelectedTime?.(hour, minute)}
            />
          )}
          <div className="calendar__timeHint">Tip: 값을 클릭해 편집, 센서 스크롤로 빠르게 조절</div>
        </div>
      ) : null}
    </div>
  )
}
