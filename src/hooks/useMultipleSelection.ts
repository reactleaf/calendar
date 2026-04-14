import { useCallback, useMemo, useState } from 'react'
import type { DateValue } from '../core/api.types'
import { toPlainDate, toSelectionValue } from '../core/calendarDate'
import { disableConstraintsFromOptions, isDateDisabled } from '../core/constraints'
import { toggleMultipleSelection } from '../core/selection/multiple'

export interface UseMultipleSelectionOptions {
  value?: DateValue[]
  defaultValue?: DateValue[]
  disabled?: boolean
  minDate?: DateValue
  maxDate?: DateValue
  disabledDates?: readonly DateValue[]
  disabledDays?: readonly number[]
  includeTime?: boolean
  minuteStep?: number
  maxSelections?: number
  onSelect?: (next: DateValue[]) => void
}

export interface UseMultipleSelectionResult {
  value: DateValue[]
  isSelected: (date: DateValue) => boolean
  isDisabled: (date: DateValue) => boolean
  toggleDate: (date: DateValue, source?: 'click' | 'keyboard') => void
  clear: () => void
}

export function useMultipleSelection(options: UseMultipleSelectionOptions): UseMultipleSelectionResult {
  const {
    value: valueProp,
    defaultValue = [],
    disabled,
    minDate,
    maxDate,
    disabledDates,
    disabledDays,
    includeTime,
    maxSelections,
    onSelect,
  } = options

  const isControlled = valueProp !== undefined
  const [inner, setInner] = useState<DateValue[]>(() => defaultValue)
  const value = isControlled ? valueProp : inner

  const constraints = useMemo(
    () => disableConstraintsFromOptions({ disabled, minDate, maxDate, disabledDates, disabledDays }),
    [disabled, disabledDates, disabledDays, maxDate, minDate],
  )

  const isDisabled = useCallback((d: DateValue) => isDateDisabled(d, constraints), [constraints])

  const isSelected = useCallback((d: DateValue) => value.some((v) => toPlainDate(v).equals(toPlainDate(d))), [value])

  const commit = useCallback(
    (next: DateValue[]) => {
      if (!isControlled) setInner(next)
      onSelect?.(next)
    },
    [isControlled, onSelect],
  )

  const toggleDate = useCallback(
    (date: DateValue, source?: 'click' | 'keyboard') => {
      void source
      if (isDisabled(date)) return
      const pickedPlain = toPlainDate(toSelectionValue(date, includeTime))
      const currentPlain = value.map((v) => toPlainDate(toSelectionValue(v, includeTime)))
      const toggled = toggleMultipleSelection(currentPlain, pickedPlain, maxSelections)
      if (!toggled.changed) return
      const next = toggled.next.map((d) => toSelectionValue(d, includeTime))
      commit(next)
    },
    [commit, includeTime, isDisabled, maxSelections, value],
  )

  const clear = useCallback(() => commit([]), [commit])

  return { value, isSelected, isDisabled, toggleDate, clear }
}
