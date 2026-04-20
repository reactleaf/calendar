import type { Temporal } from '@js-temporal/polyfill'
import type { ReactNode } from 'react'
import type { RefObject } from 'react'
import { useCallback, useLayoutEffect, useState } from 'react'
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

interface CalendarTodayBarActiveProps {
  label: string
  today: Temporal.PlainDate
  setFocusedDate: (d: Temporal.PlainDate) => void
  keepDateVisible: (d: Temporal.PlainDate) => void
  getDateViewportPlacement: (d: Temporal.PlainDate) => DateViewportPlacement
  scrollRef: RefObject<HTMLDivElement | null>
  keyboardNavigation: boolean
}

/** `displayMode === 'days'` 이고 오늘이 선택 가능할 때만 마운트 — effect 초반 reset setState 불필요 */
function CalendarTodayBarActive({
  label,
  today,
  setFocusedDate,
  keepDateVisible,
  getDateViewportPlacement,
  scrollRef,
  keyboardNavigation,
}: CalendarTodayBarActiveProps) {
  const [placement, setPlacement] = useState<DateViewportPlacement | null>(null)

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return

    const update = () => {
      setPlacement(getDateViewportPlacement(today))
    }

    update()
    scrollEl.addEventListener('scroll', update, { passive: true })
    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update)
      ro.observe(scrollEl)
    }

    return () => {
      scrollEl.removeEventListener('scroll', update)
      ro?.disconnect()
    }
  }, [getDateViewportPlacement, scrollRef, today])

  const onClick = useCallback(() => {
    setFocusedDate(today)
    requestAnimationFrame(() => {
      keepDateVisible(today)
      if (keyboardNavigation) scrollRef.current?.focus({ preventScroll: true })
    })
  }, [keepDateVisible, keyboardNavigation, scrollRef, setFocusedDate, today])

  if (placement === null || placement === 'visible') return null

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

/**
 * react-infinite-calendar Today 행: 오늘이 뷰 밖이면만 표시, 스크롤 방향에 따라 쉐브론 방향.
 * @see https://github.com/clauderic/react-infinite-calendar/blob/master/src/Today/Today.scss
 */
export function CalendarTodayBar() {
  const {
    displayMode,
    locale,
    today,
    selection,
    setFocusedDate,
    keepDateVisible,
    getDateViewportPlacement,
    scrollRef,
    keyboardNavigation,
  } = useCalendarContext()

  const label = todayWordLabel(locale)
  const disabled = selection.isDisabled(today)

  if (displayMode !== 'days' || disabled) return null

  return (
    <CalendarTodayBarActive
      label={label}
      today={today}
      setFocusedDate={setFocusedDate}
      keepDateVisible={keepDateVisible}
      getDateViewportPlacement={getDateViewportPlacement}
      scrollRef={scrollRef}
      keyboardNavigation={keyboardNavigation}
    />
  )
}

/**
 * days 본문 래퍼: 스크롤 그리드를 먼저 두어 `scrollRef` 를 붙인 뒤,
 * Today 바는 같은 셸 안에서 `position: absolute` 로만 겹친다(플렉 높이 분할 없음).
 */
export function CalendarDaysShell({ children }: { children: ReactNode }) {
  const { displayMode } = useCalendarContext()
  if (displayMode !== 'days') return <>{children}</>
  return (
    <div className="calendar__daysShell">
      {children}
      <CalendarTodayBar />
    </div>
  )
}
