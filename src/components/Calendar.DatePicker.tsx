import { Temporal } from '@js-temporal/polyfill'
import { clsx } from 'clsx'
import { useCallback, useId, useRef } from 'react'
import { useCalendarContext } from './Calendar.context'
import { CalendarDayCell } from './Calendar.DayCell'
import { CalendarTodayButton } from './Calendar.TodayButton'
import { monthAtOffset, monthLabel, monthRows, monthShortLabel } from './Calendar.utils'
import { CalendarWeekdays } from './Calendar.Weekdays'

interface CalendarDatePickerProps {
  onDateHover: (date: Temporal.PlainDate) => void
  onDateClick: (date: Temporal.PlainDate) => void
}

export default function CalendarDatePicker({ onDateHover, onDateClick }: CalendarDatePickerProps) {
  const {
    messages,
    keyboardNavigation,
    focusedDate,
    minMonth,
    monthVirtualizer,
    isScrolling,
    scrollRef,
    handleScroll,
    handleKeyDown,
  } = useCalendarContext()

  const idPrefix = useId()
  const focusedDayKey = focusedDate.toString()
  const activeDescendantId = `${idPrefix}-day-${focusedDayKey}`

  const handleScrollMouseLeave = useCallback(() => {}, [])

  const virtualItems = monthVirtualizer.getVirtualItems()
  const totalSize = monthVirtualizer.getTotalSize()

  return (
    <>
      <CalendarWeekdays />
      <CalendarTodayButton />
      <div
        key="date-picker"
        ref={scrollRef}
        className={`calendar__scroll${isScrolling ? ' is-scrolling' : ''}`}
        role="grid"
        tabIndex={keyboardNavigation ? 0 : -1}
        aria-activedescendant={activeDescendantId}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        onMouseLeave={handleScrollMouseLeave}
        aria-label={messages.ariaCalendarGrid}
      >
        <div className="calendar__virtualMonths" style={{ height: totalSize, position: 'relative', width: '100%' }}>
          {virtualItems.map((vi) => {
            const month = monthAtOffset(minMonth, vi.index)
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
                  onDateClick={onDateClick}
                  index={vi.index}
                />
              </section>
            )
          })}
        </div>
      </div>
    </>
  )
}

function CalendarMonthRow({
  month,
  idPrefix,
  onDateHover,
  onDateClick,
  index,
}: {
  month: Temporal.PlainYearMonth
  idPrefix: string
  onDateHover: (date: Temporal.PlainDate) => void
  onDateClick: (date: Temporal.PlainDate) => void
  index: number
}) {
  const { mode, locale, today, focusedDate, messages, weekStartsOn, selection, selectionSnapshot } =
    useCalendarContext()
  const rows = monthRows(month, weekStartsOn)
  const lastHoveredDateRef = useRef<string | null>(null)
  const monthShort = monthShortLabel(month, locale)

  const firstPartial = rows[0] ? rows[0].length !== 7 : false
  const fullLastRow = (rows[rows.length - 1]?.length ?? 0) === 7

  // Range hover 이벤트 핸들러를 하나만 두기 위해
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
      {rows.map((row, index) => {
        const isPartial = row.length !== 7
        const rowClass = clsx('calendar__monthRow', {
          'is-first': index === 0,
          'is-second': index === 1,
          'is-partial': isPartial,
          'is-partial-first': index === 0 && isPartial,
          'is-partial-last': index === rows.length - 1 && isPartial,
        })

        return (
          <ul key={`${month}-${index}`} className={rowClass} role="row" aria-label={`${monthShort} ${index + 1}주차`}>
            {row.map((date, cellIndex) => {
              const dayKey = date.toString()
              const isFirstOfMonth = date.day === 1
              const showYear = isFirstOfMonth && date.year !== today.year
              const isRangeStartDate = selection.isRangeStart?.(date) ?? false
              const isRangeEndDate = selection.isRangeEnd?.(date) ?? false
              const isInPreview = selection.isInPreviewRange?.(date) ?? false

              const isMultiplePrimaryEdit =
                selectionSnapshot.mode === 'multiple' && (selectionSnapshot.primaryPlainDate?.equals(date) ?? false)

              return (
                <CalendarDayCell
                  key={dayKey}
                  mode={mode}
                  date={date}
                  dayKey={dayKey}
                  monthShort={monthShort}
                  isFocused={date.equals(focusedDate)}
                  isSelected={selection.isSelected(date)}
                  isDisabled={selection.isDisabled(date)}
                  isToday={date.equals(today)}
                  isRangeStartDate={isRangeStartDate}
                  isRangeEndDate={isRangeEndDate}
                  isInPreview={isInPreview}
                  isMultiplePrimaryEdit={isMultiplePrimaryEdit}
                  isFirstOfMonth={isFirstOfMonth}
                  showYear={showYear}
                  year={date.year}
                  dayOfMonth={date.day}
                  cellIndex={cellIndex}
                  todayLabelShort={messages.todayLabel}
                  idPrefix={idPrefix}
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
        <span>{monthLabel(month, locale)}</span>
      </label>
    </div>
  )
}
