import { Temporal } from '@js-temporal/polyfill'

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
  date: Temporal.PlainDate,
): { next: RangePointerState; committed: CommittedRange | null } {
  if (state.kind === 'idle') {
    return { next: { kind: 'anchored', anchor: date }, committed: null }
  }

  return {
    next: { kind: 'idle' },
    committed: sortRangeEndpoints(state.anchor, date),
  }
}

export function rangePointerPreview(
  state: RangePointerState,
  hover: Temporal.PlainDate | null,
): CommittedRange | null {
  if (state.kind !== 'anchored' || hover === null) return null
  return sortRangeEndpoints(state.anchor, hover)
}
