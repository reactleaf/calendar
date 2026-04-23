import { Temporal } from '@js-temporal/polyfill'

export function toggleMultipleSelection(
  current: readonly Temporal.PlainDate[],
  clicked: Temporal.PlainDate,
  maxSelections?: number,
): { next: Temporal.PlainDate[]; changed: boolean } {
  const idx = current.findIndex((d) => d.equals(clicked))

  if (idx !== -1) {
    return { next: current.filter((_, i) => i !== idx), changed: true }
  }

  if (maxSelections !== undefined && current.length >= maxSelections) {
    return { next: [...current], changed: false }
  }

  return {
    next: [...current, clicked],
    changed: true,
  }
}
