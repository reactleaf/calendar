import type { Temporal } from '@js-temporal/polyfill'
import type { KeyboardEvent, MutableRefObject, UIEvent } from 'react'
import type { useSingleSelection } from '../../hooks/useSingleSelection'

export interface SingleModeRuntime {
  locale: string
  weekdays: string[]
  keyboardNavigation: boolean
  isScrolling: boolean
  months: Temporal.PlainYearMonth[]
  monthRefs: MutableRefObject<Map<string, HTMLElement>>
  scrollRef: MutableRefObject<HTMLDivElement | null>
  focusedDate: Temporal.PlainDate
  today: Temporal.PlainDate
  selection: ReturnType<typeof useSingleSelection>
  setFocusedDate: (next: Temporal.PlainDate) => void
  handleScroll: (event: UIEvent<HTMLDivElement>) => void
  handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}
