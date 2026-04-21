import { Temporal } from '@js-temporal/polyfill'
import { useCallback, useMemo, useState } from 'react'
import type { DateValue } from '../core/api.types'
import { selectionEquals, toSelectionValue, withTime } from '../core/calendarDate'
import { disableConstraintsFromOptions, isDateDisabled as isDateBlockedByConstraints } from '../core/constraints'
import { nextSingleSelection } from '../core/selection/single'

export interface UseSingleSelectionOptions {
  value?: DateValue | null
  defaultValue?: DateValue | null
  minDate?: DateValue
  maxDate?: DateValue
  isDateDisabled?: (date: Temporal.PlainDate) => boolean
  includeTime?: boolean
  onSelect?: (next: DateValue | null) => void
  allowDeselect?: boolean
}

export interface UseSingleSelectionResult {
  value: DateValue | null
  isSelected: (date: DateValue) => boolean
  isDisabled: (date: DateValue) => boolean
  selectDate: (date: DateValue, source?: 'click' | 'keyboard') => void
  setSelectedTime: (hour: number, minute: number) => void
  clear: () => void
}

export function useSingleSelection(options: UseSingleSelectionOptions): UseSingleSelectionResult {
  const {
    value: valueProp,
    defaultValue = null,
    minDate,
    maxDate,
    isDateDisabled,
    includeTime,
    onSelect,
    allowDeselect = false,
  } = options

  const isControlled = valueProp !== undefined
  const [inner, setInner] = useState<DateValue | null>(defaultValue)
  const value = isControlled ? valueProp : inner

  const constraints = useMemo(
    () => disableConstraintsFromOptions({ minDate, maxDate, isDateDisabled }),
    [isDateDisabled, maxDate, minDate],
  )

  const isDisabled = useCallback((d: DateValue) => isDateBlockedByConstraints(d, constraints), [constraints])

  const isSelected = useCallback((d: DateValue) => value !== null && selectionEquals(value, d), [value])

  const commit = useCallback(
    (next: DateValue | null) => {
      if (!isControlled) setInner(next)
      onSelect?.(next)
    },
    [isControlled, onSelect],
  )

  const selectDate = useCallback(
    (date: DateValue, source?: 'click' | 'keyboard') => {
      void source
      if (isDisabled(date)) return
      const picked = toSelectionValue(date, includeTime)
      const next = nextSingleSelection(value, picked, { allowDeselect })
      commit(next)
    },
    [allowDeselect, commit, includeTime, isDisabled, value],
  )

  const clear = useCallback(() => commit(null), [commit])

  const setSelectedTime = useCallback(
    (hour: number, minute: number) => {
      if (!includeTime || value === null) return
      commit(withTime(value, hour, minute))
    },
    [commit, includeTime, value],
  )

  return {
    value: value ?? null,
    isSelected,
    isDisabled,
    selectDate,
    setSelectedTime,
    clear,
  }
}
