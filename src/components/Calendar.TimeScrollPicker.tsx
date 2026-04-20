import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

/**
 * 세로 스크롤 방식의 시간 단위 피커 (hour 또는 minute 단일 축).
 *
 * 동작 원칙 (v2)
 *  - 값 리스트를 `REPEAT` 회 복제해 렌더하고, 스크롤이 경계 근처에 닿으면 동일한 slot 위치로
 *    `scrollTop` 을 silent-jump 시켜 시각적으로 **무한 루프** 가 되게 한다.
 *  - **스크롤 자체는 "탐색"** 일 뿐, 값 commit 은 일으키지 않는다. 사용자의 **아이템 클릭**
 *    이 유일한 선택 트리거.
 *  - 초기 마운트 시 1회만 현재 값에 해당하는 slot 을 뷰포트 중앙으로 정렬한다.
 *    외부에서 `currentValue` 가 바뀌어도 (예: 헤더 타이핑) **스크롤 위치는 건드리지 않고**
 *    active slot 하이라이트만 업데이트한다.
 *
 * 구현 메모
 *  - `REPEAT = 3` — 중앙 반복(index 1)이 사용자 활동 영역. 상·하 반복은 loop buffer.
 *  - 경계 감지는 `onScroll` 에서 `scrollTop` 기반. 임계 = 상단 `0.5N`, 하단 `(REPEAT-0.5)N`.
 *    silent jump 는 `scrollTop += ±N*itemPx` 로 한 사이클 이동 → 시각적 점프 없음.
 *  - jump 직후에는 `programmaticRef` 를 한 프레임 잠그어 이 이동이 다시 경계 로직을 재호출하지
 *    않도록 방지.
 *  - jsdom 환경(테스트)에서는 스크롤 레이아웃이 재현되지 않으므로, 이 컴포넌트의 "핵심 경로" 는
 *    클릭뿐 — 테스트는 클릭으로만 값 변경을 검증한다.
 *
 * a11y / 테스트
 *  - 각 아이템: `role="option"`, `aria-label={`${ariaLabelPrefix} ${value}`}`, `data-time-value`
 *  - 스크롤 컨테이너: `role="listbox"`, `aria-label={`${ariaLabelPrefix} 선택`}`, `data-time-axis`
 *  - 복제본이 존재하므로 aria-label 이 동일한 option 이 `REPEAT` 개 있을 수 있음. 검색 시
 *    `getAllByRole` 또는 unique 값 기반 Set 으로 카운트할 것.
 */
interface CalendarTimeScrollPickerProps {
  /** 노출할 값 목록. 이미 step 이 적용된 오름차순 정수 배열. */
  values: number[]
  /** 현재 선택된 값. 리스트에 없는 값이면 가장 가까운 값이 active. */
  currentValue: number | null
  /** 자리수 패딩 (hour/minute 모두 2) */
  pad: number
  onPick: (next: number) => void
  /** a11y prefix — 예: "from hour", "hour" */
  ariaLabelPrefix: string
  /** 섹션 내부 시각 라벨 (예: "H", "M") */
  columnLabel: string
  /** 테스트/스타일 쿼리용 축 식별자 */
  axis: 'hour' | 'minute'
}

const ITEM_HEIGHT_REM = 2
const REPEAT = 3
const CENTER_REP = 1 // 사용자 활동 영역 = REPEAT 의 가운데 반복

/**
 * 초기 스크롤 정렬 용도 — `values` 에서 `value` 와 가장 가까운 항목의 인덱스.
 * active 표시 여부와는 무관 (exact match 가 아니면 active 는 없음). null 이면 0.
 */
