import { Temporal } from '@js-temporal/polyfill'
import type { ReactNode, RefObject } from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type {
  CalendarFormatContext,
  CalendarFormatters,
  CalendarMessages,
  CalendarRangeValue,
  DateValue,
} from '../../core/api.types'
import { toPlainDate, toSelectionValue } from '../../core/calendarDate'
import { useCalendarContext, useCalendarViewportHandle } from '../Calendar.context'
import { formatPlainDateShort, formatPlainTime } from '../Calendar.utils'
import type {
  CalendarDisplayMode,
  CalendarSelectionRuntime,
  CalendarSelectionSnapshot,
  CalendarViewportHandle,
} from '../Calendar.types'
import { CalendarTimeInput } from './Calendar.TimeInput'

interface CalendarHeaderProps {
  className?: string
  children?: ReactNode
}

interface HeaderModeCommonProps {
  locale: string
  messages: CalendarMessages
  formatters?: CalendarFormatters
  includeTime?: boolean
  selection: CalendarSelectionRuntime
  currentMonth: Temporal.PlainYearMonth
  displayMode: CalendarDisplayMode
  setDisplayMode: (mode: CalendarDisplayMode) => void
  headerYear: string | null
  headerDate: string
  isHeaderSelectionEmpty: boolean
  showTimeRow: boolean
  dateButtonClass: string
  monthPickerOpen: boolean
  daysViewOpen: boolean
  openMonthPicker: () => void
  openDaysView: () => void
}

function formatDay(day: Temporal.PlainDate, ctx: CalendarFormatContext, formatters?: CalendarFormatters) {
  return formatters?.date?.(day, ctx) ?? formatPlainDateShort(day, ctx.locale)
}

function formatDateTime(value: Temporal.PlainDateTime, ctx: CalendarFormatContext, formatters?: CalendarFormatters) {
  return (
    formatters?.dateTime?.(value, ctx) ??
    `${formatDay(value.toPlainDate(), ctx, formatters)} · ${formatPlainTime(value, ctx.locale)}`
  )
}

function formatCountMessage(template: string, count: number) {
  return template.replaceAll('{count}', String(count))
}

function formatMultipleListLabel(
  value: DateValue,
  ctx: CalendarFormatContext,
  includeTime: boolean,
  formatters?: CalendarFormatters,
) {
  const day = toPlainDate(value)
  if (includeTime && value instanceof Temporal.PlainDateTime) {
    return formatDateTime(value, ctx, formatters)
  }
  return formatDay(day, ctx, formatters)
}

function rangeHeaderGrid(
  startDay: Temporal.PlainDate | null,
  endDay: Temporal.PlainDate | null,
  ctx: CalendarFormatContext,
  messages: CalendarMessages,
  formatters?: CalendarFormatters,
) {
  return {
    fromYear: startDay ? String(startDay.year) : '',
    toYear: endDay ? String(endDay.year) : '',
    fromDate: startDay ? formatDay(startDay, ctx, formatters) : messages.rangeFromPlaceholder,
    toDate: endDay ? formatDay(endDay, ctx, formatters) : messages.rangeToPlaceholder,
  }
}

