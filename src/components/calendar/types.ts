import type { Temporal } from '@js-temporal/polyfill'
import type { KeyboardEvent, MutableRefObject, UIEvent } from 'react'
import type { CalendarMode } from '../../core/api.types'

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
  weekdays: string[]
  keyboardNavigation: boolean
  isScrolling: boolean
  months: Temporal.PlainYearMonth[]
  monthRefs: MutableRefObject<Map<string, HTMLElement>>
  scrollRef: MutableRefObject<HTMLDivElement | null>
  focusedDate: Temporal.PlainDate
  today: Temporal.PlainDate
  selection: CalendarSelectionRuntime
  setFocusedDate: (next: Temporal.PlainDate) => void
  handleScroll: (event: UIEvent<HTMLDivElement>) => void
  handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}
