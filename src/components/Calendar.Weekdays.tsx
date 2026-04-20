import { useCalendarContext } from './Calendar.context'

/**
 * 요일 헤더. `displayMode === 'days'` 일 때만 노출된다.
 * month / time 등 보조 뷰에서는 아래에 day grid 가 없으므로 요일 행도 함께 숨긴다.
 */
export function CalendarWeekdays() {
  const { weekdays, displayMode } = useCalendarContext()
  if (displayMode !== 'days') return null
  return (
    <div className="calendar__weekdays" aria-hidden="true">
      {weekdays.map((label) => (
        <div key={label} className="calendar__weekday">
          {label}
        </div>
      ))}
    </div>
  )
}
