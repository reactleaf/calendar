import type { CalendarMessages } from './api.types'

export function defaultNavigatorLocale(): string {
  return typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US'
}

export const DEFAULT_CALENDAR_MESSAGES: CalendarMessages = {
  blank: 'Select a date...',
  rangeFromPrefix: 'from ',
  rangeToPrefix: 'to ',
  ariaOpenMonthPicker: 'Open month picker',
  ariaOpenDayGrid: 'Show day calendar',
  ariaCalendarGrid: 'Infinite scroll calendar',
  ariaOpenMultipleSelectedList: 'Show {count} more selected dates',
  ariaMultipleSelectedDatesPanel: 'Selected dates',
}
