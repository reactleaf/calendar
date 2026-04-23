import { useCallback, useState } from 'react'
import type { CalendarDisplayMode, CalendarTimeEditTarget } from '../components/Calendar.types'

/**
 * Secondary view(보조 뷰) 상태 + DatePickerView 로 전달할 scroll request 를 관리하는 훅.
 *
 * single / multiple / range runtime 훅 세 곳에서 동일 로직이 필요해 분리했다.
 * `'months'`, `'time'` 양쪽 보조 뷰를 전부 여기서 관리한다.
 *
 * `timeEditTarget` 규칙:
 *   - `openTimeView(target)` 은 `displayMode='time'` 과 타깃을 원자적으로 세팅.
 *   - `setDisplayMode(mode)` 호출로 `'time'` 이외 모드로 빠져나가면 자동으로 `null` 로 초기화.
 *     (뷰 전환 경로를 늘리지 않기 위해 하나의 setter 로 일관되게 관리)
 */
export interface CalendarSecondaryView {
  displayMode: CalendarDisplayMode
  setDisplayMode: (mode: CalendarDisplayMode) => void
  timeEditTarget: CalendarTimeEditTarget | null
  openTimeView: (target: CalendarTimeEditTarget) => void
}

export function useCalendarSecondaryView(): CalendarSecondaryView {
  const [displayMode, setDisplayModeInternal] = useState<CalendarDisplayMode>('days')
  const [timeEditTarget, setTimeEditTarget] = useState<CalendarTimeEditTarget | null>(null)

  const setDisplayMode = useCallback((mode: CalendarDisplayMode) => {
    setDisplayModeInternal(mode)
    if (mode !== 'time') setTimeEditTarget(null)
  }, [])

  const openTimeView = useCallback((target: CalendarTimeEditTarget) => {
    setTimeEditTarget(target)
    setDisplayModeInternal('time')
  }, [])

  return {
    displayMode,
    setDisplayMode,
    timeEditTarget,
    openTimeView,
  }
}
