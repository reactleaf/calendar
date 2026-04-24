import type { Temporal } from '@js-temporal/polyfill'
import type { MutableRefObject, RefObject, UIEvent } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DateViewportPlacement } from '../components/Calendar.types'
import type { WeekStartsOn } from '../core/monthGrid'
import { type Align, type ItemSizeGetter, SizeAndPositionManager } from '../core/sizeAndPositionManager'
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

const FAST_SCROLLING_CLASS = 'is-fast-scrolling'
const FAST_SCROLL_PX_PER_EVENT = 10
const FAST_SCROLL_CLEAR_MS = 100
const MONTH_OVERSCAN = 4
const TEST_VIEWPORT_HEIGHT = 440
const TEST_VIEWPORT_WIDTH = 352

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
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: TEST_VIEWPORT_HEIGHT })
    Object.defineProperty(el, 'offsetWidth', { configurable: true, value: TEST_VIEWPORT_WIDTH })
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: TEST_VIEWPORT_HEIGHT })
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: TEST_VIEWPORT_WIDTH })
  } catch {
    /* offset* / client* may be non-configurable */
  }
}

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

function setScrollTop(scrollEl: HTMLDivElement, top: number): void {
  if (typeof scrollEl.scrollTo === 'function') {
    scrollEl.scrollTo({ top })
  }
  scrollEl.scrollTop = top
}

export interface VirtualMonthItem {
  index: number
  start: number
  size: number
  key: string
}

export interface MonthVirtualizerShim {
  getVirtualItems(): VirtualMonthItem[]
  getTotalSize(): number
}

export interface InfiniteMonthScrollRuntime {
  weekdays: string[]
  minMonth: Temporal.PlainYearMonth
  maxMonth: Temporal.PlainYearMonth
  monthCount: number
  monthVirtualizer: MonthVirtualizerShim
  currentMonth: Temporal.PlainYearMonth
  isScrolling: boolean
  monthRefs: RefObject<Map<string, HTMLElement>>
  scrollRef: RefObject<HTMLDivElement | null>
  handleScroll: (event: UIEvent<HTMLDivElement>) => void
  scrollToMonth: (target: Temporal.PlainYearMonth, align?: Align) => void
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
  const [viewportHeight, setViewportHeight] = useState(0)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [currentMonth, setCurrentMonth] = useState<Temporal.PlainYearMonth>(initialMonth)
  const [isScrolling, setIsScrolling] = useState(false)

  const monthRefs = useRef<Map<string, HTMLElement>>(new Map())
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const didInitialScrollRef = useRef(false)
  const scrollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fastScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastScrollTopRef = useRef<number | null>(null)

  const initialMonthIndex = useMemo(() => monthIndexFromMin(minMonth, initialMonth), [initialMonth, minMonth])
  const getInitialOffset = useCallback(
    (height: number) => {
      const clamped = Math.max(0, Math.min(monthCount - 1, initialMonthIndex))
      const offset = sumEstimatedMonthHeightsBefore(minMonthYear, minMonthMonth, clamped, weekStartsOn, height)
      return Math.max(0, offset - 12)
    },
    [initialMonthIndex, minMonthMonth, minMonthYear, monthCount, weekStartsOn],
  )
  const getInitialOffsetRef = useRef(getInitialOffset)
  getInitialOffsetRef.current = getInitialOffset