function labelsFromSnapshot(
  locale: string,
  messages: CalendarMessages,
  formatters: CalendarFormatters | undefined,
  snapshot: CalendarSelectionSnapshot,
): { headerYear: string | null; headerDate: string } {
  const ctx = { locale }
  let headerYear: string | null = null
  let headerDate = ''

  switch (snapshot.mode) {
    case 'single': {
      const selectedDay = snapshot.plain.value
      headerYear = selectedDay ? String(selectedDay.year) : null
      headerDate = selectedDay ? formatDay(selectedDay, ctx, formatters) : messages.blank
      break
    }
    case 'multiple': {
      const selectedDay = snapshot.plain.primary ?? snapshot.plain.values.at(-1) ?? null
      headerYear = selectedDay ? String(selectedDay.year) : null
      headerDate = selectedDay ? formatDay(selectedDay, ctx, formatters) : messages.blank
      break
    }
    case 'range': {
      const startDay = snapshot.plain.start
      const endDay = snapshot.plain.end
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
          ? `${formatDay(startDay, ctx, formatters)} - ${formatDay(endDay, ctx, formatters)}`
          : startDay
            ? formatDay(startDay, ctx, formatters)
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

function isHeaderSelectionEmpty(mode: CalendarSelectionSnapshot['mode'], snapshot: CalendarSelectionSnapshot) {
  if (mode === 'single' && snapshot.mode === 'single') return snapshot.value === null
  if (mode === 'multiple' && snapshot.mode === 'multiple') return snapshot.values.length === 0
  return false
}

function CalendarHeaderSingle({
  selectionSnapshot,
  selection,
  includeTime,
  currentMonth,
  headerYear,
  headerDate,
  isHeaderSelectionEmpty,
  showTimeRow,
  dateButtonClass,
  monthPickerOpen,
  daysViewOpen,
  openMonthPicker,
  openDaysView,
  messages,
}: HeaderModeCommonProps & {
  selectionSnapshot: Extract<CalendarSelectionSnapshot, { mode: 'single' }>
}) {
  const singleTimeValue = selectionSnapshot.mode === 'single' ? resolveEditorDateTime(selectionSnapshot.value) : null
  const displayYear = headerYear ?? String(currentMonth.year)

  return (
    <>
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
      {includeTime ? (
        <div className="calendar__headerTime">
          {showTimeRow ? (
            <CalendarTimeInput
              value={singleTimeValue}
              timeEditTarget="primary"
              onTimeChange={(hour, minute) => selection.setSelectedTime?.(hour, minute)}
            />
          ) : (
            <div className="calendar__headerTimePlaceholder" aria-hidden />
          )}
        </div>
      ) : null}
    </>
  )
}

function CalendarHeaderMultiple({
  selectionSnapshot,
  viewportHandle,
  setFocusedDate,
  setMultiplePrimaryPlainDate,
  selection,
  locale,
  messages,
  formatters,
  includeTime,
  currentMonth,
  displayMode,
  setDisplayMode,
  headerYear,
  headerDate,
  isHeaderSelectionEmpty,
  showTimeRow,
  dateButtonClass,
  monthPickerOpen,
  daysViewOpen,
  openMonthPicker,
  openDaysView,
}: HeaderModeCommonProps & {
  selectionSnapshot: Extract<CalendarSelectionSnapshot, { mode: 'multiple' }>
  viewportHandle: RefObject<CalendarViewportHandle | null>
  setFocusedDate: (next: Temporal.PlainDate) => void
  setMultiplePrimaryPlainDate?: (date: Temporal.PlainDate) => void
}) {
  const [multipleListOpen, setMultipleListOpen] = useState(false)
  const multipleListChipRef = useRef<HTMLButtonElement>(null)
  const multipleListPopoverRef = useRef<HTMLDivElement>(null)
  const multipleListPanelId = useId()

  useEffect(() => {
    if (selectionSnapshot.values.length < 2) setMultipleListOpen(false)
  }, [selectionSnapshot.values.length])

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

  const multipleEntries = useMemo(
    () =>
      selectionSnapshot.values
        .map((value, index) => ({
          value,
          plain: selectionSnapshot.plain.values[index] ?? toPlainDate(value),
        }))
        .sort((a, b) => Temporal.PlainDate.compare(a.plain, b.plain)),
    [selectionSnapshot],
  )

  const multipleLatestTime = useMemo(() => {
    const primaryIndex =
      selectionSnapshot.plain.primary === null
        ? -1
        : selectionSnapshot.plain.values.findIndex((value) => value.equals(selectionSnapshot.plain.primary!))
    const value =
      (primaryIndex >= 0 ? selectionSnapshot.values[primaryIndex] : null) ?? multipleEntries.at(-1)?.value ?? null
    return resolveEditorDateTime(value)
  }, [multipleEntries, selectionSnapshot])

  const handleOpenMonthPicker = () => {
    setMultipleListOpen(false)
    openMonthPicker()
  }
  const handleOpenDaysView = () => {
    setMultipleListOpen(false)
    openDaysView()
  }
  const displayYear = headerYear ?? String(currentMonth.year)
  const showMultipleMoreChip = selectionSnapshot.values.length > 1
  const multipleExtraCount = Math.max(0, selectionSnapshot.values.length - 1)

  return (
    <>
      {!isHeaderSelectionEmpty ? (
        <button
          type="button"
          className="calendar__headerYear calendar__headerYearButton"
          onClick={handleOpenMonthPicker}
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
            onClick={handleOpenDaysView}
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
                  {multipleEntries.map(({ value, plain }) => (
                    <li key={value.toString()} className="calendar__headerMultipleListItem">
                      <button
                        type="button"
                        className="calendar__headerMultipleListButton"
                        onClick={() => {
                          setMultipleListOpen(false)
                          setMultiplePrimaryPlainDate?.(plain)
                          setFocusedDate(plain)
                          viewportHandle.current?.scrollToDate(plain)
                          if (displayMode !== 'days') setDisplayMode('days')
                        }}
                      >
                        {formatMultipleListLabel(value, { locale }, showTimeRow, formatters)}
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
          onClick={handleOpenDaysView}
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
              value={multipleLatestTime}
              timeEditTarget="primary"
              onTimeChange={(hour, minute) => selection.setSelectedTime?.(hour, minute)}
            />
          ) : (
            <div className="calendar__headerTimePlaceholder" aria-hidden />
          )}
        </div>
      ) : null}
    </>
  )
}

function CalendarHeaderRange({
  selectionSnapshot,
  rangeHeaderValue,
  rangeHeaderPreviewActive,
  selection,
  locale,
  messages,
  formatters,
  includeTime,
  showTimeRow,
  monthPickerOpen,
  daysViewOpen,
  openMonthPicker,
  openDaysView,
}: HeaderModeCommonProps & {
  selectionSnapshot: Extract<CalendarSelectionSnapshot, { mode: 'range' }>
  rangeHeaderValue?: CalendarRangeValue
  rangeHeaderPreviewActive?: boolean
}) {
  const rangeHeaderSource = rangeHeaderValue ?? selectionSnapshot.value
  const rangeStartTime = resolveEditorDateTime(rangeHeaderSource.start)
  const rangeEndTime = resolveEditorDateTime(rangeHeaderSource.end)
  const rangeGrid = useMemo(() => {
    const startDay = rangeHeaderSource.start ? toPlainDate(rangeHeaderSource.start) : selectionSnapshot.plain.start
    const endDay = rangeHeaderSource.end ? toPlainDate(rangeHeaderSource.end) : selectionSnapshot.plain.end
    return rangeHeaderGrid(startDay, endDay, { locale }, messages, formatters)
  }, [formatters, locale, messages, rangeHeaderSource, selectionSnapshot])

  return (
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
  )
}

export function CalendarHeader({ className, children }: CalendarHeaderProps) {
  const viewportHandle = useCalendarViewportHandle()
  const {
    locale,
    messages,
    formatters,
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
    () => labelsFromSnapshot(locale, messages, formatters, selectionSnapshot),
    [formatters, locale, messages, selectionSnapshot],
  )
  const selectionEmpty = useMemo(() => isHeaderSelectionEmpty(mode, selectionSnapshot), [mode, selectionSnapshot])
  const showTimeRow = includeTime === true && !selectionEmpty
  /** 시간 행이 비어 있어도 패딩·간격은 `includeTime` 기준으로 맞춰 헤더 높이를 고정한다. */
  const useTimeHeaderLayout = includeTime === true
  const dateButtonClass = [
    'calendar__headerDate',
    'calendar__headerDateButton',
    selectionEmpty ? 'calendar__headerDate--placeholder' : '',
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

  if (children)
    return (
      <div className={classes} {...headerDataAttrs}>
        {children}
      </div>
    )

  const commonProps: HeaderModeCommonProps = {
    locale,
    messages,
    formatters,
    includeTime,
    selection,
    currentMonth,
    displayMode,
    setDisplayMode,
    headerYear,
    headerDate,
    isHeaderSelectionEmpty: selectionEmpty,
    showTimeRow,
    dateButtonClass,
    monthPickerOpen,
    daysViewOpen,
    openMonthPicker,
    openDaysView,
  }

  return (
    <div className={classes} {...headerDataAttrs}>
      {mode === 'range' && selectionSnapshot.mode === 'range' ? (
        <CalendarHeaderRange
          {...commonProps}
          selectionSnapshot={selectionSnapshot}
          rangeHeaderValue={rangeHeaderValue}
          rangeHeaderPreviewActive={rangeHeaderPreviewActive}
        />
      ) : mode === 'multiple' && selectionSnapshot.mode === 'multiple' ? (
        <CalendarHeaderMultiple
          {...commonProps}
          selectionSnapshot={selectionSnapshot}
          viewportHandle={viewportHandle}
          setFocusedDate={setFocusedDate}
          setMultiplePrimaryPlainDate={setMultiplePrimaryPlainDate}
        />
      ) : selectionSnapshot.mode === 'single' ? (
        <CalendarHeaderSingle {...commonProps} selectionSnapshot={selectionSnapshot} />
      ) : null}
    </div>
  )
}
