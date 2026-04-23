import type { Temporal } from '@js-temporal/polyfill'
import type { Rect, Virtualizer } from '@tanstack/react-virtual'
import { observeElementRect as observeElementRectImpl, useVirtualizer } from '@tanstack/react-virtual'
import type { MutableRefObject, RefObject, UIEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DateViewportPlacement } from '../components/Calendar.types'
import type { WeekStartsOn } from '../core/monthGrid'
import {
  DEFAULT_CALENDAR_ROW_HEIGHT_PX,
  compareMonth,
  estimateMonthBlockHeightPx,
  monthIndexFromMin,
  monthKey,
  monthRows,
  monthsInclusiveCount,
  plainYearMonthAt,
  weekdayLabels,
} from '../components/Calendar.utils'

interface UseInfiniteMonthScrollArgs {
  locale: string
  weekStartsOn: WeekStartsOn
  initialMonth: Temporal.PlainYearMonth
  minMonth: Temporal.PlainYearMonth
  maxMonth: Temporal.PlainYearMonth
  onMonthChange?: (monthStart: Temporal.PlainYearMonth) => void
  /**
   * `Date.now()` 가 이 값 미만이면 `handleScroll` 에서 `isScrolling`/오버레이 타이머를 건너뛴다.
   * 보조 뷰 → `days` 복귀 시 레이아웃 스크롤 깜빡임 방지용 (`useSuppressMonthOverlayOnReturnToDays`).
   */
  overlaySuppressUntilRef?: MutableRefObject<number>
}

function patchTestScrollViewport(scrollElement: Element | null) {
  if (import.meta.env.MODE !== 'test' || !scrollElement) return
  const el = scrollElement as HTMLElement
  try {
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 440 })
    Object.defineProperty(el, 'offsetWidth', { configurable: true, value: 352 })
  } catch {
    /* offset* may be non-configurable */
  }
}

const observeElementRect = ((instance: Virtualizer<Element, Element>, cb: (rect: Rect) => void) => {
  patchTestScrollViewport(instance.scrollElement)
  return observeElementRectImpl(instance, cb)
}) as typeof observeElementRectImpl

function readCalendarRowHeightPx(scrollElement: HTMLDivElement | null): number {
  if (!scrollElement || typeof window === 'undefined') return DEFAULT_CALENDAR_ROW_HEIGHT_PX
  const raw = window.getComputedStyle(scrollElement).getPropertyValue('--calendar-row-height').trim()
  if (!raw) return DEFAULT_CALENDAR_ROW_HEIGHT_PX
  if (raw.endsWith('px')) {
    const px = Number.parseFloat(raw)
    return Number.isFinite(px) ? px : DEFAULT_CALENDAR_ROW_HEIGHT_PX
  }
  if (raw.endsWith('rem')) {
    const rem = Number.parseFloat(raw)
    if (!Number.isFinite(rem)) return DEFAULT_CALENDAR_ROW_HEIGHT_PX
    const rootFontSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize)
    return Number.isFinite(rootFontSize) ? rem * rootFontSize : DEFAULT_CALENDAR_ROW_HEIGHT_PX
  }
  const numeric = Number.parseFloat(raw)
  return Number.isFinite(numeric) ? numeric : DEFAULT_CALENDAR_ROW_HEIGHT_PX
}

function sumEstimatedMonthHeightsBefore(
  minMonthYear: number,
  minMonthMonth: number,
  endIndex: number,
  weekStartsOn: WeekStartsOn,
  rowHeightPx: number,
): number {
  let acc = 0
  for (let i = 0; i < endIndex; i += 1) {
    acc += estimateMonthBlockHeightPx(plainYearMonthAt(minMonthYear, minMonthMonth, i), i, weekStartsOn, rowHeightPx)
  }
  return acc
}

export interface InfiniteMonthScrollRuntime {
  weekdays: string[]
  minMonth: Temporal.PlainYearMonth
  maxMonth: Temporal.PlainYearMonth
  monthCount: number
  monthVirtualizer: Virtualizer<HTMLDivElement, Element>
  currentMonth: Temporal.PlainYearMonth
  isScrolling: boolean
  monthRefs: RefObject<Map<string, HTMLElement>>
  scrollRef: RefObject<HTMLDivElement | null>
  handleScroll: (event: UIEvent<HTMLDivElement>) => void
  scrollToMonth: (target: Temporal.PlainYearMonth, align?: 'start' | 'center' | 'end' | 'auto') => void
  expandForTargetMonth: (target: Temporal.PlainYearMonth) => void
  keepMonthVisible: (month: Temporal.PlainYearMonth) => void
  scrollToDate: (date: Temporal.PlainDate) => void
  getDateViewportPlacement: (date: Temporal.PlainDate) => DateViewportPlacement
}

