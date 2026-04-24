import { Temporal } from '@js-temporal/polyfill'
import type { KeyboardEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useCalendarContext, useCalendarViewportHandle } from '../Calendar.context'
import { compareMonth, monthShortLabel } from '../Calendar.utils'

/**
 * 연도별 12-월 그리드를 보여주는 보조 뷰(월 피커).
 *
 * - `displayMode === 'months'` 일 때 DatePickerView 위에 오버레이로 렌더된다.
 * - 월 셀 클릭 → 달력 본문을 해당 월로 스크롤(center 정렬) + `displayMode`를 `'days'`로 복귀.
 * - `min/maxMonth` 범위를 벗어난 월은 disabled.
 *
 * 하이라이트 규칙:
 *   - 선택된 날짜(들)의 year-month 만 원형 pip + 연도 accent 로 표시한다.
 *   - 선택이 전혀 없으면 하이라이트 없음 (year 라벨은 muted 일원화).
 *
 * 초기 스크롤/포커스 위치:
 *   - 선택이 있으면 primarySelectedMonth, 없으면 viewport 중앙 월(`currentMonth`) 로 폴백.
 *   - 이건 "어디서부터 보여줄지" 의 문제이므로 하이라이트와 분리한다.
 *
 * 참고: react-infinite-calendar 의 `Years`(with months) 뷰.
 */
