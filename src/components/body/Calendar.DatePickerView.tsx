import { Temporal } from '@js-temporal/polyfill'
import { clsx } from 'clsx'
import type { UIEvent } from 'react'
import { forwardRef, memo, useCallback, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CalendarMessages, CalendarMode } from '../../core/api.types'
import type { WeekStartsOn } from '../../core/monthGrid'
import { useCalendarKeyboardNavigation } from '../../hooks/useCalendarKeyboardNavigation'
import { useInfiniteMonthScroll } from '../../hooks/useInfiniteMonthScroll'
import { useSuppressMonthOverlayOnReturnToDays } from '../../hooks/useSuppressMonthOverlayOnReturnToDays'
import { useCalendarContext } from '../Calendar.context'
import { buildMonthRowRenderInfo, calculateCellState } from './Calendar.DatePickerView.utils'
import { CalendarDayCell } from './Calendar.DayCell'
import { CalendarTodayButton } from './Calendar.TodayButton'
import type { CalendarDisplayMode, CalendarViewportHandle, DateViewportPlacement } from '../Calendar.types'
import { monthLabel, monthRows, monthShortLabel, plainYearMonthAt } from '../Calendar.utils'
import { CalendarWeekdays } from './Calendar.Weekdays'

interface CalendarDatePickerViewProps {
  mode: CalendarMode
  locale: string
  weekStartsOn: WeekStartsOn
  messages: CalendarMessages
  keyboardNavigation: boolean
  minDay: Temporal.PlainDate
  maxDay: Temporal.PlainDate
  minMonth: Temporal.PlainYearMonth
  maxMonth: Temporal.PlainYearMonth
  focusedDate: Temporal.PlainDate
  displayMode: CalendarDisplayMode
  setCurrentMonth: (month: Temporal.PlainYearMonth) => void
  setFocusedDate: (date: Temporal.PlainDate) => void
  onDateHover: (date: Temporal.PlainDate) => void
  onDateClick: (date: Temporal.PlainDate) => void
  selectDate: (date: Temporal.PlainDate, source?: 'click' | 'keyboard') => void
  previewDate?: (date: Temporal.PlainDate, source?: 'hover' | 'keyboard') => void
  isDateDisabled: (date: Temporal.PlainDate) => boolean
}

interface CalendarMonthRowProps {
  month: Temporal.PlainYearMonth
  idPrefix: string
  onDateHover: (date: Temporal.PlainDate) => void
  onDateClick: (date: string) => void
  isDateDisabled: (date: Temporal.PlainDate) => boolean
  index: number
}

const CalendarDatePickerView = forwardRef<CalendarViewportHandle, CalendarDatePickerViewProps>(function CalendarDatePickerView({
  mode,
  locale,
  weekStartsOn,
  messages,
  keyboardNavigation,
  minDay,
  maxDay,
  minMonth,
  maxMonth,
  focusedDate,
  displayMode,
  setCurrentMonth,
  setFocusedDate,
  onDateHover,
  onDateClick,
  selectDate,
  previewDate,
  isDateDisabled,
}: CalendarDatePickerViewProps, ref) {
  const { today } = useCalendarContext()
  const minMonthYear = minMonth.year
  const minMonthMonth = minMonth.month
  const overlaySuppressUntilRef = useRef(0)
  const todayPlacementFrameRef = useRef(0)
  const todayPlacementRef = useRef<DateViewportPlacement | null>(null)
  const [todayPlacement, setTodayPlacement] = useState<DateViewportPlacement | null>(null)
  const {
    monthVirtualizer,
    isScrolling,
    scrollRef,
    handleScroll,
    scrollToMonth,
    scrollToDate,
    getDateViewportPlacement,
  } = useInfiniteMonthScroll({
    locale,
    weekStartsOn,
    initialMonth: focusedDate.toPlainYearMonth(),
    minMonth,
    maxMonth,
    onMonthChange: setCurrentMonth,
    overlaySuppressUntilRef,
  })

  useSuppressMonthOverlayOnReturnToDays(displayMode, overlaySuppressUntilRef)

  const idPrefix = useId()
  const activeDescendantId = `${idPrefix}-day-${focusedDate.toString()}`
  const virtualItems = monthVirtualizer.getVirtualItems()
  const totalSize = monthVirtualizer.getTotalSize()

  const handleKeyDown = useCalendarKeyboardNavigation({
    enabled: keyboardNavigation,
    mode,
    focusedDate,
    minDay,
    maxDay,
    setFocusedDate,
    scrollToDate,
    selectDate,
    previewDate,
  })

  const handleDateClick = useCallback(
    (date: string) => {
      onDateClick(Temporal.PlainDate.from(date))
      queueMicrotask(() => {
        if (keyboardNavigation) scrollRef.current?.focus({ preventScroll: true })
      })
    },
    [keyboardNavigation, onDateClick, scrollRef],
  )

  useImperativeHandle(
    ref,
    () => ({
      scrollToMonth: (target) => scrollToMonth(target, 'center'),
      scrollToDate,
    }),
    [scrollToDate, scrollToMonth],
  )

  const updateTodayPlacement = useCallback(() => {
    const next = getDateViewportPlacement(today)
    if (todayPlacementRef.current === next) return
    todayPlacementRef.current = next
    setTodayPlacement(next)
  }, [getDateViewportPlacement, today])

  const scheduleTodayPlacementUpdate = useCallback(() => {
    if (todayPlacementFrameRef.current !== 0) return
    todayPlacementFrameRef.current = requestAnimationFrame(() => {
      todayPlacementFrameRef.current = 0
      updateTodayPlacement()
    })
  }, [updateTodayPlacement])

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return

    updateTodayPlacement()
    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(scheduleTodayPlacementUpdate)
      ro.observe(scrollEl)
    }

    return () => {
      cancelAnimationFrame(todayPlacementFrameRef.current)
      todayPlacementFrameRef.current = 0
      ro?.disconnect()
    }
  }, [scheduleTodayPlacementUpdate, scrollRef, updateTodayPlacement])

  const handleScrollEvent = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      handleScroll(event)
      scheduleTodayPlacementUpdate()
    },
    [handleScroll, scheduleTodayPlacementUpdate],
  )

  return (
    <>
      <CalendarWeekdays />
      <CalendarTodayButton
        scrollToDate={scrollToDate}
        scrollRef={scrollRef}
        placement={todayPlacement}
      />
      <div
        ref={scrollRef}
        className={`calendar__scroll${isScrolling ? ' is-scrolling' : ''}`}
        role="grid"
        tabIndex={keyboardNavigation ? 0 : -1}
        aria-activedescendant={activeDescendantId}
        onScroll={handleScrollEvent}
        onKeyDown={handleKeyDown}
        aria-label={messages.ariaCalendarGrid}
      >
        <div className="calendar__virtualMonths" style={{ height: totalSize, position: 'relative', width: '100%' }}>
          {virtualItems.map((vi) => {
            const month = plainYearMonthAt(minMonthYear, minMonthMonth, vi.index)
            const hasPrevious = vi.index > 0

            return (
              <section
                key={vi.index}
                className={`calendar__month${hasPrevious ? ' calendar__month--hasPrevious' : ''}`}
                data-index={vi.index}
                style={{
                  position: 'absolute',
                  top: `${vi.start}px`,
                  left: 0,
                  width: '100%',
                }}
              >
                <CalendarMonthRow
                  month={month}
                  idPrefix={idPrefix}
                  onDateHover={onDateHover}
                  onDateClick={handleDateClick}
                  isDateDisabled={isDateDisabled}
                  index={vi.index}
                />
              </section>
            )
          })}
        </div>
      </div>
    </>
  )
})

