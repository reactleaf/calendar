import { selectionEquals, type PlainDay } from '../calendarDate'

export function nextSingleSelection(
  current: PlainDay | null,
  clicked: PlainDay,
  options?: { allowDeselect?: boolean },
): PlainDay | null {
  const allowDeselect = options?.allowDeselect ?? false
  if (allowDeselect && current !== null && selectionEquals(current, clicked)) {
    return null
  }
  return clicked
}
