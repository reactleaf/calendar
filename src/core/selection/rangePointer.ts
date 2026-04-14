import { Temporal } from '@js-temporal/polyfill'
import { toPlainDate, type PlainDay } from '../calendarDate'

export type RangePointerState = { kind: 'idle' } | { kind: 'anchored'; anchor: Temporal.PlainDate }

export interface CommittedRange {
  start: Temporal.PlainDate
  end: Temporal.PlainDate
}

export function sortRangeEndpoints(a: Temporal.PlainDate, b: Temporal.PlainDate): CommittedRange {
  return Temporal.PlainDate.compare(a, b) <= 0 ? { start: a, end: b } : { start: b, end: a }
}

export function rangePointerDown(
  state: RangePointerState,
  date: PlainDay,
): { next: RangePointerState; committed: CommittedRange | null } {
  const day = toPlainDate(date)

  if (state.kind === 'idle') {
    return { next: { kind: 'anchored', anchor: day }, committed: null }
  }

  return {
    next: { kind: 'idle' },
    committed: sortRangeEndpoints(state.anchor, day),
  }
}

export function rangePointerPreview(state: RangePointerState, hover: PlainDay | null): CommittedRange | null {
  if (state.kind !== 'anchored' || hover === null) return null
  return sortRangeEndpoints(state.anchor, toPlainDate(hover))
}
