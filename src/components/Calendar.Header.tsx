import { Temporal } from '@js-temporal/polyfill'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import type { CalendarMessages, DateValue } from '../core/api.types'
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
  messages: CalendarMessages,
  snapshot: CalendarSelectionSnapshot,
): { headerYear: string | null; headerDate: string } {
  let headerYear: string | null = null
  let headerDate = ''

  switch (snapshot.mode) {
    case 'single': {
      const v = snapshot.value
      const selectedDay = v ? toPlainDate(v) : null
      headerYear = selectedDay ? String(selectedDay.year) : null
      headerDate = selectedDay ? formatDay(selectedDay, locale) : messages.selectDate
      break
    }
    case 'multiple': {
      const sorted = [...snapshot.values].sort((a, b) => Temporal.PlainDate.compare(toPlainDate(a), toPlainDate(b)))
      const selectedValue = sorted[sorted.length - 1] ?? null
      const selectedDay = selectedValue ? toPlainDate(selectedValue) : null
      headerYear = selectedDay ? String(selectedDay.year) : null
      headerDate = selectedDay ? formatDay(selectedDay, locale) : messages.selectDate
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
            ? `${formatDay(startDay, locale)} - ${messages.rangeIncompleteEnd}`
            : messages.selectDate
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
    messages,
    mode,
    includeTime,
    selectionSnapshot,
    selection,
    rangeHeaderValue,
    rangeHeaderPreviewActive,
    currentMonth,
    displayMode,
    setDisplayMode,
  } = useCalendarContext()
  /**
   * 헤더 라벨은 뷰 간 단방향 네비게이션이다.
   *  - 연도 라벨  → 'months' (월 피커 열기 전용; 재클릭 no-op)
   *  - 날짜 라벨  → 'days'   (일 그리드 열기 전용; 향후 'time' 뷰에서 복귀 경로)
   *
   * 이미 해당 모드면 no-op 으로 중복 setState 를 피한다.
   */
  const openMonthPicker = () => {
    if (displayMode === 'months') return
    setDisplayMode('months')
  }
  const openDaysView = () => {
    if (displayMode === 'days') return
    setDisplayMode('days')
  }
  const monthPickerOpen = displayMode === 'months'
  const daysViewOpen = displayMode === 'days'
  const { headerYear, headerDate } = useMemo(
    () => labelsFromSnapshot(locale, messages, selectionSnapshot),
    [locale, messages, selectionSnapshot],
  )
  const showTimeRow = includeTime === true

  const classes = ['calendar__header', showTimeRow ? 'calendar__header--hasTime' : '', className].filter(Boolean).join(' ')

  /**
   * 헤더 요소는 각자 연결된 뷰가 있다 (연도→months, 날짜→days, time editor→time).
   * 루트에 현재 active view 를 data attr 로 내려주면 자식 요소 쪽은 `data-view` 만
   * 표시하고, CSS 에서 불일치 요소를 dim 처리한다 → "지금 뭘 조작 중인가" 가 한눈에 보임.
   *
   * 참고: range 의 time 뷰에서는 from/to 양쪽 time editor 를 모두 active 로 둔다.
   * (편집 대상 구분은 TimeInput 내부 focus ring + scroll picker active pip 로 충분)
   */
  const headerDataAttrs = {
    'data-active-view': displayMode,
  }

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

  if (children)
    return (
      <div className={classes} {...headerDataAttrs}>
        {children}
      </div>
    )

  if (mode === 'range' && selectionSnapshot.mode === 'range' && rangeGrid) {
    return (
      <div className={classes} {...headerDataAttrs}>
        <div className="calendar__headerRange">
          <div className="calendar__headerRangeColumn">
            <button
              type="button"
              className="calendar__headerRangeEdge calendar__headerYearButton"
              onClick={openMonthPicker}
              aria-expanded={monthPickerOpen}
              aria-label={messages.ariaOpenMonthPicker}
              data-view="months"
            >
              {messages.rangeFromPrefix}
              {rangeGrid.fromYear}
            </button>
            <button
              type="button"
              className="calendar__headerRangeDate calendar__headerDateButton"
              onClick={openDaysView}
              aria-pressed={daysViewOpen}
              aria-label={messages.ariaOpenDayGrid}
              data-view="days"
            >
              {rangeGrid.fromDate}
            </button>
            {showTimeRow ? (
              <CalendarTimeInput
                ariaLabelPrefix="from"
                value={rangeStartTime}
                timeEditTarget="rangeStart"
                interactionLocked={rangeHeaderPreviewActive === true}
                onTimeChange={(hour, minute) => selection.setRangeTime?.('start', hour, minute)}
              />
            ) : null}
          </div>
          <div className="calendar__headerRangeColumn">
            <button
              type="button"
              className="calendar__headerRangeEdge calendar__headerYearButton"
              onClick={openMonthPicker}
              aria-expanded={monthPickerOpen}
              aria-label={messages.ariaOpenMonthPicker}
              data-view="months"
            >
              {messages.rangeToPrefix}
              {rangeGrid.toYear}
            </button>
            <button
              type="button"
              className="calendar__headerRangeDate calendar__headerDateButton"
              onClick={openDaysView}
              aria-pressed={daysViewOpen}
              aria-label={messages.ariaOpenDayGrid}
              data-view="days"
            >
              {rangeGrid.toDate}
            </button>
            {showTimeRow ? (
              <CalendarTimeInput
                ariaLabelPrefix="to"
                value={rangeEndTime}
                timeEditTarget="rangeEnd"
                interactionLocked={rangeHeaderPreviewActive === true}
                onTimeChange={(hour, minute) => selection.setRangeTime?.('end', hour, minute)}
              />
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  const displayYear = headerYear ?? String(currentMonth.year)
  return (
    <div className={classes} {...headerDataAttrs}>
      <button
        type="button"
        className="calendar__headerYear calendar__headerYearButton"
        onClick={openMonthPicker}
        aria-expanded={monthPickerOpen}
        aria-label={messages.ariaOpenMonthPicker}
        data-view="months"
      >
        {displayYear}
      </button>
      <button
        type="button"
        className="calendar__headerDate calendar__headerDateButton"
        onClick={openDaysView}
        aria-pressed={daysViewOpen}
        aria-label={messages.ariaOpenDayGrid}
        data-view="days"
      >
        {headerDate}
      </button>
      {showTimeRow ? (
        <div className="calendar__headerTime">
          <CalendarTimeInput
            value={mode === 'single' ? singleTimeValue : multipleLatestTime}
            timeEditTarget="primary"
            onTimeChange={(hour, minute) => selection.setSelectedTime?.(hour, minute)}
          />
        </div>
      ) : null}
    </div>
  )
}
