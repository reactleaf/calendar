import type { Temporal } from '@js-temporal/polyfill'
import type { CalendarMessages, CalendarMode, CalendarRangeValue, DateValue } from '../core/api.types'
import type { WeekStartsOn } from '../core/monthGrid'

export type CalendarSelectionSnapshot =
  | { mode: 'single'; value: DateValue | null }
  | { mode: 'multiple'; values: DateValue[]; primaryPlainDate: Temporal.PlainDate | null }
  | { mode: 'range'; value: CalendarRangeValue }

/**
 * 보조 뷰(secondary view) 식별자.
 * - `'days'`  : 기본 무한 스크롤 월 그리드
 * - `'months'`: 연/월 네비게이터 (오버레이)
 * - `'time'`  : 시간(시·분) 선택 전용 뷰
 */
export type CalendarDisplayMode = 'days' | 'months' | 'time'

/**
 * `'time'` 뷰가 편집 중인 시간 슬롯 식별자.
 * - `'primary'`    : single / multiple 의 단일 시간
 * - `'rangeStart'` : range 의 시작 시간
 * - `'rangeEnd'`   : range 의 종료 시간
 *
 * `openTimeView` 호출 시점에 함께 저장되며, `displayMode`가 `'time'` 이 아닐 때는 항상 `null`.
 */
export type CalendarTimeEditTarget = 'primary' | 'rangeStart' | 'rangeEnd'

/** 스크롤 뷰포트 대비 특정 일자 행 위치(react-infinite-calendar Today 쉐브론과 동일 개념) */
export type DateViewportPlacement = 'visible' | 'above' | 'below'

export interface CalendarViewportHandle {
  scrollToMonth: (target: Temporal.PlainYearMonth) => void
  scrollToDate: (date: Temporal.PlainDate) => void
}

export interface CalendarSelectionRuntime {
  selectDate: (date: Temporal.PlainDate, source?: 'click' | 'keyboard') => void
  setSelectedTime?: (hour: number, minute: number) => void
  setRangeTime?: (edge: 'start' | 'end', hour: number, minute: number) => void
  previewDate?: (date: Temporal.PlainDate, source?: 'hover' | 'keyboard') => void
}

export interface CalendarRuntime {
  id: string
  mode: CalendarMode
  locale: string
  weekStartsOn: WeekStartsOn
  messages: CalendarMessages
  includeTime?: boolean
  /** range: 헤더 표시용 `preview ?? 확정 value` (싱글/멀티에서는 미사용) */
  rangeHeaderValue?: CalendarRangeValue
  /** range: `preview`가 있을 때 헤더가 프리뷰를 반영 중 — 시간 편집은 확정에만 묶이므로 잠금 */
  rangeHeaderPreviewActive?: boolean
  selectionSnapshot: CalendarSelectionSnapshot
  weekdays: string[]
  keyboardNavigation: boolean
  minDay: Temporal.PlainDate
  minMonth: Temporal.PlainYearMonth
  maxMonth: Temporal.PlainYearMonth
  monthCount: number
  maxDay: Temporal.PlainDate
  focusedDate: Temporal.PlainDate
  today: Temporal.PlainDate
  /** 현재 뷰포트 중앙에 있는 월 — Header / MonthPicker fallback 소스 */
  currentMonth: Temporal.PlainYearMonth
  /** DatePicker 가 scroll 결과를 runtime state 에 반영하는 내부 setter */
  setCurrentMonth: (month: Temporal.PlainYearMonth) => void
  /** 보조 뷰 전환 상태 (days/months/time) */
  displayMode: CalendarDisplayMode
  setDisplayMode: (mode: CalendarDisplayMode) => void
  /** 현재 `'time'` 뷰가 편집 중인 대상. `displayMode !== 'time'` 이면 `null` */
  timeEditTarget: CalendarTimeEditTarget | null
  /** TimeInput 의 hour/minute 셀 클릭 등으로 `'time'` 뷰를 여는 경로 */
  openTimeView: (target: CalendarTimeEditTarget) => void
  selection: CalendarSelectionRuntime
  /** 렌더 및 외부 가드용 날짜 비활성 판정 */
  isDateDisabled: (date: Temporal.PlainDate) => boolean
  setFocusedDate: (next: Temporal.PlainDate) => void
  /** multiple: 헤더·시간 편집 대상이 되는 대표 일자 (선택 목록에 있는 날만 허용) */
  setMultiplePrimaryPlainDate?: (date: Temporal.PlainDate) => void
}
