import { Temporal } from '@js-temporal/polyfill'
import { sameCalendarDay, toPlainDate, type PlainDay } from '../calendarDate'

export function toggleMultipleSelection(
  current: readonly PlainDay[],
  clicked: PlainDay,
  maxSelections?: number,
): { next: Temporal.PlainDate[]; changed: boolean } {
  const clickedDay = toPlainDate(clicked)
  const idx = current.findIndex((d) => sameCalendarDay(d, clicked))

  if (idx !== -1) {
    const next = current.filter((_, i) => i !== idx).map((d) => toPlainDate(d))
    return { next, changed: true }
  }

  if (maxSelections !== undefined && current.length >= maxSelections) {
    return { next: current.map((d) => toPlainDate(d)), changed: false }
  }

  return {
    next: [...current.map((d) => toPlainDate(d)), clickedDay],
    changed: true,
  }
}