function CalendarMonthRow({ month, idPrefix, onDateHover, onDateClick, isDateDisabled, index }: CalendarMonthRowProps) {
  const {
    mode,
    locale,
    today,
    focusedDate,
    messages,
    weekStartsOn,
    selectionSnapshot,
    rangeHeaderValue,
    rangeHeaderPreviewActive,
  } = useCalendarContext()

  const monthYear = month.year
  const monthNumber = month.month
  const rows = useMemo(
    () => monthRows(Temporal.PlainYearMonth.from({ year: monthYear, month: monthNumber }), weekStartsOn),
    [monthNumber, monthYear, weekStartsOn],
  )
  const lastHoveredDateRef = useRef<string | null>(null)
  const monthShort = monthShortLabel(month, locale)
  const monthHeading = monthLabel(month, locale)
  const focusedDateString = focusedDate.toString()
  const todayDate = today.toString()
  const todayYear = today.year
  const renderInfo = buildMonthRowRenderInfo(mode, selectionSnapshot, rangeHeaderValue, rangeHeaderPreviewActive)
  const disabledDates = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const row of rows) {
      for (const date of row) {
        map.set(date, isDateDisabled(Temporal.PlainDate.from(date)))
      }
    }
    return map
  }, [isDateDisabled, rows])
  const firstPartial = rows[0] ? rows[0].length !== 7 : false
  const fullLastRow = (rows[rows.length - 1]?.length ?? 0) === 7

  const handleRangePreviewHover = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const btn = (event.target as HTMLElement).closest('button[data-date]')
      if (!(btn instanceof HTMLButtonElement)) return
      const rawDate = btn.dataset.date
      if (!rawDate) return
      if (lastHoveredDateRef.current === rawDate) return
      lastHoveredDateRef.current = rawDate
      onDateHover(Temporal.PlainDate.from(rawDate))
    },
    [onDateHover],
  )

  return (
    <div className="calendar__monthRows" onMouseOver={mode === 'range' ? handleRangePreviewHover : undefined}>
      {rows.map((row, rowIndex) => {
        const isPartial = row.length !== 7
        const rowClass = clsx('calendar__monthRow', {
          'is-first': rowIndex === 0,
          'is-second': rowIndex === 1,
          'is-partial': isPartial,
          'is-partial-first': rowIndex === 0 && isPartial,
          'is-partial-last': rowIndex === rows.length - 1 && isPartial,
        })

        return (
          <ul
            key={`${month}-${rowIndex}`}
            className={rowClass}
            role="row"
            aria-label={`${monthShort} week ${rowIndex + 1}`}
          >
            {row.map((date, cellIndex) => {
              const state = calculateCellState(mode, date, renderInfo)

              return (
                <CalendarDayCell
                  key={date}
                  mode={mode}
                  date={date}
                  monthShort={monthShort}
                  todayLabelShort={messages.todayLabel}
                  idPrefix={idPrefix}
                  focusedDate={focusedDateString}
                  todayDate={todayDate}
                  todayYear={todayYear}
                  isSelected={state.isSelected}
                  isDisabled={disabledDates.get(date) === true}
                  isRangeStartDate={state.isRangeStartDate}
                  isRangeEndDate={state.isRangeEndDate}
                  isInPreview={state.isInPreview}
                  isMultiplePrimaryEdit={state.isMultiplePrimaryEdit}
                  cellIndex={cellIndex}
                  onDayClick={onDateClick}
                />
              )
            })}
          </ul>
        )
      })}

      <label
        className={`calendar__monthOverlayBlock${
          firstPartial && index > 0 ? ' is-partialFirstRow' : ''
        }${fullLastRow ? ' is-fullLastRow' : ''}`}
        aria-hidden="true"
      >
        <span>{monthHeading}</span>
      </label>
    </div>
  )
}

export default memo(CalendarDatePickerView)