export function CalendarMonthPickerView() {
  const viewportHandle = useCalendarViewportHandle()
  const { locale, formatters, minMonth, maxMonth, currentMonth, displayMode, setDisplayMode, selectionSnapshot } =
    useCalendarContext()

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const activeButtonRef = useRef<HTMLButtonElement | null>(null)

  const years = useMemo(() => {
    const list: number[] = []
    for (let y = minMonth.year; y <= maxMonth.year; y += 1) list.push(y)
    return list
  }, [minMonth, maxMonth])

  /** 각 연도별 12개 월 라벨. locale 변경 시만 재계산. */
  const monthLabels = useMemo(
    () =>
      Array.from(
        { length: 12 },
        (_, i) =>
          formatters?.month?.(i + 1, { locale }) ??
          monthShortLabel(Temporal.PlainYearMonth.from({ year: 2000, month: i + 1 }), locale),
      ),
    [formatters, locale],
  )

  /**
   * 선택 상태로부터 파생되는 하이라이트 정보.
   * - `selectedMonthKeys` : 활성(원형 pip) 처리할 월들의 "YYYY-MM" 키 집합
   * - `primarySelectedMonth` : 연도 row 하이라이트 + 초기 포커스/스크롤 타깃이 되는 단일 월
   *   (single: value / multiple: 첫 선택 / range: start ?? end)
   */
  const { selectedMonthKeys, primarySelectedMonth } = useMemo(() => {
    const keys = new Set<string>()
    const pushDate = (date: Temporal.PlainDate | null) => {
      if (date === null) return null
      const ym = date.toPlainYearMonth()
      keys.add(`${ym.year}-${ym.month}`)
      return ym
    }

    let primary: Temporal.PlainYearMonth | null = null
    if (selectionSnapshot.mode === 'single') {
      primary = pushDate(selectionSnapshot.plain.value) ?? null
    } else if (selectionSnapshot.mode === 'multiple') {
      for (const v of selectionSnapshot.plain.values) {
        const ym = pushDate(v)
        if (primary === null && ym !== null) primary = ym
      }
    } else {
      const startYm = pushDate(selectionSnapshot.plain.start)
      const endYm = pushDate(selectionSnapshot.plain.end)
      primary = startYm ?? endYm
    }
    return { selectedMonthKeys: keys, primarySelectedMonth: primary }
  }, [selectionSnapshot])

  const isMonthSelected = useCallback(
    (year: number, month: number) => selectedMonthKeys.has(`${year}-${month}`),
    [selectedMonthKeys],
  )

  /**
   * 초기 스크롤/포커스 월: 선택된 primary 가 있으면 그 월, 없으면 currentMonth.
   * 이 값은 "어디서부터 보여줄지" 에만 쓰이고 시각적 하이라이트에는 쓰이지 않는다.
   */
  const initialFocusMonth = primarySelectedMonth ?? currentMonth

  const handlePick = useCallback(
    (target: Temporal.PlainYearMonth) => {
      if (compareMonth(target, minMonth) < 0 || compareMonth(target, maxMonth) > 0) return
      /**
       * DatePickerView 의 viewport handle 을 통해 가상 스크롤을 직접 제어한다.
       */
      viewportHandle.current?.scrollToMonth(target)
      setDisplayMode('days')
    },
    [maxMonth, minMonth, setDisplayMode, viewportHandle],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setDisplayMode('days')
      }
    },
    [setDisplayMode],
  )

  /** 열릴 때 `initialFocusMonth` 행을 중앙에 위치시키고 해당 버튼으로 focus. */
  useEffect(() => {
    if (displayMode !== 'months') return
    const container = scrollContainerRef.current
    const button = activeButtonRef.current
    if (!container || !button) return
    const containerRect = container.getBoundingClientRect()
    const buttonRect = button.getBoundingClientRect()
    const offset =
      buttonRect.top - containerRect.top + container.scrollTop - container.clientHeight / 2 + buttonRect.height / 2
    container.scrollTop = Math.max(0, offset)
    button.focus({ preventScroll: true })
  }, [displayMode])

  return (
    <div
      className="calendar__monthPicker"
      role="dialog"
      aria-modal="true"
      aria-label="월 선택"
      onKeyDown={handleKeyDown}
    >
      <div ref={scrollContainerRef} className="calendar__monthPickerScroll" tabIndex={-1}>
        {years.map((year) => {
          /**
           * 연도 accent 는 "선택된 월이 있는 연도" 에만 적용.
           * 선택이 없으면(primarySelectedMonth === null) 어떤 row 도 강조하지 않는다.
           */
          const isSelectedYear = primarySelectedMonth !== null && year === primarySelectedMonth.year
          return (
            <div
              key={year}
              className={`calendar__monthPickerRow${isSelectedYear ? ' is-current' : ''}`}
              data-year={year}
            >
              <div className="calendar__monthPickerYear">{formatters?.year?.(year, { locale }) ?? year}</div>
              <ol className="calendar__monthPickerMonths">
                {monthLabels.map((label, idx) => {
                  const monthNumber = idx + 1
                  const month = Temporal.PlainYearMonth.from({ year, month: monthNumber })
                  const isBeforeMin = compareMonth(month, minMonth) < 0
                  const isAfterMax = compareMonth(month, maxMonth) > 0
                  const isDisabled = isBeforeMin || isAfterMax
                  const isActive = isMonthSelected(year, monthNumber)
                  /**
                   * 초기 포커스/스크롤 타깃은 "initialFocusMonth" 하나 — 하이라이트 유무와 독립.
                   * multiple 모드에서 is-active 가 여러 개더라도 focus 는 primary(= 첫 선택) 로.
                   * 선택이 없을 땐 currentMonth 로 폴백 (하이라이트는 안 걸림).
                   */
                  const isFocusTarget = year === initialFocusMonth.year && monthNumber === initialFocusMonth.month
                  const className = [
                    'calendar__monthPickerMonth',
                    isActive ? 'is-active' : '',
                    isDisabled ? 'is-disabled' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')

                  return (
                    <li key={idx}>
                      <button
                        ref={isFocusTarget ? activeButtonRef : undefined}
                        type="button"
                        className={className}
                        disabled={isDisabled}
                        aria-current={isActive ? 'date' : undefined}
                        onClick={() => handlePick(month)}
                      >
                        <span className="calendar__monthPickerMonthLabel">{label}</span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>
          )
        })}
      </div>
    </div>
  )
}
