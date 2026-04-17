import { Temporal } from '@js-temporal/polyfill'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import type { DateValue } from '../core/api.types'
import { toPlainDate, toSelectionValue } from '../core/calendarDate'
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

function formatRangeColumnDate(day: Temporal.PlainDate | null, locale: string) {
  if (!day) return '—'
  return day.toLocaleString(locale, { month: 'long', day: 'numeric' })
}

function rangeHeaderGrid(snapshot: Extract<CalendarSelectionSnapshot, { mode: 'range' }>, locale: string) {
  const startDay = snapshot.value.start ? toPlainDate(snapshot.value.start) : null
  const endDay = snapshot.value.end ? toPlainDate(snapshot.value.end) : null
  return {
    fromYear: startDay ? String(startDay.year) : '—',
    toYear: endDay ? String(endDay.year) : '—',
    fromDate: formatRangeColumnDate(startDay, locale),
    toDate: formatRangeColumnDate(endDay, locale),
  }
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
  const {
    locale,
    mode,
    includeTime,
    minuteStep,
    selectionSnapshot,
    selection,
    rangeHeaderValue,
    rangeHeaderPreviewActive,
  } = useCalendarContext()
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

  const rangeHeaderSource =
    mode === 'range' && selectionSnapshot.mode === 'range'
      ? (rangeHeaderValue ?? selectionSnapshot.value)
      : null
  const rangeStartTime = rangeHeaderSource ? resolveEditorDateTime(rangeHeaderSource.start) : null
  const rangeEndTime = rangeHeaderSource ? resolveEditorDateTime(rangeHeaderSource.end) : null

  const rangeGrid = useMemo(() => {
    if (mode !== 'range' || selectionSnapshot.mode !== 'range' || !rangeHeaderSource) return null
    return rangeHeaderGrid({ mode: 'range', value: rangeHeaderSource }, locale)
  }, [locale, mode, rangeHeaderSource, selectionSnapshot.mode])

  if (children) return <div className={classes}>{children}</div>

  if (mode === 'range' && selectionSnapshot.mode === 'range' && rangeGrid) {
    return (
      <div className={classes}>
        <div className="calendar__headerRange">
          <div className="calendar__headerRangeEdge">from {rangeGrid.fromYear}</div>
          <div className="calendar__headerRangeEdge">to {rangeGrid.toYear}</div>
          <div className="calendar__headerRangeDate">{rangeGrid.fromDate}</div>
          <div className="calendar__headerRangeDate">{rangeGrid.toDate}</div>
          {showTimeRow ? (
            <>
              <CalendarTimeInput
                ariaLabelPrefix="from"
                value={rangeStartTime}
                minuteStep={minuteStep}
                interactionLocked={rangeHeaderPreviewActive === true}
                onTimeChange={(hour, minute) => selection.setRangeTime?.('start', hour, minute)}
              />
              <CalendarTimeInput
                ariaLabelPrefix="to"
                value={rangeEndTime}
                minuteStep={minuteStep}
                interactionLocked={rangeHeaderPreviewActive === true}
                onTimeChange={(hour, minute) => selection.setRangeTime?.('end', hour, minute)}
              />
            </>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={classes}>
      <div className="calendar__headerYear">{headerYear ?? ''}</div>
      <div className="calendar__headerDate">{headerDate}</div>
      {showTimeRow ? (
        <div className="calendar__headerTime">
          <CalendarTimeInput
            value={mode === 'single' ? singleTimeValue : multipleLatestTime}
            minuteStep={minuteStep}
            onTimeChange={(hour, minute) => selection.setSelectedTime?.(hour, minute)}
          />
          <div className="calendar__timeHint">Tip: 값을 클릭해 편집, 센서 스크롤로 빠르게 조절</div>
        </div>
      ) : null}
    </div>
  )
}
