import { Temporal } from '@js-temporal/polyfill'
import type { RefObject, UIEvent } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  EDGE_THRESHOLD_PX,
  PAGE_MONTH_COUNT,
  buildMonthWindow,
  compareMonth,
  monthKey,
  weekdayLabels,
} from '../components/Calendar.utils'

interface UseInfiniteMonthScrollArgs {
  locale: string
  initialMonth: Temporal.PlainYearMonth
  minMonth: Temporal.PlainYearMonth
  maxMonth: Temporal.PlainYearMonth
  onMonthChange?: (monthStart: Temporal.PlainYearMonth) => void
}

interface InfiniteMonthScrollRuntime {
  weekdays: string[]
  months: Temporal.PlainYearMonth[]
  isScrolling: boolean
  monthRefs: RefObject<Map<string, HTMLElement>>
  scrollRef: RefObject<HTMLDivElement | null>
  handleScroll: (event: UIEvent<HTMLDivElement>) => void
  expandForTargetMonth: (target: Temporal.PlainYearMonth) => void
  keepMonthVisible: (month: Temporal.PlainYearMonth) => void
}

export function useInfiniteMonthScroll(args: UseInfiniteMonthScrollArgs): InfiniteMonthScrollRuntime {
  const { locale, initialMonth, minMonth, maxMonth, onMonthChange } = args
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
    if (top < viewTop + 12) scrollEl.scrollTo({ top: Math.max(0, top - 12) })
    else if (bottom > viewBottom - 12) {
      scrollEl.scrollTo({ top: Math.max(0, bottom - scrollEl.clientHeight + 12) })
    }
  }, [])

  const detectCurrentMonth = useCallback((scrollTop: number): Temporal.PlainYearMonth | null => {
    const ordered = monthsRef.current
    if (ordered.length === 0) return null
    let candidate = ordered[0] ?? null
    for (const month of ordered) {
      const node = monthRefs.current.get(monthKey(month))
      if (!node) continue
      if (node.offsetTop <= scrollTop + 36) candidate = month
      else break
    }
    return candidate
  }, [])

  const appendAtBottom = useCallback(() => {
    const last = monthsRef.current[monthsRef.current.length - 1]
    if (!last) return
    const toAppend: Temporal.PlainYearMonth[] = []
    for (let i = 1; i <= PAGE_MONTH_COUNT; i += 1) {
      const candidate = last.add({ months: i })
      if (compareMonth(candidate, maxMonth) > 0) break
      toAppend.push(candidate)
    }
    if (toAppend.length > 0) setMonths((prev) => [...prev, ...toAppend])
  }, [maxMonth])

  const prependAtTop = useCallback(
    (scrollHeight: number) => {
      const first = monthsRef.current[0]
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
      if (month && compareMonth(month, currentMonth) !== 0) setCurrentMonth(month)

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
      scrollEl.scrollTop += scrollEl.scrollHeight - pending.prevHeight
      prependAdjustRef.current = null
    }
  }, [months])

  return { weekdays, months, isScrolling, monthRefs, scrollRef, handleScroll, expandForTargetMonth, keepMonthVisible }
}
