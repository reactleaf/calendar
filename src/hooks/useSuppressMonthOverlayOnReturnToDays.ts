import { useLayoutEffect, useRef, type MutableRefObject } from 'react'
import type { CalendarDisplayMode } from '../components/Calendar.types'

/**
 * 월/시간 보조 뷰에서 다시 `'days'` 로 돌아올 때, 마운트되는 스크롤 영역이
 * 레이아웃·가상 스크롤러에 의해 `scroll` 이벤트를 한 번 내 보내는 경우가 있다.
 * 그때 `isScrolling` 이 잠깐 true 가 되면 월 라벨 오버레이가 깜빡인다.
 *
 * `displayMode` 가 **`days` 가 아닌 값 → `days`** 로 바뀌는 전환에 한해
 * `overlaySuppressUntilRef` 에 미래 시각을 넣고, 그동안 `useInfiniteMonthScroll` 의 `handleScroll` 이
 * `setIsScrolling` / 180ms 타이머를 실행하지 않게 한다. (`currentMonth` 스크롤 추적은 그대로.)
 * 최초 마운트(`prev === undefined`) 에는 적용하지 않는다 — 첫 페인트는 이미 `isScrolling` 초기 `false` 로 처리.
 *
 * 시각은 `Date.now() + 340`(ms) — 레이아웃·연속 `scroll` 에 잠깐 덮이도록 180ms 오버레이 타이머보다 길게 잡는다.
 * single / multiple / range 런타임에서 `overlaySuppressUntilRef` 를 만들어 이 훅과 `useInfiniteMonthScroll` 에 함께 넘긴다.
 */
export function useSuppressMonthOverlayOnReturnToDays(
  displayMode: CalendarDisplayMode,
  overlaySuppressUntilRef: MutableRefObject<number>,
): void {
  const prevDisplayModeRef = useRef<CalendarDisplayMode | undefined>(undefined)

  useLayoutEffect(() => {
    const prev = prevDisplayModeRef.current
    if (displayMode === 'days' && prev !== undefined && prev !== 'days') {
      overlaySuppressUntilRef.current = Date.now() + 340
    }
    prevDisplayModeRef.current = displayMode
  }, [displayMode, overlaySuppressUntilRef])
}
