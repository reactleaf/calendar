import type { Temporal } from '@js-temporal/polyfill'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarRangeValue, DateValue } from '../core/api.types'
import { toPlainDate, toSelectionValue, withTime } from '../core/calendarDate'
import { disableConstraintsFromOptions, isDateDisabled as isDateBlockedByConstraints } from '../core/constraints'
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
  minDate?: DateValue
  maxDate?: DateValue
  includeTime?: boolean
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
  setRangeTime: (edge: 'start' | 'end', hour: number, minute: number) => void
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
  const { value: valueProp, defaultValue, minDate, maxDate, includeTime, onSelect, onRangePreview } = options

  const isControlled = valueProp !== undefined
  const [internalCommitted, setInternalCommitted] = useState<CalendarRangeValue>(() => defaultValue ?? EMPTY)
  const committed = isControlled ? (valueProp ?? EMPTY) : internalCommitted

  const [pointer, setPointer] = useState<RangePointerState>({ kind: 'idle' })
  const pointerRef = useRef<RangePointerState>(pointer)
  const [hoverDate, setHoverDate] = useState<Temporal.PlainDate | null>(null)

  const controlledCommittedKey = isControlled
    ? `${valueProp?.start?.toString() ?? ''}|${valueProp?.end?.toString() ?? ''}`
    : ''

  const constraints = useMemo(() => disableConstraintsFromOptions({ minDate, maxDate }), [maxDate, minDate])

  const isDisabled = useCallback((d: DateValue) => isDateBlockedByConstraints(d, constraints), [constraints])
  const committedPlain = useMemo(
    () => ({
      start: committed.start ? toPlainDate(committed.start) : null,
      end: committed.end ? toPlainDate(committed.end) : null,
    }),
    [committed.end, committed.start],
  )

  const previewPlain = useMemo(() => {
    if (pointer.kind !== 'anchored') return null
    return rangePointerPreview(pointer, hoverDate ?? pointer.anchor)
  }, [hoverDate, pointer])

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

  /** 확정 범위가 있는데 새 범위를 고르는 중(앵커)일 때는 확정 하이라이트를 숨기고 preview만 표시 */
  const isSelected = useCallback(
    (date: DateValue) => {
      if (pointer.kind === 'anchored') return false
      if (committedPlain.start === null || committedPlain.end === null) return false
      return isDayInInclusiveRange(toPlainDate(date), committedPlain.start, committedPlain.end)
    },
    [committedPlain.end, committedPlain.start, pointer.kind],
  )

  const isInPreviewRange = useCallback(
    (date: DateValue) => {
      if (!previewPlain?.start || !previewPlain?.end) return false
      return isDayInInclusiveRange(toPlainDate(date), previewPlain.start, previewPlain.end)
    },
    [previewPlain],
  )

  const isRangeStart = useCallback(
    (date: DateValue) => {
      const plain = toPlainDate(date)
      if (pointer.kind === 'anchored' && previewPlain?.start != null && previewPlain?.end != null) {
        return plain.equals(previewPlain.start)
      }
      return committedPlain.start !== null && plain.equals(committedPlain.start)
    },
    [committedPlain.start, pointer.kind, previewPlain],
  )

  const isRangeEnd = useCallback(
    (date: DateValue) => {
      const plain = toPlainDate(date)
      if (pointer.kind === 'anchored' && previewPlain?.start != null && previewPlain?.end != null) {
        return plain.equals(previewPlain.end)
      }
      return committedPlain.end !== null && plain.equals(committedPlain.end)
    },
    [committedPlain.end, pointer.kind, previewPlain],
  )

  const selectDate = useCallback(
    (date: DateValue, source?: 'click' | 'keyboard') => {
      void source
      if (isDisabled(date)) return
      const dayPlain = toPlainDate(date)
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
      if (isDisabled(date)) return
      setHoverDate(toPlainDate(date))
    },
    [isDisabled],
  )

  const clear = useCallback(() => {
    setPointer({ kind: 'idle' })
    setHoverDate(null)
    if (!isControlled) setInternalCommitted(EMPTY)
  }, [isControlled])

  const setRangeTime = useCallback(
    (edge: 'start' | 'end', hour: number, minute: number) => {
      if (!includeTime) return
      const target = committed[edge]
      if (!target) return
      const payload: CalendarRangeValue = {
        start: committed.start,
        end: committed.end,
      }
      payload[edge] = withTime(target, hour, minute)
      onSelect?.(payload)
      if (!isControlled) setInternalCommitted(payload)
    },
    [committed, includeTime, isControlled, onSelect],
  )

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
    setRangeTime,
    clear,
  }
}
