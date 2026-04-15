import type { Temporal } from '@js-temporal/polyfill'
import type { Rect, Virtualizer } from '@tanstack/react-virtual'
import { observeElementRect as observeElementRectImpl, useVirtualizer } from '@tanstack/react-virtual'
import type { RefObject, UIEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CALENDAR_ROW_HEIGHT_PX,
  compareMonth,
  estimateMonthBlockHeightPx,
  monthAtOffset,
  monthIndexFromMin,
  monthKey,
  monthRows,
  monthsInclusiveCount,
  weekdayLabels,
} from '../components/Calendar.utils'

interface UseInfiniteMonthScrollArgs {
  locale: string
  initialMonth: Temporal.PlainYearMonth
  minMonth: Temporal.PlainYearMonth
  maxMonth: Temporal.PlainYearMonth
  onMonthChange?: (monthStart: Temporal.PlainYearMonth) => void
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
  expandForTargetMonth: (target: Temporal.PlainYearMonth) => void
  keepMonthVisible: (month: Temporal.PlainYearMonth) => void
  keepDateVisible: (date: Temporal.PlainDate) => void
}

export function useInfiniteMonthScroll(args: UseInfiniteMonthScrollArgs): InfiniteMonthScrollRuntime {
  const { locale, initialMonth, minMonth, maxMonth, onMonthChange } = args

  const monthCount = useMemo(() => monthsInclusiveCount(minMonth, maxMonth), [minMonth, maxMonth])
  const estimatedMonthHeights = useMemo(
    () =>
      Array.from({ length: monthCount }, (_, index) => estimateMonthBlockHeightPx(monthAtOffset(minMonth, index), index)),
    [minMonth, monthCount],
  )
  const estimatedMonthOffsets = useMemo(() => {
    const offsets: number[] = new Array(monthCount)
    let acc = 0
    for (let i = 0; i < monthCount; i += 1) {
      offsets[i] = acc
      acc += estimatedMonthHeights[i] ?? 0
    }
    return offsets
  }, [estimatedMonthHeights, monthCount])
  const initialMonthIndex = useMemo(() => monthIndexFromMin(minMonth, initialMonth), [initialMonth, minMonth])
  const initialOffset = useMemo(() => {
    const clamped = Math.max(0, Math.min(monthCount - 1, initialMonthIndex))
    const offset = estimatedMonthOffsets[clamped] ?? 0
    return Math.max(0, offset - 12)
  }, [estimatedMonthOffsets, initialMonthIndex, monthCount])

  const [currentMonth, setCurrentMonth] = useState<Temporal.PlainYearMonth>(initialMonth)
  const [isScrolling, setIsScrolling] = useState(true)

  const monthRefs = useRef<Map<string, HTMLElement>>(new Map())
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const scrollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const weekdays = useMemo(() => weekdayLabels(locale), [locale])

  const monthVirtualizer = useVirtualizer({
    count: monthCount,
    getScrollElement: () => scrollRef.current,
    initialOffset,
    estimateSize: (index) => estimatedMonthHeights[index] ?? CALENDAR_ROW_HEIGHT_PX * 5,
    overscan: 4,
    getItemKey: (index) => monthKey(monthAtOffset(minMonth, index)),
    observeElementRect,
  })

  const virtualizerRef = useRef(monthVirtualizer)
  virtualizerRef.current = monthVirtualizer

  useEffect(() => {
    scrollingTimerRef.current = setTimeout(() => setIsScrolling(false), 800)
    return () => {
      if (scrollingTimerRef.current) clearTimeout(scrollingTimerRef.current)
    }
  }, [])

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

  const expandForTargetMonth = useCallback(
    (target: Temporal.PlainYearMonth) => {
      if (compareMonth(target, minMonth) < 0 || compareMonth(target, maxMonth) > 0) return
      scrollToMonthIndex(monthIndexFromMin(minMonth, target), 'auto')
    },
    [maxMonth, minMonth, scrollToMonthIndex],
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
      return estimatedMonthOffsets[monthIndex] ?? 0
    },
    [estimatedMonthOffsets],
  )

  const keepDateVisible = useCallback(
    (date: Temporal.PlainDate) => {
      const scrollEl = scrollRef.current
      if (!scrollEl) return
      const month = date.toPlainYearMonth()
      if (compareMonth(month, minMonth) < 0 || compareMonth(month, maxMonth) > 0) return

      const monthIndex = monthIndexFromMin(minMonth, month)
      const rows = monthRows(month)
      const rowIndex = Math.max(
        0,
        rows.findIndex((row) => row.some((day) => day.day === date.day)),
      )

      const rowTop = getMonthStartOffset(monthIndex) + rowIndex * CALENDAR_ROW_HEIGHT_PX
      const rowBottom = rowTop + CALENDAR_ROW_HEIGHT_PX
      const viewTop = scrollEl.scrollTop + 12
      const viewBottom = scrollEl.scrollTop + scrollEl.clientHeight - 12

      if (rowTop < viewTop) monthVirtualizer.scrollToOffset(Math.max(0, rowTop - 12))
      else if (rowBottom > viewBottom) {
        monthVirtualizer.scrollToOffset(Math.max(0, rowBottom - scrollEl.clientHeight + 12))
      }
    },
    [getMonthStartOffset, maxMonth, minMonth, monthVirtualizer],
  )

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const el = event.currentTarget
      const { scrollTop, clientHeight } = el
      setIsScrolling(true)
      if (scrollingTimerRef.current) clearTimeout(scrollingTimerRef.current)
      scrollingTimerRef.current = setTimeout(() => setIsScrolling(false), 180)

      const v = virtualizerRef.current
      const centerOffset = scrollTop + clientHeight / 2
      const item = v.getVirtualItemForOffset(centerOffset)
      if (item) {
        const next = monthAtOffset(minMonth, item.index)
        setCurrentMonth((prev: Temporal.PlainYearMonth) => (compareMonth(next, prev) !== 0 ? next : prev))
      }
    },
    [minMonth],
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
    expandForTargetMonth,
    keepMonthVisible,
    keepDateVisible,
  }
}
