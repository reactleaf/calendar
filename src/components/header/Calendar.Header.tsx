import { Temporal } from '@js-temporal/polyfill'
import type { ReactNode } from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CalendarMessages, DateValue } from '../../core/api.types'
import { toPlainDate, toSelectionValue } from '../../core/calendarDate'
import { useCalendarContext, useCalendarViewportHandle } from '../Calendar.context'
import { CalendarTimeInput } from './Calendar.TimeInput'
import type { CalendarSelectionSnapshot } from '../Calendar.types'

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

function formatCountMessage(template: string, count: number) {
  return template.replaceAll('{count}', String(count))
}

function formatMultipleListLabel(value: DateValue, locale: string, includeTime: boolean) {
  const day = toPlainDate(value)
  const base = formatDay(day, locale)
  if (includeTime && value instanceof Temporal.PlainDateTime) {
    const t = value.toLocaleString(locale, { hour: 'numeric', minute: '2-digit' })
    return `${base} · ${t}`
  }
  return base
}

function rangeHeaderGrid(snapshot: Extract<CalendarSelectionSnapshot, { mode: 'range' }>, locale: string) {
  const startDay = snapshot.value.start ? toPlainDate(snapshot.value.start) : null
  const endDay = snapshot.value.end ? toPlainDate(snapshot.value.end) : null
  return {
    fromYear: startDay ? String(startDay.year) : '',
    toYear: endDay ? String(endDay.year) : '',
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
      headerDate = selectedDay ? formatDay(selectedDay, locale) : messages.blank
      break
    }
    case 'multiple': {
      const sorted = [...snapshot.values].sort((a, b) => Temporal.PlainDate.compare(toPlainDate(a), toPlainDate(b)))
      const primaryPlain = snapshot.primaryPlainDate
      const primaryValue =
        primaryPlain !== null ? snapshot.values.find((v) => toPlainDate(v).equals(primaryPlain)) : null
      const selectedValue = primaryValue ?? sorted[sorted.length - 1] ?? null
      const selectedDay = selectedValue ? toPlainDate(selectedValue) : null
      headerYear = selectedDay ? String(selectedDay.year) : null
      headerDate = selectedDay ? formatDay(selectedDay, locale) : messages.blank
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
            ? formatDay(startDay, locale)
            : messages.blank
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
  const viewportHandle = useCalendarViewportHandle()
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
    setFocusedDate,
    setMultiplePrimaryPlainDate,
  } = useCalendarContext()
  const [multipleListOpen, setMultipleListOpen] = useState(false)
  const multipleListChipRef = useRef<HTMLButtonElement>(null)
  const multipleListPopoverRef = useRef<HTMLDivElement>(null)
  const multipleListPanelId = useId()

  /**
   * 헤더 라벨은 뷰 간 단방향 네비게이션이다.
   *  - 연도 라벨  → 'months' (월 피커 열기 전용; 재클릭 no-op)
   *  - 날짜 라벨  → 'days'   (일 그리드 열기 전용; 향후 'time' 뷰에서 복귀 경로)
   *
   * 이미 해당 모드면 no-op 으로 중복 setState 를 피한다.
   */
  const openMonthPicker = () => {
    setMultipleListOpen(false)
    if (displayMode === 'months') return
    setDisplayMode('months')
  }
  const openDaysView = () => {
    setMultipleListOpen(false)
    if (displayMode === 'days') return
    setDisplayMode('days')
  }

  useEffect(() => {
    if (selectionSnapshot.mode !== 'multiple' || selectionSnapshot.values.length < 2) {
      setMultipleListOpen(false)
    }
  }, [selectionSnapshot])

  useEffect(() => {
    if (!multipleListOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMultipleListOpen(false)
        multipleListChipRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [multipleListOpen])

  useEffect(() => {
    if (!multipleListOpen) return
    const onPointerDown = (e: MouseEvent) => {
      const node = e.target as Node
      if (multipleListPopoverRef.current?.contains(node) || multipleListChipRef.current?.contains(node)) return
      setMultipleListOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [multipleListOpen])
  const monthPickerOpen = displayMode === 'months'
  const daysViewOpen = displayMode === 'days'
  const { headerYear, headerDate } = useMemo(
    () => labelsFromSnapshot(locale, messages, selectionSnapshot),
    [locale, messages, selectionSnapshot],
  )

  const isHeaderSelectionEmpty = useMemo(() => {
    if (mode === 'single' && selectionSnapshot.mode === 'single') return selectionSnapshot.value === null
    if (mode === 'multiple' && selectionSnapshot.mode === 'multiple') return selectionSnapshot.values.length === 0
    return false
  }, [mode, selectionSnapshot])

  const showTimeRow = includeTime === true && !isHeaderSelectionEmpty
  /** 시간 행이 비어 있어도 패딩·간격은 `includeTime` 기준으로 맞춰 헤더 높이를 고정한다. */
  const useTimeHeaderLayout = includeTime === true
  const dateButtonClass = [
    'calendar__headerDate',
    'calendar__headerDateButton',
    isHeaderSelectionEmpty ? 'calendar__headerDate--placeholder' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const classes = ['calendar__header', useTimeHeaderLayout ? 'calendar__header--hasTime' : '', className]
    .filter(Boolean)
    .join(' ')

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
    const primaryPlain = selectionSnapshot.primaryPlainDate
    const primary =
      primaryPlain !== null ? selectionSnapshot.values.find((v) => toPlainDate(v).equals(primaryPlain)) : null
    const value = primary ?? sorted[sorted.length - 1] ?? null
    return resolveEditorDateTime(value)
  }, [selectionSnapshot])

  const multipleSortedValues = useMemo(() => {
    if (selectionSnapshot.mode !== 'multiple') return []
    return [...selectionSnapshot.values].sort((a, b) => Temporal.PlainDate.compare(toPlainDate(a), toPlainDate(b)))
  }, [selectionSnapshot])

  const rangeHeaderSource =
    mode === 'range' && selectionSnapshot.mode === 'range' ? (rangeHeaderValue ?? selectionSnapshot.value) : null
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
            {includeTime ? (
              <div className="calendar__headerTime">
                {showTimeRow ? (
                  <CalendarTimeInput
                    ariaLabelPrefix="from"
                    value={rangeStartTime}
                    timeEditTarget="rangeStart"
                    interactionLocked={rangeHeaderPreviewActive === true}
                    onTimeChange={(hour, minute) => selection.setRangeTime?.('start', hour, minute)}
                  />
                ) : (
                  <div className="calendar__headerTimePlaceholder" aria-hidden />
                )}
              </div>
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
            {includeTime ? (
              <div className="calendar__headerTime">
                {showTimeRow ? (
                  <CalendarTimeInput
                    ariaLabelPrefix="to"
                    value={rangeEndTime}
                    timeEditTarget="rangeEnd"
                    interactionLocked={rangeHeaderPreviewActive === true}
                    onTimeChange={(hour, minute) => selection.setRangeTime?.('end', hour, minute)}
                  />
                ) : (
                  <div className="calendar__headerTimePlaceholder" aria-hidden />
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  const displayYear = headerYear ?? String(currentMonth.year)
  const showMultipleMoreChip =
    mode === 'multiple' && selectionSnapshot.mode === 'multiple' && selectionSnapshot.values.length > 1
  const multipleExtraCount =
    selectionSnapshot.mode === 'multiple' ? Math.max(0, selectionSnapshot.values.length - 1) : 0

  return (
    <div className={classes} {...headerDataAttrs}>
      {!isHeaderSelectionEmpty ? (
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
      ) : null}
      {showMultipleMoreChip ? (
        <div className="calendar__headerDateRow">
          <button
            type="button"
            className={dateButtonClass}
            onClick={openDaysView}
            aria-pressed={daysViewOpen}
            aria-label={messages.ariaOpenDayGrid}
            data-view="days"
          >
            {headerDate}
          </button>
          <div className="calendar__headerMultipleAnchor">
            <button
              ref={multipleListChipRef}
              type="button"
              className="calendar__headerMultipleMore calendar__headerDateButton"
              data-view="days"
              aria-expanded={multipleListOpen}
              aria-controls={multipleListPanelId}
              aria-label={formatCountMessage(messages.ariaOpenMultipleSelectedList, multipleExtraCount)}
              onClick={() => setMultipleListOpen((open) => !open)}
            >
              {formatCountMessage('+{count}', multipleExtraCount)}
            </button>
            {multipleListOpen ? (
              <div
                ref={multipleListPopoverRef}
                id={multipleListPanelId}
                className="calendar__headerMultiplePopover"
                role="region"
                aria-label={messages.ariaMultipleSelectedDatesPanel}
              >
                <ul className="calendar__headerMultipleList">
                  {multipleSortedValues.map((v) => (
                    <li key={v.toString()} className="calendar__headerMultipleListItem">
                      <button
                        type="button"
                        className="calendar__headerMultipleListButton"
                        onClick={() => {
                          setMultipleListOpen(false)
                          const day = toPlainDate(v)
                          setMultiplePrimaryPlainDate?.(day)
                          setFocusedDate(day)
                          viewportHandle.current?.scrollToDate(day)
                          if (displayMode !== 'days') setDisplayMode('days')
                        }}
                      >
                        {formatMultipleListLabel(v, locale, showTimeRow)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={dateButtonClass}
          onClick={openDaysView}
          aria-pressed={daysViewOpen}
          aria-label={messages.ariaOpenDayGrid}
          data-view="days"
        >
          {headerDate}
        </button>
      )}
      {includeTime ? (
        <div className="calendar__headerTime">
          {showTimeRow ? (
            <CalendarTimeInput
              value={mode === 'single' ? singleTimeValue : multipleLatestTime}
              timeEditTarget="primary"
              onTimeChange={(hour, minute) => selection.setSelectedTime?.(hour, minute)}
            />
          ) : (
            <div className="calendar__headerTimePlaceholder" aria-hidden />
          )}
        </div>
      ) : null}
    </div>
  )
}
