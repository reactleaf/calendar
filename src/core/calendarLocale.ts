import type { CalendarMessages } from './api.types'

export function defaultNavigatorLocale(): string {
  return typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US'
}

export const DEFAULT_CALENDAR_MESSAGES: CalendarMessages = {
  selectDate: 'Select a date...',
  rangeIncompleteEnd: '?',
  rangeFromPrefix: 'from ',
  rangeToPrefix: 'to ',
  ariaOpenMonthPicker: 'Open month picker',
  ariaOpenDayGrid: 'Show day calendar',
  ariaCalendarGrid: 'Infinite scroll calendar',
}

export function resolveCalendarMessages(partial?: Partial<CalendarMessages>): CalendarMessages {
  return { ...DEFAULT_CALENDAR_MESSAGES, ...partial }
}
