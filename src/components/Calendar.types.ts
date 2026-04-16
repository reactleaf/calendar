import type { Virtualizer } from '@tanstack/react-virtual'
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
  setSelectedTime?: (hour: number, minute: number) => void
  setRangeTime?: (edge: 'start' | 'end', hour: number, minute: number) => void
  previewDate?: (date: Temporal.PlainDate, source?: 'hover' | 'keyboard') => void
  isInPreviewRange?: (date: Temporal.PlainDate) => boolean
  isRangeStart?: (date: Temporal.PlainDate) => boolean
  isRangeEnd?: (date: Temporal.PlainDate) => boolean
}

export interface CalendarRuntime {
  mode: CalendarMode
  locale: string
  includeTime?: boolean
  minuteStep?: number
  selectionSnapshot: CalendarSelectionSnapshot
  weekdays: string[]
  keyboardNavigation: boolean
  isScrolling: boolean
  minMonth: Temporal.PlainYearMonth
  maxMonth: Temporal.PlainYearMonth
  monthCount: number
  monthVirtualizer: Virtualizer<HTMLDivElement, Element>
  monthRefs: RefObject<Map<string, HTMLElement>>
  scrollRef: RefObject<HTMLDivElement | null>
  focusedDate: Temporal.PlainDate
  today: Temporal.PlainDate
  selection: CalendarSelectionRuntime
  setFocusedDate: (next: Temporal.PlainDate) => void
  handleScroll: (event: UIEvent<HTMLDivElement>) => void
  handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}
