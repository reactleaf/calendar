import type { RefObject } from 'react'
import { useCallback } from 'react'
import type { DateViewportPlacement } from './Calendar.types'
import { useCalendarContext } from './Calendar.context'
import { todayWordLabel } from './Calendar.utils'

/** react-infinite-calendar `Today/CHEVRON` 와 유사한 소형 쉐브론 */
function TodayChevron({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg
      className={`calendar__todayChevron calendar__todayChevron--${direction}`}
      width="11"
      height="11"
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === 'down' ? <path d="M6 9l6 6 6-6" /> : <path d="M18 15l-6-6-6 6" />}
    </svg>
  )
}

export interface CalendarTodayButtonProps {
  scrollToDate: (date: import('@js-temporal/polyfill').Temporal.PlainDate) => void
  scrollRef: RefObject<HTMLDivElement | null>
  placement: DateViewportPlacement | null
}

/**
 * react-infinite-calendar Today 행: 오늘이 뷰 밖이면만 표시, 스크롤 방향에 따라 쉐브론 방향.
 * TodayButton 은 단일 인스턴스이므로 자체 context 소비를 허용한다.
 */
export function CalendarTodayButton({
  scrollToDate,
  scrollRef,
  placement,
}: CalendarTodayButtonProps) {
  const { displayMode, today, locale, setFocusedDate, keyboardNavigation } = useCalendarContext()
  const label = todayWordLabel(locale)

  const onClick = useCallback(() => {
    setFocusedDate(today)
    requestAnimationFrame(() => {
      scrollToDate(today)
      if (keyboardNavigation) scrollRef.current?.focus({ preventScroll: true })
    })
  }, [keyboardNavigation, scrollRef, scrollToDate, setFocusedDate, today])

  if (displayMode !== 'days' || placement === null || placement === 'visible') return null

  return (
    <div className="calendar__todayBar">
      <button type="button" className="calendar__todayButton" onClick={onClick}>
        <span className="calendar__todayButtonInner">
          <span>{label}</span>
          {placement === 'above' ? <TodayChevron direction="up" /> : <TodayChevron direction="down" />}
        </span>
      </button>
    </div>
  )
}
