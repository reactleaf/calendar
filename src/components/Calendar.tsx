import { Temporal } from '@js-temporal/polyfill'
import type { KeyboardEvent, UIEvent } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CalendarSingleProps } from '../core/api.types'
import { toPlainDate } from '../core/calendarDate'
import { useSingleSelection } from '../hooks/useSingleSelection'
import './Calendar.css'

/* eslint-disable react-hooks/preserve-manual-memoization -- Temporal 값 의존 useCallback 패턴 유지 */

const WEEK_STARTS_ON = 0 as const
const PRELOAD_MONTH_COUNT = 8
const PAGE_MONTH_COUNT = 6
const EDGE_THRESHOLD_PX = 220
const DEFAULT_MIN_DATE = Temporal.PlainDate.from('1900-01-01')
const DEFAULT_MAX_DATE = Temporal.PlainDate.from('2100-12-31')

function monthKey(month: Temporal.PlainYearMonth): string {
  return `${month.year}-${String(month.month).padStart(2, '0')}`
}

function weekdayLabels(locale: string): string[] {
  const sunday = Temporal.PlainDate.from({ year: 2026, month: 1, day: 4 })
  return Array.from({ length: 7 }, (_, i) =>
    sunday.add({ days: i }).toLocaleString(locale, { weekday: 'short' }),
  )
}

function sameDay(a: Temporal.PlainDate, b: Temporal.PlainDate): boolean {
  return Temporal.PlainDate.compare(a, b) === 0
}

function clampDate(
  value: Temporal.PlainDate,
  minDate: Temporal.PlainDate,
  maxDate: Temporal.PlainDate,
): Temporal.PlainDate {
  if (Temporal.PlainDate.compare(value, minDate) < 0) return minDate
  if (Temporal.PlainDate.compare(value, maxDate) > 0) return maxDate
  return value
}

function compareMonth(a: Temporal.PlainYearMonth, b: Temporal.PlainYearMonth): number {
  return Temporal.PlainYearMonth.compare(a, b)
}

function buildMonthWindow(
  center: Temporal.PlainYearMonth,
  minMonth: Temporal.PlainYearMonth,
  maxMonth: Temporal.PlainYearMonth,
  before = PRELOAD_MONTH_COUNT,
  after = PRELOAD_MONTH_COUNT,
): Temporal.PlainYearMonth[] {
  const out: Temporal.PlainYearMonth[] = []
  for (let i = before; i >= 1; i -= 1) {
    const candidate = center.subtract({ months: i })
    if (compareMonth(candidate, minMonth) >= 0) out.push(candidate)
  }
  out.push(center)
  for (let i = 1; i <= after; i += 1) {
    const candidate = center.add({ months: i })
    if (compareMonth(candidate, maxMonth) <= 0) out.push(candidate)
  }
  return out
}

function monthRows(month: Temporal.PlainYearMonth): Temporal.PlainDate[][] {
  const first = month.toPlainDate({ day: 1 })
  const lead = (first.dayOfWeek % 7 - WEEK_STARTS_ON + 7) % 7
  const rows: Temporal.PlainDate[][] = []

  let day = 1
  let rowLen = lead === 0 ? 7 : 7 - lead

  while (day <= month.daysInMonth) {
    const remaining = month.daysInMonth - day + 1
    rowLen = Math.min(rowLen, remaining)
    const row: Temporal.PlainDate[] = []
    for (let i = 0; i < rowLen; i += 1) {
      row.push(Temporal.PlainDate.from({ year: month.year, month: month.month, day: day + i }))
    }
    rows.push(row)
    day += rowLen
    rowLen = 7
  }

  return rows
}

function monthLabel(month: Temporal.PlainYearMonth, locale: string): string {
  return Temporal.PlainDate.from({ year: month.year, month: month.month, day: 1 }).toLocaleString(locale, {
    month: 'long',
    year: 'numeric',
  })
}

