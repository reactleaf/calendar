import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarRangeValue, DateValue } from '../core/api.types'
import { sameCalendarDay, toPlainDate, toSelectionValue, type PlainDay } from '../core/calendarDate'
import { disableConstraintsFromOptions, isDateDisabled } from '../core/constraints'
import { isDayInInclusiveRange } from '../core/rangeHighlight'
import {
  rangePointerDown,
  rangePointerPreview,
  type CommittedRange,
  type RangePointerState,
} from '../core/selection/rangePointer'

export interface UseRangeSelectionOptions {
  value?: CalendarRangeValue
  defaultValue?: CalendarRangeValue
  disabled?: boolean
  minDate?: DateValue
  maxDate?: DateValue
  disabledDates?: readonly DateValue[]
  disabledDays?: readonly number[]
  includeTime?: boolean
  minuteStep?: number
  allowRangePreview?: boolean
  onSelect?: (next: CalendarRangeValue) => void
  onRangePreview?: (next: CalendarRangeValue | null) => void
}

export interface UseRangeSelectionResult {
  value: CalendarRangeValue
  preview: CalendarRangeValue | null
  isSelected: (date: DateValue) => boolean
  isInPreviewRange: (date: DateValue) => boolean
  isRangeStart: (date: DateValue) => boolean
  isRangeEnd: (date: DateValue) => boolean
  isDisabled: (date: DateValue) => boolean
  selectDate: (date: DateValue, source?: 'click' | 'keyboard') => void
  previewDate: (date: DateValue, source?: 'hover' | 'keyboard') => void
  clear: () => void
}

const EMPTY: CalendarRangeValue = { start: null, end: null }

function toPreviewPayload(preview: CommittedRange | null, includeTime?: boolean): CalendarRangeValue | null {
  if (!preview) return null
  return {
    start: toSelectionValue(preview.start, includeTime),
    end: toSelectionValue(preview.end, includeTime),
  }
}

function previewKey(p: CalendarRangeValue | null): string {
  if (p === null) return 'null'
  return `${p.start?.toString() ?? 'x'}|${p.end?.toString() ?? 'x'}`
}

export function useRangeSelection(options: UseRangeSelectionOptions): UseRangeSelectionResult {
  const {
    value: valueProp,
    defaultValue,
    disabled,
    minDate,
    maxDate,
    disabledDates,
    disabledDays,
    includeTime,
    allowRangePreview,
    onSelect,
    onRangePreview,
  } = options

  const isControlled = valueProp !== undefined
  const [internalCommitted, setInternalCommitted] = useState<CalendarRangeValue>(() => defaultValue ?? EMPTY)
  const committed = isControlled ? (valueProp ?? EMPTY) : internalCommitted

  const [pointer, setPointer] = useState<RangePointerState>({ kind: 'idle' })
  const pointerRef = useRef<RangePointerState>(pointer)
  const [hoverDate, setHoverDate] = useState<PlainDay | null>(null)

  const controlledCommittedKey = isControlled
    ? `${valueProp?.start?.toString() ?? ''}|${valueProp?.end?.toString() ?? ''}`
    : ''

  const constraints = useMemo(
    () => disableConstraintsFromOptions({ disabled, minDate, maxDate, disabledDates, disabledDays }),
    [disabled, disabledDates, disabledDays, maxDate, minDate],
  )

  const isDisabled = useCallback((d: DateValue) => isDateDisabled(d, constraints), [constraints])

  const previewPlain = useMemo(() => {
    if (pointer.kind !== 'anchored') return null
    const hover = allowRangePreview ? hoverDate : null
    return rangePointerPreview(pointer, hover ?? pointer.anchor)
  }, [allowRangePreview, hoverDate, pointer])

  const preview = useMemo(() => toPreviewPayload(previewPlain, includeTime), [includeTime, previewPlain])

  const previewCallback = useRef(onRangePreview)

  useEffect(() => {
    pointerRef.current = pointer
  }, [pointer])

  useEffect(() => {
    previewCallback.current = onRangePreview
  }, [onRangePreview])

  const lastPreviewKey = useRef<string | null>(null)
  useEffect(() => {
    const key = previewKey(preview)
    if (lastPreviewKey.current === null) {
      lastPreviewKey.current = key
      return
    }
    if (lastPreviewKey.current === key) return
    lastPreviewKey.current = key
    previewCallback.current?.(preview)
  }, [preview])

  /* 외부에서 확정된 range가 바뀌면, 진행 중(앵커·호버) 상태만 버린다. */
  /* eslint-disable react-hooks/set-state-in-effect -- 제어 props 동기화 전용 */
  useEffect(() => {
    if (!isControlled) return
    setPointer({ kind: 'idle' })
    setHoverDate(null)
  }, [controlledCommittedKey, isControlled])
  /* eslint-enable react-hooks/set-state-in-effect */

  const isSelected = useCallback(
    (date: DateValue) => {
      if (committed.start === null || committed.end === null) return false
      return isDayInInclusiveRange(date, committed.start, committed.end)
    },
    [committed.end, committed.start],
  )

  const isInPreviewRange = useCallback(
    (date: DateValue) => {
      if (!preview?.start || !preview?.end) return false
      return isDayInInclusiveRange(date, preview.start, preview.end)
    },
    [preview],
  )

  const isRangeStart = useCallback(
    (date: DateValue) => committed.start !== null && sameCalendarDay(date, committed.start),
    [committed.start],
  )

  const isRangeEnd = useCallback(
    (date: DateValue) => committed.end !== null && sameCalendarDay(date, committed.end),
    [committed.end],
  )

  const selectDate = useCallback(
    (date: DateValue, source?: 'click' | 'keyboard') => {
      void source
      if (isDisabled(date)) return
      const dayPlain = toPlainDate(toSelectionValue(date, includeTime))
      const prev = pointerRef.current
      const { next, committed: done } = rangePointerDown(prev, dayPlain)
      setPointer(next)
      if (done) {
        const payload: CalendarRangeValue = {
          start: toSelectionValue(done.start, includeTime),
          end: toSelectionValue(done.end, includeTime),
        }
        onSelect?.(payload)
        if (!isControlled) {
          setInternalCommitted(payload)
        }
        setHoverDate(null)
      }
    },
    [includeTime, isControlled, isDisabled, onSelect],
  )

  const previewDate = useCallback(
    (date: DateValue, source?: 'hover' | 'keyboard') => {
      void source
      if (!allowRangePreview) return
      if (isDisabled(date)) return
      setHoverDate(toPlainDate(toSelectionValue(date, includeTime)))
    },
    [allowRangePreview, includeTime, isDisabled],
  )

  const clear = useCallback(() => {
    setPointer({ kind: 'idle' })
    setHoverDate(null)
    if (!isControlled) setInternalCommitted(EMPTY)
  }, [isControlled])

  return {
    value: committed,
    preview,
    isSelected,
    isInPreviewRange,
    isRangeStart,
    isRangeEnd,
    isDisabled,
    selectDate,
    previewDate,
    clear,
  }
}
