import { useCalendarContext } from './context'

export function CalendarWeekdays() {
  const { weekdays } = useCalendarContext()
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
