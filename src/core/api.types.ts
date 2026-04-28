import type { Temporal } from '@js-temporal/polyfill'
import type { WeekStartsOn } from './monthGrid'

export type { WeekStartsOn } from './monthGrid'

export type CalendarMode = 'single' | 'multiple' | 'range'

export type DateValue = Temporal.PlainDate | Temporal.PlainDateTime
export type MonthValue = Temporal.PlainYearMonth

export interface CalendarRangeValue {
  start: DateValue | null
  end: DateValue | null
}

/** `locale`(Intl)과 별도로 헤더·aria 등 고정 문구를 덮어쓸 때 사용 */
export interface CalendarMessages {
  /**
   * 헤더 날짜 라인: 선택이 없을 때 표시 (single `value === null`, multiple `[]`, range 시작일 없음).
   * 레퍼런스 `react-infinite-calendar` 의 `locale.blank` 와 동등 역할.
   */
  blank: string
  todayLabel: string
  rangeFromPrefix: string
  rangeToPrefix: string
  rangeFromPlaceholder: string
  rangeToPlaceholder: string

  ariaOpenMonthPicker: string
  ariaOpenDayGrid: string
  ariaCalendarGrid: string
  /** multiple: 추가 선택 목록 토글 버튼 `aria-label`. `{count}` → 그 외 선택 수 */
  ariaOpenMultipleSelectedList: string
  /** multiple: 열린 선택 목록 영역(`role="region"`)의 접근 가능 이름 */
  ariaMultipleSelectedDatesPanel: string
}

export interface CalendarFormatContext {
  locale: string
}

export interface CalendarFormatters {
  /** Year label used in the month picker. */
  year?: (year: number, ctx: CalendarFormatContext) => string
  /** Month label used in the month picker. */
  month?: (month: number, ctx: CalendarFormatContext) => string
  /** Month-year label used by month row overlays. */
  monthYear?: (month: Temporal.PlainYearMonth, ctx: CalendarFormatContext) => string
  /** Month-date labels used in selected-date headers and range start/end columns. */
  monthDate?: (date: Temporal.PlainDate, ctx: CalendarFormatContext) => string
  /** Full date labels used in the multiple-selection dropdown. */
  date?: (date: Temporal.PlainDate, ctx: CalendarFormatContext) => string
  /** Date-time label used in the multiple-selection includeTime dropdown. */
  dateTime?: (value: Temporal.PlainDateTime, ctx: CalendarFormatContext) => string
  /** Floating today button label and selected-today day cell label. */
  todayLabel?: (today: Temporal.PlainDate, ctx: CalendarFormatContext) => string
}

export interface CalendarBaseProps {
  id?: string
  className?: string
  /** BCP 47. 생략 시 브라우저 `navigator.language`, 없으면 `en-US`. */
  locale?: string
  /** 0=일요일 시작 … 6=토요일 시작. 생략 시 0 (`react-infinite-calendar` 와 동일). */
  weekStartsOn?: WeekStartsOn
  /** 헤더·접근성 문구. 생략 시 영어 기본값. */
  messages?: Partial<CalendarMessages>
  /** 표시 문자열 커스터마이징. 생략 시 locale 기반 Intl formatter 사용. */
  formatters?: CalendarFormatters
  minDate?: DateValue
  maxDate?: DateValue
  keyboardNavigation?: boolean
  includeTime?: boolean
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
}

export type CalendarProps = CalendarSingleProps | CalendarMultipleProps | CalendarRangeProps