  const itemSizeGetter = useCallback<ItemSizeGetter>(
    (index) =>
      estimateMonthBlockHeightPx(
        plainYearMonthAt(minMonthYear, minMonthMonth, index),
        index,
        weekStartsOn,
        rowHeightPx,
      ),
    [minMonthMonth, minMonthYear, rowHeightPx, weekStartsOn],
  )
  const estimatedItemSize = useMemo(() => 6 * rowHeightPx, [rowHeightPx])
  const sizeManager = useMemo(
    () => new SizeAndPositionManager({ itemCount: monthCount, itemSizeGetter, estimatedItemSize }),
    [estimatedItemSize, itemSizeGetter, monthCount],
  )

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl || didInitialScrollRef.current) return
    didInitialScrollRef.current = true

    patchTestScrollViewport(scrollEl)
    const nextRowHeight = readCalendarRowHeightPx(scrollEl)
    setRowHeightPx((prev) => (prev === nextRowHeight ? prev : nextRowHeight))

    const initialOffset = getInitialOffsetRef.current(nextRowHeight)
    setScrollTop(scrollEl, initialOffset)
    lastScrollTopRef.current = initialOffset
    setScrollOffset(initialOffset)
    setViewportHeight(scrollEl.clientHeight)

    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        const nextHeight = scrollEl.clientHeight
        setViewportHeight((prev) => (prev === nextHeight ? prev : nextHeight))
      })
      ro.observe(scrollEl)
    }

    return () => {
      ro?.disconnect()
    }
  }, [])

  useEffect(() => {
    onMonthChange?.(currentMonth)
  }, [currentMonth, onMonthChange])

  useEffect(() => {
    return () => {
      if (scrollingTimerRef.current) clearTimeout(scrollingTimerRef.current)
      if (fastScrollTimerRef.current) clearTimeout(fastScrollTimerRef.current)
    }
  }, [])

  const weekdays = useMemo(() => weekdayLabels(locale, weekStartsOn), [locale, weekStartsOn])

  const virtualItems = useMemo<VirtualMonthItem[]>(() => {
    if (viewportHeight <= 0 || monthCount === 0) return []
    const range = sizeManager.getVisibleRange({
      containerSize: viewportHeight,
      offset: scrollOffset,
      overscanCount: MONTH_OVERSCAN,
    })
    if (range.start < 0) return []

    const items: VirtualMonthItem[] = []
    for (let index = range.start; index <= range.stop; index += 1) {
      const { offset, size } = sizeManager.getSizeAndPositionForIndex(index)
      items.push({
        index,
        start: offset,
        size,
        key: monthKey(plainYearMonthAt(minMonthYear, minMonthMonth, index)),
      })
    }
    return items
  }, [minMonthMonth, minMonthYear, monthCount, scrollOffset, sizeManager, viewportHeight])

  const monthVirtualizer = useMemo<MonthVirtualizerShim>(
    () => ({
      getVirtualItems: () => virtualItems,
      getTotalSize: () => sizeManager.getTotalSize(),
    }),
    [sizeManager, virtualItems],
  )

  const scrollToMonthIndex = useCallback(
    (index: number, align: Align = 'auto') => {
      const scrollEl = scrollRef.current
      if (!scrollEl) return
      const clamped = Math.max(0, Math.min(monthCount - 1, index))
      const containerSize = scrollEl.clientHeight || TEST_VIEWPORT_HEIGHT
      const nextScrollTop = sizeManager.getUpdatedOffsetForIndex({
        align,
        containerSize,
        currentOffset: scrollEl.scrollTop,
        targetIndex: clamped,
      })
      setScrollTop(scrollEl, nextScrollTop)
      lastScrollTopRef.current = nextScrollTop
      setScrollOffset(nextScrollTop)
    },
    [monthCount, sizeManager],
  )

  const scrollToOffset = useCallback((top: number) => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return
    setScrollTop(scrollEl, top)
    lastScrollTopRef.current = top
    setScrollOffset(top)
  }, [])

  const scrollToMonth = useCallback(
    (target: Temporal.PlainYearMonth, align: Align = 'auto') => {
      if (compareMonth(target, minMonth) < 0 || compareMonth(target, maxMonth) > 0) return
      scrollToMonthIndex(monthIndexFromMin(minMonth, target), align)
      setCurrentMonth((prev: Temporal.PlainYearMonth) => (compareMonth(target, prev) !== 0 ? target : prev))
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
      return sizeManager.getSizeAndPositionForIndex(monthIndex).offset
    },
    [sizeManager],
  )

  const getDateViewportPlacement = useCallback(
    (date: Temporal.PlainDate): DateViewportPlacement => {
      const scrollEl = scrollRef.current
      if (!scrollEl) return 'visible'
      const month = date.toPlainYearMonth()
      if (compareMonth(month, minMonth) < 0 || compareMonth(month, maxMonth) > 0) return 'visible'

      const monthIndex = monthIndexFromMin(minMonth, month)
      const targetDate = date.toString()
      const rows = monthRows(month, weekStartsOn)
      const rowIndex = Math.max(
        0,
        rows.findIndex((row) => row.includes(targetDate)),
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
      const targetDate = date.toString()
      const rows = monthRows(month, weekStartsOn)
      const rowIndex = Math.max(
        0,
        rows.findIndex((row) => row.includes(targetDate)),
      )

      const rowTop = getMonthStartOffset(monthIndex) + rowIndex * rowHeightPx
      const rowCenter = rowTop + rowHeightPx / 2
      const clientH = scrollEl.clientHeight
      const rawScrollTop = rowCenter - clientH / 2
      const maxScrollTop = Math.max(0, sizeManager.getTotalSize() - clientH)
      const nextScrollTop = Math.max(0, Math.min(maxScrollTop, rawScrollTop))
      scrollToOffset(nextScrollTop)
      setCurrentMonth((prev: Temporal.PlainYearMonth) => (compareMonth(month, prev) !== 0 ? month : prev))
    },
    [getMonthStartOffset, maxMonth, minMonth, rowHeightPx, scrollToOffset, sizeManager, weekStartsOn],
  )

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const el = event.currentTarget
      const { scrollTop, clientHeight } = el
      setScrollOffset(scrollTop)

      const prevTop = lastScrollTopRef.current
      if (prevTop !== null && Math.abs(scrollTop - prevTop) >= FAST_SCROLL_PX_PER_EVENT) {
        el.classList.add(FAST_SCROLLING_CLASS)
        if (fastScrollTimerRef.current) clearTimeout(fastScrollTimerRef.current)
        fastScrollTimerRef.current = setTimeout(() => {
          scrollRef.current?.classList.remove(FAST_SCROLLING_CLASS)
          fastScrollTimerRef.current = null
        }, FAST_SCROLL_CLEAR_MS)
      }
      lastScrollTopRef.current = scrollTop

      const centerOffset = scrollTop + clientHeight / 2
      const range = sizeManager.getVisibleRange({
        containerSize: Math.max(clientHeight, 1),
        offset: centerOffset,
        overscanCount: 0,
      })
      if (range.start >= 0) {
        const next = plainYearMonthAt(minMonthYear, minMonthMonth, range.start)
        setCurrentMonth((prev: Temporal.PlainYearMonth) => (compareMonth(next, prev) !== 0 ? next : prev))
      }

      const suppressUntil = overlaySuppressUntilRef?.current ?? 0
      if (Date.now() >= suppressUntil) {
        setIsScrolling((prev) => (prev ? prev : true))
        if (scrollingTimerRef.current) clearTimeout(scrollingTimerRef.current)
        scrollingTimerRef.current = setTimeout(() => {
          setIsScrolling(false)
          scrollingTimerRef.current = null
        }, 180)
      }
    },
    [minMonthMonth, minMonthYear, overlaySuppressUntilRef, sizeManager],
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
