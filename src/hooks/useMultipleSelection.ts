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
  maxSelections?: number
  onSelect?: (next: DateValue[]) => void
}

export interface ToggleMultipleDateResult {
  changed: boolean
  /** `changed === false` 이면 `null` */
  added: boolean | null
  nextValues: DateValue[]
}

export interface UseMultipleSelectionResult {
  value: DateValue[]
  isSelected: (date: DateValue) => boolean
  isDisabled: (date: DateValue) => boolean
  toggleDate: (date: DateValue, source?: 'click' | 'keyboard') => ToggleMultipleDateResult
  setTimeForPlainDate: (plain: Temporal.PlainDate, hour: number, minute: number) => void
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
    maxSelections,
    onSelect,
  } = options

  const isControlled = valueProp !== undefined
  const [inner, setInner] = useState<DateValue[]>(() => defaultValue)
  const value = isControlled ? valueProp : inner
  const plainValues = useMemo(() => value.map((v) => toPlainDate(v)), [value])

  const constraints = useMemo(
    () => disableConstraintsFromOptions({ minDate, maxDate, isDateDisabled }),
    [isDateDisabled, maxDate, minDate],
  )

  const isDisabled = useCallback((d: DateValue) => isDateBlockedByConstraints(d, constraints), [constraints])

  const isSelected = useCallback(
    (d: DateValue) => {
      const plain = toPlainDate(d)
      return plainValues.some((value) => value.equals(plain))
    },
    [plainValues],
  )

  const commit = useCallback(
    (next: DateValue[]) => {
      if (!isControlled) setInner(next)
      onSelect?.(next)
    },
    [isControlled, onSelect],
  )

  const toggleDate = useCallback(
    (date: DateValue, source?: 'click' | 'keyboard'): ToggleMultipleDateResult => {
      void source
      if (isDisabled(date)) return { changed: false, added: null, nextValues: value }
      const pickedPlain = toPlainDate(date)
      const wasSelected = plainValues.some((d) => d.equals(pickedPlain))
      const toggled = toggleMultipleSelection(plainValues, pickedPlain, maxSelections)
      if (!toggled.changed) return { changed: false, added: null, nextValues: value }
      const next = toggled.next.map((d) => toSelectionValue(d, includeTime))
      commit(next)
      return { changed: true, added: !wasSelected, nextValues: next }
    },
    [commit, includeTime, isDisabled, maxSelections, plainValues, value],
  )

  const clear = useCallback(() => commit([]), [commit])

  const setTimeForPlainDate = useCallback(
    (plain: Temporal.PlainDate, hour: number, minute: number) => {
      if (!includeTime || value.length === 0) return
      const idx = plainValues.findIndex((value) => value.equals(plain))
      if (idx === -1) return
      const next = value.map((v, i) => (i === idx ? withTime(v, hour, minute) : v))
      commit(next)
    },
    [commit, includeTime, plainValues, value],
  )

  return { value, isSelected, isDisabled, toggleDate, setTimeForPlainDate, clear }
}
