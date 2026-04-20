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
  minDate?: DateValue
  maxDate?: DateValue
  keyboardNavigation?: boolean
  includeTime?: boolean
  minuteStep?: number
  onMonthChange?: (monthStart: MonthValue) => void
  onFocusedDateChange?: (date: DateValue | null) => void
}

/**
 * `single` / `multiple` 전용.
 * `range`는 시작·끝 사이 날짜가 모두 구간에 포함되는 모델이라 일 단위 블랙리스트를 두지 않는다.
 */
export interface CalendarDayDisablingProps {
  /** `minDate`~`maxDate` 안에서 추가로 선택 불가로 만들 날. 범위 밖은 항상 비활성. */
  isDateDisabled?: (date: Temporal.PlainDate) => boolean
}

export interface CalendarSingleProps extends CalendarBaseProps, CalendarDayDisablingProps {
  mode: 'single'
  value?: DateValue | null
  defaultValue?: DateValue | null
  onSelect?: (next: DateValue | null) => void
}

export interface CalendarMultipleProps extends CalendarBaseProps, CalendarDayDisablingProps {
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