function nearestIndex(values: number[], value: number | null): number {
  if (value === null || values.length === 0) return 0
  let best = 0
  let bestDist = Math.abs(values[0]! - value)
  for (let i = 1; i < values.length; i += 1) {
    const d = Math.abs((values[i] as number) - value)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}

export function CalendarTimeScrollPicker({
  values,
  currentValue,
  pad,
  onPick,
  ariaLabelPrefix,
  columnLabel,
  axis,
}: CalendarTimeScrollPickerProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const itemHeightPxRef = useRef<number>(0)
  /** 프로그램에 의한 scrollTop 설정 중에는 `handleScroll` 의 경계 로직을 건너뛴다. */
  const programmaticRef = useRef(false)
  const programmaticTimerRef = useRef<number | null>(null)
  const onPickRef = useRef(onPick)

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  const N = values.length
  /**
   * "뷰 필터" 원칙:
   *   granularity 체크박스는 단지 노출 필터이므로, 현재 값이 `values` 에 **정확히** 존재할
   *   때만 active pip 을 표시한다. (예: coarse=5분 단위에서 실제 minute=33 이면 어느 slot 도
   *   강조하지 않음.) commit/값 자체는 절대 건드리지 않는다.
   */
  const exactActiveIdx = currentValue === null ? -1 : values.indexOf(currentValue)
  const hasActive = exactActiveIdx >= 0
  /** 초기 스크롤 anchor — active 가 있으면 그 자리, 없으면 가장 가까운 값 slot (탐색 편의). */
  const scrollAnchorIdx = hasActive ? exactActiveIdx : nearestIndex(values, currentValue)

  /**
   * rem→px 환산.
   * 우선 실제 렌더된 아이템의 `offsetHeight` 를 사용하되, 측정이 0 이면 root font-size 기반으로
   * 폴백한다. (`useLayoutEffect` 가 paint 전이라 일부 환경에서 레이아웃이 아직 반영 안 되는 케이스
   * 대비)
   */
  const measureItemHeight = useCallback(() => {
    const root = scrollRef.current
    if (!root) return 0
    const firstItem = root.querySelector<HTMLElement>('.calendar__timeScrollItem')
    const measured = firstItem?.offsetHeight ?? 0
    if (measured > 0) return measured
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    return rootFontSize * ITEM_HEIGHT_REM
  }, [])

  /**
   * 뷰포트 중앙 slot 의 **아이템 오프셋** 을 런타임에 계산.
   * frame 이 부모 flex 체인으로부터 가변 높이를 받으므로 상수 `CENTER_OFFSET` 을 쓸 수 없다.
   * `floor(visibleRows / 2)` → 홀수 rows 에서 정확한 중앙, 짝수 rows 에서는 중앙 위 쪽 slot.
   */
  const measureCenterOffset = useCallback((itemPx: number): number => {
    const root = scrollRef.current
    if (!root || itemPx <= 0) return 2
    const visibleRows = Math.max(1, Math.floor(root.clientHeight / itemPx))
    return Math.floor(visibleRows / 2)
  }, [])

  /**
   * 초기 스크롤 정렬 — 마운트 1회만.
   * 의존성 배열을 의도적으로 비워둠: 외부 `currentValue` 변화로 스크롤 위치를 이동시키지 않는다.
   */
  useLayoutEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const itemPx = measureItemHeight()
    if (itemPx === 0) return
    itemHeightPxRef.current = itemPx
    const absIdx = CENTER_REP * N + scrollAnchorIdx
    const centerOffset = measureCenterOffset(itemPx)
    programmaticRef.current = true
    root.scrollTop = (absIdx - centerOffset) * itemPx
    if (programmaticTimerRef.current !== null) window.clearTimeout(programmaticTimerRef.current)
    programmaticTimerRef.current = window.setTimeout(() => {
      programmaticRef.current = false
      programmaticTimerRef.current = null
    }, 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * 무한 루프 경계 처리 — 스크롤 위치가 상단/하단 buffer 에 들어오면 한 사이클(±N) 만큼 silent jump.
   * commit 은 절대 여기서 하지 않는다 (스크롤 = 탐색).
   */
  const handleScroll = useCallback(() => {
    if (programmaticRef.current) return
    const root = scrollRef.current
    if (!root) return
    const itemPx = itemHeightPxRef.current || measureItemHeight()
    if (!itemPx) return
    const currentIdx = root.scrollTop / itemPx
    const minBound = N * 0.5
    const maxBound = REPEAT * N - N * 0.5
    if (currentIdx < minBound) {
      programmaticRef.current = true
      root.scrollTop += N * itemPx
      requestAnimationFrame(() => {
        programmaticRef.current = false
      })
    } else if (currentIdx > maxBound) {
      programmaticRef.current = true
      root.scrollTop -= N * itemPx
      requestAnimationFrame(() => {
        programmaticRef.current = false
      })
    }
  }, [N, measureItemHeight])

  useEffect(() => {
    return () => {
      if (programmaticTimerRef.current !== null) window.clearTimeout(programmaticTimerRef.current)
    }
  }, [])

  /**
   * 아이템 클릭 → 즉시 commit + 해당 slot 을 중앙으로 smooth scroll.
   * (복제본 중 어느 것을 클릭해도 동일 값이므로 절대 인덱스 기준으로 정렬만 맞춘다.)
   */
  const handlePick = useCallback(
    (value: number, absIdx: number) => {
      const root = scrollRef.current
      const itemPx = itemHeightPxRef.current || measureItemHeight()
      if (root && itemPx > 0) {
        programmaticRef.current = true
        const centerOffset = measureCenterOffset(itemPx)
        const nextScrollTop = (absIdx - centerOffset) * itemPx
        if (typeof root.scrollTo === 'function') {
          root.scrollTo({ top: nextScrollTop, behavior: 'smooth' })
        } else {
          // jsdom 등 `scrollTo` 미지원 환경 폴백
          root.scrollTop = nextScrollTop
        }
        if (programmaticTimerRef.current !== null) window.clearTimeout(programmaticTimerRef.current)
        programmaticTimerRef.current = window.setTimeout(() => {
          programmaticRef.current = false
          programmaticTimerRef.current = null
        }, 400)
      }
      onPickRef.current(value)
    },
    [measureItemHeight, measureCenterOffset],
  )

  /** REPEAT 회 복제한 렌더 목록 (loop buffer). */
  const items: { value: number; originalIdx: number; absIdx: number; key: string }[] = []
  for (let r = 0; r < REPEAT; r += 1) {
    for (let i = 0; i < N; i += 1) {
      items.push({
        value: values[i]!,
        originalIdx: i,
        absIdx: r * N + i,
        key: `${r}-${i}`,
      })
    }
  }

  return (
    <div className="calendar__timeScrollPicker">
      <div className="calendar__timeScrollPickerLabel" aria-hidden="true">
        {columnLabel}
      </div>
      <div className="calendar__timeScrollPickerFrame">
        {/*
          중앙 고정 selection pip 는 "중앙 = 선택" 은유를 주기 때문에 의도적으로 제거했다.
          실제 commit 은 "클릭" 이기 때문에, 선택 표현(accent 원형 pip)은 active 아이템 자체에 붙어
          스크롤에 따라 함께 움직여야 사용자의 멘탈 모델과 일치한다. (아래 item pip 참고)
        */}
        <div
          ref={scrollRef}
          className="calendar__timeScrollPickerScroll"
          onScroll={handleScroll}
          role="listbox"
          aria-label={`${ariaLabelPrefix} 선택`}
          data-time-axis={axis}
        >
          {items.map(({ value, originalIdx, absIdx, key }) => {
            const isActive = hasActive && originalIdx === exactActiveIdx
            const label = String(value).padStart(pad, '0')
            return (
              <button
                key={key}
                type="button"
                role="option"
                aria-selected={isActive}
                aria-label={`${ariaLabelPrefix} ${value}`}
                data-time-value={value}
                data-abs-idx={absIdx}
                className={`calendar__timeScrollItem${isActive ? ' is-active' : ''}`}
                onClick={() => handlePick(value, absIdx)}
              >
                {/* pip 는 inner span 에 그려서 버튼 너비와 무관하게 정사각 원형을 유지 */}
                <span className="calendar__timeScrollItemPip">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { ITEM_HEIGHT_REM }
