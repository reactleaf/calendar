import { Temporal } from '@js-temporal/polyfill'
import { useCallback, useRef } from 'react'
import type { KeyboardEventHandler } from 'react'
import { clampDate } from '../components/Calendar.utils'
import type { CalendarMode } from '../core/api.types'

interface UseCalendarKeyboardNavigationArgs {
  enabled: boolean
  mode: CalendarMode
  focusedDate: Temporal.PlainDate
  minDay: Temporal.PlainDate
  maxDay: Temporal.PlainDate
  setFocusedDate: (date: Temporal.PlainDate) => void
  scrollToDate: (date: Temporal.PlainDate) => void
  selectDate: (date: Temporal.PlainDate, source?: 'click' | 'keyboard') => void
  previewDate?: (date: Temporal.PlainDate, source?: 'hover' | 'keyboard') => void
}

/**
 * 키보드 내비게이션은 DatePicker 렌더 경로와 분리하되,
 * 실제 핸들러 identity 는 안정적으로 유지한다.
 */
export function useCalendarKeyboardNavigation({
  enabled,
  mode,
  focusedDate,
  minDay,
  maxDay,
  setFocusedDate,
  scrollToDate,
  selectDate,
  previewDate,
}: UseCalendarKeyboardNavigationArgs): KeyboardEventHandler<HTMLDivElement> {
  const latestRef = useRef<UseCalendarKeyboardNavigationArgs>({
    enabled,
    mode,
    focusedDate,
    minDay,
    maxDay,
    setFocusedDate,
    scrollToDate,
    selectDate,
    previewDate,
  })

  latestRef.current = {
    enabled,
    mode,
    focusedDate,
    minDay,
    maxDay,
    setFocusedDate,
    scrollToDate,
    selectDate,
    previewDate,
  }

  return useCallback<KeyboardEventHandler<HTMLDivElement>>((event) => {
    const state = latestRef.current
    if (!state.enabled) return

    let next: Temporal.PlainDate | null = null
    if (event.key === 'ArrowLeft') next = clampDate(state.focusedDate.add({ days: -1 }), state.minDay, state.maxDay)
    else if (event.key === 'ArrowRight')
      next = clampDate(state.focusedDate.add({ days: 1 }), state.minDay, state.maxDay)
    else if (event.key === 'ArrowUp') next = clampDate(state.focusedDate.add({ days: -7 }), state.minDay, state.maxDay)
    else if (event.key === 'ArrowDown')
      next = clampDate(state.focusedDate.add({ days: 7 }), state.minDay, state.maxDay)
    else if (event.key === 'Enter' || event.key === ' ') {
      state.selectDate(state.focusedDate, 'keyboard')
      event.preventDefault()
      return
    } else return

    state.setFocusedDate(next)
    if (state.mode === 'range') state.previewDate?.(next, 'keyboard')
    requestAnimationFrame(() => state.scrollToDate(next))
    event.preventDefault()
  }, [])
}
