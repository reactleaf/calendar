import type { Temporal } from '@js-temporal/polyfill'
import type { KeyboardEvent, RefObject, UIEvent } from 'react'
import type { CalendarMode, CalendarRangeValue, DateValue } from '../core/api.types'

export type CalendarSelectionSnapshot =
  | { mode: 'single'; value: DateValue | null }
  | { mode: 'multiple'; values: DateValue[] }
  | { mode: 'range'; value: CalendarRangeValue }

export interface CalendarSelectionRuntime {
  isSelected: (date: Temporal.PlainDate) => boolean
  isDisabled: (date: Temporal.PlainDate) => boolean
  selectDate: (date: Temporal.PlainDate, source?: 'click' | 'keyboard') => void
  previewDate?: (date: Temporal.PlainDate, source?: 'hover' | 'keyboard') => void
  isInPreviewRange?: (date: Temporal.PlainDate) => boolean
  isRangeStart?: (date: Temporal.PlainDate) => boolean
  isRangeEnd?: (date: Temporal.PlainDate) => boolean
}

export interface CalendarRuntime {
  mode: CalendarMode
  locale: string
  includeTime?: boolean
  selectionSnapshot: CalendarSelectionSnapshot
  weekdays: string[]
  keyboardNavigation: boolean
  isScrolling: boolean
  months: Temporal.PlainYearMonth[]
  monthRefs: RefObject<Map<string, HTMLElement>>
  scrollRef: RefObject<HTMLDivElement | null>
  focusedDate: Temporal.PlainDate
  today: Temporal.PlainDate
  selection: CalendarSelectionRuntime
  setFocusedDate: (next: Temporal.PlainDate) => void
  handleScroll: (event: UIEvent<HTMLDivElement>) => void
  handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}
