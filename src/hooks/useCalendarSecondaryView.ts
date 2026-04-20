import type { Temporal } from '@js-temporal/polyfill'
import type { Virtualizer } from '@tanstack/react-virtual'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { monthIndexFromMin } from '../components/Calendar.utils'
import type { CalendarDisplayMode, CalendarTimeEditTarget } from '../components/Calendar.types'

/**
 * Secondary view(보조 뷰) 상태 + `scrollToMonth` / `openTimeView` 유틸을 제공하는 훅.
 *
 * single / multiple / range runtime 훅 세 곳에서 동일 로직이 필요해 분리했다.
 * `'months'`, `'time'` 양쪽 보조 뷰를 전부 여기서 관리한다.
 *
 * `scrollToMonth`의 핵심 주의점:
 *   picker 가 열린 상태에서는 `.calendar__scroll` 이 아직 DOM에 없으므로
 *   virtualizer의 `scrollToIndex` 는 무효가 된다. 따라서 내부적으로 pending
 *   타깃을 ref에 저장해두고, `displayMode` 가 `'days'` 로 바뀐 직후
 *   `useLayoutEffect` 타이밍에 실행한다.
 *
 * `timeEditTarget` 규칙:
 *   - `openTimeView(target)` 은 `displayMode='time'` 과 타깃을 원자적으로 세팅.
 *   - `setDisplayMode(mode)` 호출로 `'time'` 이외 모드로 빠져나가면 자동으로 `null` 로 초기화.
 *     (뷰 전환 경로를 늘리지 않기 위해 하나의 setter 로 일관되게 관리)
 */
interface UseCalendarSecondaryViewArgs {
  minMonth: Temporal.PlainYearMonth
  monthCount: number
  monthVirtualizer: Virtualizer<HTMLDivElement, Element>
}

export interface CalendarSecondaryView {
  displayMode: CalendarDisplayMode
  setDisplayMode: (mode: CalendarDisplayMode) => void
  scrollToMonth: (target: Temporal.PlainYearMonth) => void
  timeEditTarget: CalendarTimeEditTarget | null
  openTimeView: (target: CalendarTimeEditTarget) => void
}

export function useCalendarSecondaryView({
  minMonth,
  monthCount,
  monthVirtualizer,
}: UseCalendarSecondaryViewArgs): CalendarSecondaryView {
  const [displayMode, setDisplayModeInternal] = useState<CalendarDisplayMode>('days')
  const [timeEditTarget, setTimeEditTarget] = useState<CalendarTimeEditTarget | null>(null)
  const pendingTargetRef = useRef<Temporal.PlainYearMonth | null>(null)

  const setDisplayMode = useCallback((mode: CalendarDisplayMode) => {
    setDisplayModeInternal(mode)
    if (mode !== 'time') setTimeEditTarget(null)
  }, [])

  const openTimeView = useCallback((target: CalendarTimeEditTarget) => {
    setTimeEditTarget(target)
    setDisplayModeInternal('time')
  }, [])

  const runScrollToMonth = useCallback(
    (target: Temporal.PlainYearMonth) => {
      const idx = monthIndexFromMin(minMonth, target)
      /**
       * align: 'center' — picker 에서 월을 선택했을 때 사용자가 **그 월을** 보고 있었으므로
       * 해당 월 블록이 스크롤 영역 중앙에 오도록 배치한다.
       * (시작 정렬 시 long-month 의 앞부분만 보이고, 두 달 이전 끝부분이 노출되어 맥락이 틀어짐)
       */
      monthVirtualizer.scrollToIndex(Math.max(0, Math.min(monthCount - 1, idx)), { align: 'center' })
    },
    [minMonth, monthCount, monthVirtualizer],
  )

  /** picker 가 요청한 스크롤. displayMode 가 이미 'days' 면 즉시, 아니면 defer. */
  const scrollToMonth = useCallback(
    (target: Temporal.PlainYearMonth) => {
      if (displayMode === 'days') {
        runScrollToMonth(target)
        return
      }
      pendingTargetRef.current = target
    },
    [displayMode, runScrollToMonth],
  )

  useLayoutEffect(() => {
    if (displayMode !== 'days') return
    const target = pendingTargetRef.current
    if (!target) return
    pendingTargetRef.current = null
    runScrollToMonth(target)
  }, [displayMode, runScrollToMonth])

  return { displayMode, setDisplayMode, scrollToMonth, timeEditTarget, openTimeView }
}
