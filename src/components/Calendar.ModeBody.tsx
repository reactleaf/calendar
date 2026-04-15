import type { CalendarMode } from '../core/api.types'
import { useCalendarContext } from './Calendar.context'
import { monthAtOffset, monthKey, monthLabel, monthRows, sameDay } from './Calendar.utils'

interface CalendarModeBodyProps {
  mode: CalendarMode
}

export function CalendarModeBody({ mode }: CalendarModeBodyProps) {
  const {
    locale,
    keyboardNavigation,
    isScrolling,
    minMonth,
    monthVirtualizer,
    monthRefs,
    scrollRef,
    focusedDate,
    today,
    selection,
    setFocusedDate,
    handleScroll,
    handleKeyDown,
  } = useCalendarContext()

  const virtualItems = monthVirtualizer.getVirtualItems()
  const totalSize = monthVirtualizer.getTotalSize()

  return (
    <div
      ref={scrollRef}
      className={`calendar__scroll${isScrolling ? ' is-scrolling' : ''}`}
      tabIndex={keyboardNavigation ? 0 : -1}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      aria-label="무한 스크롤 달력"
    >
      <div className="calendar__virtualMonths" style={{ height: totalSize, position: 'relative', width: '100%' }}>
        {virtualItems.map((vi) => {
          const month = monthAtOffset(minMonth, vi.index)
          const key = monthKey(month)
          const rows = monthRows(month)
          const firstPartial = rows[0] ? rows[0].length !== 7 : false
          const fullLastRow = (rows[rows.length - 1]?.length ?? 0) === 7
          const hasPrevious = vi.index > 0

          return (
            <section
              key={key}
              className={`calendar__month${hasPrevious ? ' calendar__month--hasPrevious' : ''}`}
              data-index={vi.index}
              style={{
                position: 'absolute',
                top: `${vi.start}px`,
                left: 0,
                width: '100%',
              }}
              ref={(node) => {
                monthVirtualizer.measureElement(node)
                if (!node) monthRefs.current.delete(key)
                else monthRefs.current.set(key, node)
              }}
            >
            <div className="calendar__monthRows">
              {rows.map((row, rowIndex) => {
                const isPartial = row.length !== 7
                const rowClass = [
                  'calendar__monthRow',
                  rowIndex === 0 ? 'is-first' : '',
                  rowIndex === 1 ? 'is-second' : '',
                  isPartial ? 'is-partial' : '',
                  rowIndex === 0 && isPartial ? 'is-partial-first' : '',
                  rowIndex === rows.length - 1 && isPartial ? 'is-partial-last' : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <ul key={`${key}-row-${rowIndex}`} className={rowClass}>
                    {row.map((date, cellIndex) => {
                      const isSelected = selection.isSelected(date)
                      const isToday = sameDay(date, today)
                      const isFirstOfMonth = date.day === 1
                      const showYear = isFirstOfMonth && date.year !== today.year
                      const monthShort = date.toLocaleString(locale, { month: 'short' })
                      const isRangeStart = mode === 'range' ? (selection.isRangeStart?.(date) ?? false) : false
                      const isRangeEnd = mode === 'range' ? (selection.isRangeEnd?.(date) ?? false) : false
                      const isInPreview = mode === 'range' ? (selection.isInPreviewRange?.(date) ?? false) : false
                      const dayClass = [
                        'calendar__day',
                        sameDay(date, focusedDate) ? 'calendar__day--focused' : '',
                        isSelected ? 'calendar__day--selected' : '',
                        isToday ? 'calendar__day--today' : '',
                        mode === 'range' && isSelected && !isRangeStart && !isRangeEnd ? 'calendar__day--inRange' : '',
                        mode === 'range' && isInPreview && !isSelected ? 'calendar__day--inPreviewRange' : '',
                        mode === 'range' && isRangeStart ? 'calendar__day--rangeStart' : '',
                        mode === 'range' && isRangeEnd ? 'calendar__day--rangeEnd' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')

                      return (
                        <li key={date.toString()} className={`calendar__dayItem${cellIndex === 0 ? ' is-first' : ''}`}>
                          <button
                            type="button"
                            className={dayClass}
                            disabled={selection.isDisabled(date)}
                            tabIndex={-1}
                            aria-pressed={isSelected}
                            {...(sameDay(date, today) ? { 'aria-current': 'date' as const } : {})}
                            onMouseDown={(event) => {
                              event.preventDefault()
                            }}
                            onMouseEnter={() => {
                              if (mode === 'range') selection.previewDate?.(date, 'hover')
                            }}
                            onClick={() => {
                              setFocusedDate(date)
                              selection.selectDate(date, 'click')
                              scrollRef.current?.focus({ preventScroll: true })
                            }}
                          >
                            {isFirstOfMonth ? <span className="calendar__dayMonth">{monthShort}</span> : null}
                            <span className="calendar__dayNumber">{date.day}</span>
                            {showYear ? <span className="calendar__dayYear">{date.year}</span> : null}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )
              })}

              <label
                className={`calendar__monthOverlayBlock${
                  firstPartial && hasPrevious ? ' is-partialFirstRow' : ''
                }${fullLastRow ? ' is-fullLastRow' : ''}`}
                aria-hidden="true"
              >
                <span>{monthLabel(month, locale)}</span>
              </label>
            </div>
          </section>
          )
        })}
      </div>
    </div>
  )
}