export function Calendar(props: CalendarSingleProps) {
  const {
    id,
    className,
    disabled,
    minDate,
    maxDate,
    disabledDates,
    disabledDays,
    keyboardNavigation = true,
    includeTime,
    minuteStep,
    onMonthChange,
    onFocusedDateChange,
    value,
    defaultValue,
    onSelect,
  } = props

  const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US'

  const selection = useSingleSelection({
    ...(value !== undefined ? { value } : {}),
    ...(defaultValue !== undefined ? { defaultValue } : {}),
    ...(disabled !== undefined ? { disabled } : {}),
    ...(minDate !== undefined ? { minDate } : {}),
    ...(maxDate !== undefined ? { maxDate } : {}),
    ...(disabledDates !== undefined ? { disabledDates } : {}),
    ...(disabledDays !== undefined ? { disabledDays } : {}),
    ...(includeTime !== undefined ? { includeTime } : {}),
    ...(minuteStep !== undefined ? { minuteStep } : {}),
    ...(onSelect !== undefined ? { onSelect } : {}),
  })

  const today = Temporal.Now.plainDateISO()
  const selectedPlain = selection.value ? toPlainDate(selection.value) : null
  const minDay = minDate ? toPlainDate(minDate) : DEFAULT_MIN_DATE
  const maxDay = maxDate ? toPlainDate(maxDate) : DEFAULT_MAX_DATE
  const initialDate = clampDate(selectedPlain ?? today, minDay, maxDay)
  const initialMonth = initialDate.toPlainYearMonth()
  const minMonth = minDay.toPlainYearMonth()
  const maxMonth = maxDay.toPlainYearMonth()

  const [focusedDate, setFocusedDateState] = useState<Temporal.PlainDate>(initialDate)
  const [months, setMonths] = useState<Temporal.PlainYearMonth[]>(() =>
    buildMonthWindow(initialMonth, minMonth, maxMonth),
  )
  const [currentMonth, setCurrentMonth] = useState<Temporal.PlainYearMonth>(initialMonth)
  const [isScrolling, setIsScrolling] = useState(true)

  const monthsRef = useRef(months)
  const monthRefs = useRef<Map<string, HTMLElement>>(new Map())
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const scrollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prependAdjustRef = useRef<{ prevHeight: number } | null>(null)
  const edgeBusyRef = useRef(false)
  const initializedScrollRef = useRef(false)
  const focusMonthRequestRef = useRef<Temporal.PlainYearMonth | null>(null)

  const weekdays = useMemo(() => weekdayLabels(locale), [locale])

  useEffect(() => {
    monthsRef.current = months
  }, [months])

  useEffect(() => {
    scrollingTimerRef.current = setTimeout(() => setIsScrolling(false), 800)
    return () => {
      if (scrollingTimerRef.current) clearTimeout(scrollingTimerRef.current)
    }
  }, [])

  useEffect(() => {
    onMonthChange?.(currentMonth)
  }, [currentMonth, onMonthChange])

  const setFocusedDate = useCallback(
    (next: Temporal.PlainDate) => {
      const clamped = clampDate(next, minDay, maxDay)
      setFocusedDateState(clamped)
      onFocusedDateChange?.(clamped)
    },
    [maxDay, minDay, onFocusedDateChange],
  )

  const expandForTargetMonth = useCallback(
    (target: Temporal.PlainYearMonth) => {
      setMonths((prev) => {
        if (prev.length === 0) return buildMonthWindow(target, minMonth, maxMonth)
        const first = prev[0]
        const last = prev[prev.length - 1]
        if (!first || !last) return prev

        const prepend: Temporal.PlainYearMonth[] = []
        let cursor = first
        while (compareMonth(target, cursor) < 0) {
          const candidate = cursor.subtract({ months: 1 })
          if (compareMonth(candidate, minMonth) < 0) break
          prepend.unshift(candidate)
          cursor = candidate
        }

        const append: Temporal.PlainYearMonth[] = []
        cursor = last
        while (compareMonth(target, cursor) > 0) {
          const candidate = cursor.add({ months: 1 })
          if (compareMonth(candidate, maxMonth) > 0) break
          append.push(candidate)
          cursor = candidate
        }

        if (prepend.length === 0 && append.length === 0) return prev
        return [...prepend, ...prev, ...append]
      })
    },
    [maxMonth, minMonth],
  )

  const keepMonthVisible = useCallback((month: Temporal.PlainYearMonth) => {
    const scrollEl = scrollRef.current
    const node = monthRefs.current.get(monthKey(month))
    if (!scrollEl || !node) return

    const top = node.offsetTop
    const bottom = top + node.offsetHeight
    const viewTop = scrollEl.scrollTop
    const viewBottom = viewTop + scrollEl.clientHeight

    if (top < viewTop + 12) {
      scrollEl.scrollTo({ top: Math.max(0, top - 12) })
    } else if (bottom > viewBottom - 12) {
      scrollEl.scrollTo({ top: Math.max(0, bottom - scrollEl.clientHeight + 12) })
    }
  }, [])

  const moveFocusedByDays = useCallback(
    (days: number) => {
      const next = clampDate(focusedDate.add({ days }), minDay, maxDay)
      setFocusedDate(next)
      const nextMonth = next.toPlainYearMonth()
      focusMonthRequestRef.current = nextMonth
      expandForTargetMonth(nextMonth)
      requestAnimationFrame(() => keepMonthVisible(nextMonth))
    },
    [expandForTargetMonth, focusedDate, keepMonthVisible, maxDay, minDay, setFocusedDate],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!keyboardNavigation) return

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          moveFocusedByDays(-1)
          return
        case 'ArrowRight':
          event.preventDefault()
          moveFocusedByDays(1)
          return
        case 'ArrowUp':
          event.preventDefault()
          moveFocusedByDays(-7)
          return
        case 'ArrowDown':
          event.preventDefault()
          moveFocusedByDays(7)
          return
        case 'Enter':
        case ' ':
          event.preventDefault()
          selection.selectDate(focusedDate, 'keyboard')
          return
        default:
          break
      }
    },
    [focusedDate, keyboardNavigation, moveFocusedByDays, selection],
  )

  const detectCurrentMonth = useCallback((scrollTop: number): Temporal.PlainYearMonth | null => {
    const ordered = monthsRef.current
    if (ordered.length === 0) return null
    let candidate = ordered[0] ?? null
    for (const month of ordered) {
      const node = monthRefs.current.get(monthKey(month))
      if (!node) continue
      if (node.offsetTop <= scrollTop + 36) {
        candidate = month
        continue
      }
      break
    }
    return candidate
  }, [])

  const appendAtBottom = useCallback(() => {
    const current = monthsRef.current
    const last = current[current.length - 1]
    if (!last) return
    const toAppend: Temporal.PlainYearMonth[] = []
    for (let i = 1; i <= PAGE_MONTH_COUNT; i += 1) {
      const candidate = last.add({ months: i })
      if (compareMonth(candidate, maxMonth) > 0) break
      toAppend.push(candidate)
    }
    if (toAppend.length > 0) {
      setMonths((prev) => [...prev, ...toAppend])
    }
  }, [maxMonth])

  const prependAtTop = useCallback(
    (scrollHeight: number) => {
      const current = monthsRef.current
      const first = current[0]
      if (!first) return

      const toPrepend: Temporal.PlainYearMonth[] = []
      for (let i = PAGE_MONTH_COUNT; i >= 1; i -= 1) {
        const candidate = first.subtract({ months: i })
        if (compareMonth(candidate, minMonth) < 0) continue
        toPrepend.push(candidate)
      }

      if (toPrepend.length > 0) {
        prependAdjustRef.current = { prevHeight: scrollHeight }
        setMonths((prev) => [...toPrepend, ...prev])
      }
    },
    [minMonth],
  )

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const el = event.currentTarget
      const { scrollTop, scrollHeight, clientHeight } = el

      setIsScrolling(true)
      if (scrollingTimerRef.current) clearTimeout(scrollingTimerRef.current)
      scrollingTimerRef.current = setTimeout(() => setIsScrolling(false), 180)

      const month = detectCurrentMonth(scrollTop)
      if (month && compareMonth(month, currentMonth) !== 0) {
        setCurrentMonth(month)
      }

      if (!edgeBusyRef.current && scrollTop < EDGE_THRESHOLD_PX) {
        edgeBusyRef.current = true
        prependAtTop(scrollHeight)
      } else if (!edgeBusyRef.current && scrollTop + clientHeight > scrollHeight - EDGE_THRESHOLD_PX) {
        edgeBusyRef.current = true
        appendAtBottom()
      }
    },
    [appendAtBottom, currentMonth, detectCurrentMonth, prependAtTop],
  )

  useLayoutEffect(() => {
    edgeBusyRef.current = false
    const pending = prependAdjustRef.current
    const scrollEl = scrollRef.current
    if (pending && scrollEl) {
      const delta = scrollEl.scrollHeight - pending.prevHeight
      scrollEl.scrollTop += delta
      prependAdjustRef.current = null
    }
  }, [months])

  useLayoutEffect(() => {
    if (initializedScrollRef.current) return
    const scrollEl = scrollRef.current
    if (!scrollEl) return
    const node = monthRefs.current.get(monthKey(initialMonth))
    if (!node) return
    scrollEl.scrollTop = Math.max(0, node.offsetTop - 12)
    initializedScrollRef.current = true
  }, [initialMonth, months])

  useLayoutEffect(() => {
    const requested = focusMonthRequestRef.current
    if (!requested) return
    keepMonthVisible(requested)
    focusMonthRequestRef.current = null
  }, [keepMonthVisible, months])

  const rootClass = ['calendar', className].filter(Boolean).join(' ')

  return (
    <div id={id} className={rootClass}>
      <div className="calendar__weekdays" aria-hidden="true">
        {weekdays.map((label) => (
          <div key={label} className="calendar__weekday">
            {label}
          </div>
        ))}
      </div>

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
          const lastRow = rows[rows.length - 1]
          const fullLastRow = lastRow ? lastRow.length === 7 : false

          return (
            <section
              key={key}
              className={`calendar__month${monthIndex > 0 ? ' calendar__month--hasPrevious' : ''}`}
              ref={(node) => {
                if (!node) {
                  monthRefs.current.delete(key)
                  return
                }
                monthRefs.current.set(key, node)
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
                        const cellDisabled = selection.isDisabled(date)
                        const selected = selection.isSelected(date)
                        const focused = sameDay(date, focusedDate)
                        const isToday = sameDay(date, today)
                        const dayClass = [
                          'calendar__day',
                          focused ? 'calendar__day--focused' : '',
                          selected ? 'calendar__day--selected' : '',
                          isToday ? 'calendar__day--today' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')

                        return (
                          <li
                            key={date.toString()}
                            className={`calendar__dayItem${cellIndex === 0 ? ' is-first' : ''}`}
                          >
                            <button
                              type="button"
                              role="gridcell"
                              className={dayClass}
                              disabled={cellDisabled}
                              tabIndex={-1}
                              aria-selected={selected}
                              {...(isToday ? { 'aria-current': 'date' as const } : {})}
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
    </div>
  )
}
