import type { Temporal } from '@js-temporal/polyfill'
import { memo, useCallback, useId, useRef } from 'react'
import type { KeyboardEvent, MouseEvent, RefObject, UIEvent } from 'react'
import type { CalendarMessages, CalendarMode } from '../core/api.types'
import type { WeekStartsOn } from '../core/monthGrid'
import { CalendarDayCell } from './Calendar.DayCell'
import {
  dayStamp,
  monthAtOffset,
  monthKey,
  monthLabel,
  monthRows,
  monthShortLabel,
  plainDateFromDayStamp,
  todayWordLabel,
} from './Calendar.utils'

interface CalendarModeBodyProps {
  mode: CalendarMode
  locale: string
  weekStartsOn: WeekStartsOn
  messages: CalendarMessages
  keyboardNavigation: boolean
  isScrolling: boolean
  minMonth: Temporal.PlainYearMonth
  monthVirtualizer: {
    getVirtualItems: () => Array<{ index: number; start: number }>
    getTotalSize: () => number
    measureElement: (node: Element | null) => void
  }
  monthRefs: RefObject<Map<string, HTMLElement>>
  scrollRef: RefObject<HTMLDivElement | null>
  focusedDateStamp: number
  todayDateStamp: number
  todayYear: number
  isDateSelected: (date: Temporal.PlainDate) => boolean
  isDateDisabled: (date: Temporal.PlainDate) => boolean
  isRangeStart: (date: Temporal.PlainDate) => boolean
  isRangeEnd: (date: Temporal.PlainDate) => boolean
  isInPreviewRange: (date: Temporal.PlainDate) => boolean
  onDateHover: (date: Temporal.PlainDate) => void
  onDateClick: (date: Temporal.PlainDate) => void
  onScroll: (event: UIEvent<HTMLDivElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  selectionRenderKey: string
  previewIdentity?: unknown
  /** multiple: 헤더·시간 편집 대상인 대표 일 (`dayStamp`). 그 외 모드에서는 생략 */
  multiplePrimaryDateStamp?: number | null
}

function CalendarModeBodyImpl({
  mode,
  locale,
  weekStartsOn,
  messages,
  keyboardNavigation,
  isScrolling,
  minMonth,
  monthVirtualizer,
  monthRefs,
  scrollRef,
  focusedDateStamp,
  todayDateStamp,
  todayYear,
  isDateSelected,
  isDateDisabled,
  isRangeStart,
  isRangeEnd,
  isInPreviewRange,
  onDateHover,
  onDateClick,
  onScroll,
  onKeyDown,
  selectionRenderKey,
  previewIdentity,
  multiplePrimaryDateStamp,
}: CalendarModeBodyProps) {
  void selectionRenderKey
  void previewIdentity

  /** range: 셀마다 mouseEnter 대신 monthRows에서 위임 — 호버 경로 얇게 */
  const lastHoverStampRef = useRef<number | null>(null)

  const handleDayMouseDown = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }, [])

  const handleDayClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const raw = event.currentTarget.dataset.dayStamp
      if (raw === undefined) return
      const stamp = Number(raw)
      if (!Number.isFinite(stamp)) return
      onDateClick(plainDateFromDayStamp(stamp))
    },
    [onDateClick],
  )

  const handleMonthRowsMouseOver = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (mode !== 'range') return
      const btn = (event.target as HTMLElement).closest('button[data-day-stamp]')
      if (!(btn instanceof HTMLButtonElement)) return
      const raw = btn.dataset.dayStamp
      if (raw === undefined) return
      const stamp = Number(raw)
      if (!Number.isFinite(stamp)) return
      if (lastHoverStampRef.current === stamp) return
      lastHoverStampRef.current = stamp
      onDateHover(plainDateFromDayStamp(stamp))
    },
    [mode, onDateHover],
  )

  const handleScrollMouseLeave = useCallback(() => {
    lastHoverStampRef.current = null
  }, [])

  const virtualItems = monthVirtualizer.getVirtualItems()
  const totalSize = monthVirtualizer.getTotalSize()
  const todayLabelShort = todayWordLabel(locale)

  /**
   * grid 내 "가상 커서" 라우팅용 stable prefix.
   *
   * 실제 DOM focus 는 scroll container 한 곳에만 머무르고, `focusedDate` 에 해당하는
   * `<button>` id 를 `aria-activedescendant` 로 가리켜 스크린리더가 그 버튼의 속성
   * (`aria-selected`, `aria-current`, disabled 등) 을 읽도록 한다.
   * react-infinite-calendar 의 `highlightedDate` 패턴을 WAI-ARIA grid 에 맞게 재현.
   *
   * virtualization 때문에 focused 셀이 viewport 밖으로 스크롤되면 해당 id 의 DOM 이
   * 잠시 사라질 수 있는데, AT 는 그 찰나 활성 descendant 가 없는 것으로 처리하므로 문제없음.
   */
  const idPrefix = useId()
  const activeDescendantId = focusedDateStamp ? `${idPrefix}-day-${focusedDateStamp}` : undefined

  return (
    <div
      ref={scrollRef}
      className={`calendar__scroll${isScrolling ? ' is-scrolling' : ''}`}
      role="grid"
      tabIndex={keyboardNavigation ? 0 : -1}
      aria-activedescendant={activeDescendantId}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      onMouseLeave={mode === 'range' ? handleScrollMouseLeave : undefined}
      aria-label={messages.ariaCalendarGrid}
    >
      <div className="calendar__virtualMonths" style={{ height: totalSize, position: 'relative', width: '100%' }}>
        {virtualItems.map((vi) => {
          const month = monthAtOffset(minMonth, vi.index)
          const key = monthKey(month)
          const rows = monthRows(month, weekStartsOn)
          const monthShort = monthShortLabel(month, locale)
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
              <div
                className="calendar__monthRows"
                onMouseOver={mode === 'range' ? handleMonthRowsMouseOver : undefined}
              >
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
                    <ul
                      key={`${key}-row-${rowIndex}`}
                      className={rowClass}
                      role="row"
                      aria-label={`${monthShort} ${rowIndex + 1}주차`}
                    >
                      {row.map((date, cellIndex) => {
                        const dateKey = dayStamp(date)
                        const isSelected = isDateSelected(date)
                        const isToday = dateKey === todayDateStamp
                        const isFirstOfMonth = date.day === 1
                        const showYear = isFirstOfMonth && date.year !== todayYear
                        const isRangeStartDate = mode === 'range' ? isRangeStart(date) : false
                        const isRangeEndDate = mode === 'range' ? isRangeEnd(date) : false
                        const isInPreview = mode === 'range' ? isInPreviewRange(date) : false

                        const isMultiplePrimaryEdit =
                          mode === 'multiple' &&
                          typeof multiplePrimaryDateStamp === 'number' &&
                          dateKey === multiplePrimaryDateStamp

                        return (
                          <CalendarDayCell
                            key={dateKey}
                            mode={mode}
                            dayStamp={dateKey}
                            monthShort={monthShort}
                            focusedDateStamp={focusedDateStamp}
                            isSelected={isSelected}
                            isDisabled={isDateDisabled(date)}
                            isToday={isToday}
                            isRangeStartDate={isRangeStartDate}
                            isRangeEndDate={isRangeEndDate}
                            isInPreview={isInPreview}
                            isMultiplePrimaryEdit={isMultiplePrimaryEdit}
                            isFirstOfMonth={isFirstOfMonth}
                            showYear={showYear}
                            year={date.year}
                            dayOfMonth={date.day}
                            cellIndex={cellIndex}
                            todayLabelShort={todayLabelShort}
                            idPrefix={idPrefix}
                            onDayMouseDown={handleDayMouseDown}
                            onDayClick={handleDayClick}
                          />
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

function equalModeBodyProps(prev: CalendarModeBodyProps, next: CalendarModeBodyProps) {
  return (
    prev.mode === next.mode &&
    prev.locale === next.locale &&
    prev.weekStartsOn === next.weekStartsOn &&
    prev.messages === next.messages &&
    prev.keyboardNavigation === next.keyboardNavigation &&
    prev.isScrolling === next.isScrolling &&
    prev.minMonth === next.minMonth &&
    prev.monthVirtualizer === next.monthVirtualizer &&
    prev.monthRefs === next.monthRefs &&
    prev.scrollRef === next.scrollRef &&
    prev.focusedDateStamp === next.focusedDateStamp &&
    prev.todayDateStamp === next.todayDateStamp &&
    prev.todayYear === next.todayYear &&
    prev.isDateSelected === next.isDateSelected &&
    prev.isDateDisabled === next.isDateDisabled &&
    prev.isRangeStart === next.isRangeStart &&
    prev.isRangeEnd === next.isRangeEnd &&
    prev.isInPreviewRange === next.isInPreviewRange &&
    prev.onDateHover === next.onDateHover &&
    prev.onDateClick === next.onDateClick &&
    prev.onScroll === next.onScroll &&
    prev.onKeyDown === next.onKeyDown &&
    prev.selectionRenderKey === next.selectionRenderKey &&
    prev.previewIdentity === next.previewIdentity &&
    prev.multiplePrimaryDateStamp === next.multiplePrimaryDateStamp
  )
}

export const CalendarModeBody = memo(CalendarModeBodyImpl, equalModeBodyProps)
