import type { Temporal } from '@js-temporal/polyfill'

export type CalendarMode = 'single' | 'multiple' | 'range'

export type DateValue = Temporal.PlainDate | Temporal.PlainDateTime
export type MonthValue = Temporal.PlainYearMonth

export interface CalendarRangeValue {
  start: DateValue | null
  end: DateValue | null
}

export interface CalendarBaseProps {
  id?: string
  className?: string
  disabled?: boolean
  minDate?: DateValue
  maxDate?: DateValue
  disabledDates?: DateValue[]
  disabledDays?: number[]
  keyboardNavigation?: boolean
  includeTime?: boolean
  minuteStep?: number
  onMonthChange?: (monthStart: MonthValue) => void
  onFocusedDateChange?: (date: DateValue | null) => void
}

export interface CalendarSingleProps extends CalendarBaseProps {
  mode: 'single'
  value?: DateValue | null
  defaultValue?: DateValue | null
  onSelect?: (next: DateValue | null) => void
}

export interface CalendarMultipleProps extends CalendarBaseProps {
  mode: 'multiple'
  value?: DateValue[]
  defaultValue?: DateValue[]
  onSelect?: (next: DateValue[]) => void
  maxSelections?: number
}

export interface CalendarRangeProps extends CalendarBaseProps {
  mode: 'range'
  value?: CalendarRangeValue
  defaultValue?: CalendarRangeValue
  onSelect?: (next: CalendarRangeValue) => void
  onRangePreview?: (next: CalendarRangeValue | null) => void
  allowRangePreview?: boolean
}

export type CalendarProps = CalendarSingleProps | CalendarMultipleProps | CalendarRangeProps
