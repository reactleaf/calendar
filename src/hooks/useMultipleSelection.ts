import { Temporal } from '@js-temporal/polyfill'
import { useCallback, useMemo, useState } from 'react'
import type { DateValue } from '../core/api.types'
import { toPlainDate, toSelectionValue, withTime } from '../core/calendarDate'
import { disableConstraintsFromOptions, isDateDisabled as isDateBlockedByConstraints } from '../core/constraints'
import { toggleMultipleSelection } from '../core/selection/multiple'

export interface UseMultipleSelectionOptions {
  value?: DateValue[]
  defaultValue?: DateValue[]
  minDate?: DateValue
  maxDate?: DateValue
  isDateDisabled?: (date: Temporal.PlainDate) => boolean
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
  setLatestSelectedTime: (hour: number, minute: number) => void
  clear: () => void
}

export function useMultipleSelection(options: UseMultipleSelectionOptions): UseMultipleSelectionResult {
  const {
    value: valueProp,
    defaultValue = [],
    minDate,
    maxDate,
    isDateDisabled,
    includeTime,
    minuteStep,
    maxSelections,
    onSelect,
  } = options

  const isControlled = valueProp !== undefined
  const [inner, setInner] = useState<DateValue[]>(() => defaultValue)
  const value = isControlled ? valueProp : inner

  const constraints = useMemo(
    () => disableConstraintsFromOptions({ minDate, maxDate, isDateDisabled }),
    [isDateDisabled, maxDate, minDate],
  )

  const isDisabled = useCallback((d: DateValue) => isDateBlockedByConstraints(d, constraints), [constraints])

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

  const setLatestSelectedTime = useCallback(
    (hour: number, minute: number) => {
      if (!includeTime || value.length === 0) return

      let targetIndex = 0
      for (let i = 1; i < value.length; i += 1) {
        const current = value[i]
        const target = value[targetIndex]
        if (!current || !target) continue
        if (Temporal.PlainDate.compare(toPlainDate(current), toPlainDate(target)) > 0) targetIndex = i
      }

      const next = value.map((v, i) => (i === targetIndex ? withTime(v, hour, minute, minuteStep) : v))
      commit(next)
    },
    [commit, includeTime, minuteStep, value],
  )

  return { value, isSelected, isDisabled, toggleDate, setLatestSelectedTime, clear }
}
