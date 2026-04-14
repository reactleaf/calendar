import type { CalendarMode } from '../../core/api.types'
import { monthLabel, monthKey, monthRows, sameDay } from './utils'
import { useCalendarContext } from './context'

interface CalendarModeBodyProps {
  mode: CalendarMode
}

export function CalendarModeBody({ mode }: CalendarModeBodyProps) {
  const {
    locale,
    keyboardNavigation,
    isScrolling,
    months,
    monthRefs,
    scrollRef,
    focusedDate,
    today,
    selection,
    setFocusedDate,
    handleScroll,
    handleKeyDown,
  } = useCalendarContext()

  return (
    <div
      ref={scrollRef}
      className={`calendar__scroll${isScrolling ? ' is-scrolling' : ''}`}
      role="grid"
      tabIndex={keyboardNavigation ? 0 : -1}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      aria-label="무한 스크롤 달력"
    >
      {months.map((month, monthIndex) => {
        const key = monthKey(month)
        const rows = monthRows(month)
        const firstPartial = rows[0] ? rows[0].length !== 7 : false
        const fullLastRow = (rows[rows.length - 1]?.length ?? 0) === 7

        return (
          <section
            key={key}
            className={`calendar__month${monthIndex > 0 ? ' calendar__month--hasPrevious' : ''}`}
            ref={(node) => {
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
                  <ul key={`${key}-row-${rowIndex}`} className={rowClass} role="row">
                    {row.map((date, cellIndex) => {
                      const isSelected = selection.isSelected(date)
                      const isRangeStart = mode === 'range' ? (selection.isRangeStart?.(date) ?? false) : false
                      const isRangeEnd = mode === 'range' ? (selection.isRangeEnd?.(date) ?? false) : false
                      const isInPreview = mode === 'range' ? (selection.isInPreviewRange?.(date) ?? false) : false
                      const dayClass = [
                        'calendar__day',
                        sameDay(date, focusedDate) ? 'calendar__day--focused' : '',
                        isSelected ? 'calendar__day--selected' : '',
                        sameDay(date, today) ? 'calendar__day--today' : '',
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
                            role="gridcell"
                            className={dayClass}
                            disabled={selection.isDisabled(date)}
                            tabIndex={-1}
                            aria-selected={isSelected}
                            {...(sameDay(date, today) ? { 'aria-current': 'date' as const } : {})}
                            onMouseEnter={() => {
                              if (mode === 'range') selection.previewDate?.(date, 'hover')
                            }}
                            onClick={() => {
                              setFocusedDate(date)
                              selection.selectDate(date, 'click')
                            }}
                          >
                            {date.day}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )
              })}

              <label
                className={`calendar__monthOverlayBlock${
                  firstPartial && monthIndex > 0 ? ' is-partialFirstRow' : ''
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
  )
}