export function useInfiniteMonthScroll(args: UseInfiniteMonthScrollArgs): InfiniteMonthScrollRuntime {
  const { locale, weekStartsOn, initialMonth, minMonth, maxMonth, onMonthChange, overlaySuppressUntilRef } = args
  const minMonthYear = minMonth.year
  const minMonthMonth = minMonth.month

  const monthCount = useMemo(() => monthsInclusiveCount(minMonth, maxMonth), [minMonth, maxMonth])
  const [rowHeightPx, setRowHeightPx] = useState(DEFAULT_CALENDAR_ROW_HEIGHT_PX)
  const initialMonthIndex = useMemo(() => monthIndexFromMin(minMonth, initialMonth), [initialMonth, minMonth])
  const initialOffset = useMemo(() => {
    const clamped = Math.max(0, Math.min(monthCount - 1, initialMonthIndex))
    const offset = sumEstimatedMonthHeightsBefore(minMonthYear, minMonthMonth, clamped, weekStartsOn, rowHeightPx)
    return Math.max(0, offset - 12)
  }, [initialMonthIndex, minMonthMonth, minMonthYear, monthCount, rowHeightPx, weekStartsOn])

  const estimateSize = useCallback(
    (index: number) =>
      estimateMonthBlockHeightPx(plainYearMonthAt(minMonthYear, minMonthMonth, index), index, weekStartsOn, rowHeightPx),
    [minMonthMonth, minMonthYear, rowHeightPx, weekStartsOn],
  )

  const [currentMonth, setCurrentMonth] = useState<Temporal.PlainYearMonth>(initialMonth)
  /**
   * 월 라벨 오버레이(`.calendar__scroll.is-scrolling` → `calendar.overlay.css`) 트리거.
   * - 초기값 **`false`** — 첫 페인트에서 오버레이가 켜지지 않는다.
   * - 과거에는 `true` 로 두고 마운트 시 `setTimeout(..., 800)` 으로 끄는 보정이 있었으나, `false` 시작으로
   *   대체해 해당 `useEffect` 는 제거했다.
   * - 사용자 스크롤 시 `handleScroll` 이 `true` 로 올리고 180ms 후 `false`. 보조 뷰 → `days` 복귀 직후에는
   *   `overlaySuppressUntilRef` 로 이 타이머만 건너뛴다(`useSuppressMonthOverlayOnReturnToDays` 참고).
   */
  const [isScrolling, setIsScrolling] = useState(false)

  const monthRefs = useRef<Map<string, HTMLElement>>(new Map())
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const scrollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return
    const next = readCalendarRowHeightPx(scrollEl)
    setRowHeightPx((prev) => (prev === next ? prev : next))
  }, [])

  const weekdays = useMemo(() => weekdayLabels(locale, weekStartsOn), [locale, weekStartsOn])

  const monthVirtualizer = useVirtualizer({
    count: monthCount,
    getScrollElement: () => scrollRef.current,
    initialOffset,
    estimateSize,
    overscan: 4,
    getItemKey: (index) => monthKey(plainYearMonthAt(minMonthYear, minMonthMonth, index)),
    observeElementRect,
  })

  const virtualizerRef = useRef(monthVirtualizer)
  virtualizerRef.current = monthVirtualizer

  useEffect(() => {
    onMonthChange?.(currentMonth)
  }, [currentMonth, onMonthChange])

  const scrollToMonthIndex = useCallback(
    (index: number, align: 'start' | 'center' | 'end' | 'auto' = 'auto') => {
      const clamped = Math.max(0, Math.min(monthCount - 1, index))
      monthVirtualizer.scrollToIndex(clamped, { align })
    },
    [monthCount, monthVirtualizer],
  )

  const scrollToMonth = useCallback(
    (target: Temporal.PlainYearMonth, align: 'start' | 'center' | 'end' | 'auto' = 'auto') => {
      if (compareMonth(target, minMonth) < 0 || compareMonth(target, maxMonth) > 0) return
      scrollToMonthIndex(monthIndexFromMin(minMonth, target), align)
    },
    [maxMonth, minMonth, scrollToMonthIndex],
  )

  const expandForTargetMonth = useCallback(
    (target: Temporal.PlainYearMonth) => {
      scrollToMonth(target, 'auto')
    },
    [scrollToMonth],
  )

  const keepMonthVisible = useCallback(
    (month: Temporal.PlainYearMonth) => {
      expandForTargetMonth(month)
    },
    [expandForTargetMonth],
  )

  const getMonthStartOffset = useCallback(
    (monthIndex: number): number => {
      const v = virtualizerRef.current
      const virtualItem = v.getVirtualItems().find((item) => item.index === monthIndex)
      if (virtualItem) return virtualItem.start
      const offset = v.getOffsetForIndex(monthIndex, 'start')
      if (offset) return offset[0]
      return sumEstimatedMonthHeightsBefore(minMonthYear, minMonthMonth, monthIndex, weekStartsOn, rowHeightPx)
    },
    [minMonthMonth, minMonthYear, rowHeightPx, weekStartsOn],
  )

  const getDateViewportPlacement = useCallback(
    (date: Temporal.PlainDate): DateViewportPlacement => {
      const scrollEl = scrollRef.current
      if (!scrollEl) return 'visible'
      const month = date.toPlainYearMonth()
      if (compareMonth(month, minMonth) < 0 || compareMonth(month, maxMonth) > 0) return 'visible'

      const monthIndex = monthIndexFromMin(minMonth, month)
      const rows = monthRows(month, weekStartsOn)
      const rowIndex = Math.max(
        0,
        rows.findIndex((row) => row.some((day) => day.day === date.day)),
      )

      const rowTop = getMonthStartOffset(monthIndex) + rowIndex * rowHeightPx
      const rowBottom = rowTop + rowHeightPx
      const margin = 12
      const viewTop = scrollEl.scrollTop + margin
      const viewBottom = scrollEl.scrollTop + scrollEl.clientHeight - margin

      if (rowBottom <= viewTop) return 'above'
      if (rowTop >= viewBottom) return 'below'
      return 'visible'
    },
    [getMonthStartOffset, maxMonth, minMonth, rowHeightPx, weekStartsOn],
  )

  const scrollToDate = useCallback(
    (date: Temporal.PlainDate) => {
      const scrollEl = scrollRef.current
      if (!scrollEl) return
      const month = date.toPlainYearMonth()
      if (compareMonth(month, minMonth) < 0 || compareMonth(month, maxMonth) > 0) return

      const monthIndex = monthIndexFromMin(minMonth, month)
      const rows = monthRows(month, weekStartsOn)
      const rowIndex = Math.max(
        0,
        rows.findIndex((row) => row.some((day) => day.day === date.day)),
      )

      const rowTop = getMonthStartOffset(monthIndex) + rowIndex * rowHeightPx
      const rowCenter = rowTop + rowHeightPx / 2
      const clientH = scrollEl.clientHeight
      const rawScrollTop = rowCenter - clientH / 2
      const maxScrollTop = Math.max(0, monthVirtualizer.getTotalSize() - clientH)
      const nextScrollTop = Math.max(0, Math.min(maxScrollTop, rawScrollTop))
      monthVirtualizer.scrollToOffset(nextScrollTop)
    },
    [getMonthStartOffset, maxMonth, minMonth, monthVirtualizer, rowHeightPx, weekStartsOn],
  )

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const el = event.currentTarget
      const { scrollTop, clientHeight } = el
      const suppressUntil = overlaySuppressUntilRef?.current ?? 0
      if (Date.now() >= suppressUntil) {
        setIsScrolling((prev) => (prev ? prev : true))
        if (scrollingTimerRef.current) clearTimeout(scrollingTimerRef.current)
        scrollingTimerRef.current = setTimeout(() => setIsScrolling(false), 180)
      }
      /* 억제 중에도 뷰포트 중앙 월은 항상 갱신 */

      const v = virtualizerRef.current
      const centerOffset = scrollTop + clientHeight / 2
      const item = v.getVirtualItemForOffset(centerOffset)
      if (item) {
        const next = plainYearMonthAt(minMonthYear, minMonthMonth, item.index)
        setCurrentMonth((prev: Temporal.PlainYearMonth) => (compareMonth(next, prev) !== 0 ? next : prev))
      }
    },
    [minMonthMonth, minMonthYear, overlaySuppressUntilRef],
  )

  return {
    weekdays,
    minMonth,
    maxMonth,
    monthCount,
    monthVirtualizer,
    currentMonth,
    isScrolling,
    monthRefs,
    scrollRef,
    handleScroll,
    scrollToMonth,
    expandForTargetMonth,
    keepMonthVisible,
    scrollToDate,
    getDateViewportPlacement,
  }
}
