import type { Temporal } from '@js-temporal/polyfill'
import { useEffect, useRef, useState } from 'react'
import { normalizeMinuteStep } from '../core/calendarDate'

interface CalendarTimeInputProps {
  label?: string
  /** 보이는 `label`과 별도로 aria 전용 접두어 (예: range 열 구분) */
  ariaLabelPrefix?: string
  value: Temporal.PlainDateTime | null
  minuteStep?: number
  onTimeChange: (hour: number, minute: number) => void
  /** 값이 있어도 편집·스크롤 반응 비활성화 (예: range 프리뷰 중) */
  interactionLocked?: boolean
}

const SCROLL_PIXELS_PER_LOOP = 300
const SCROLL_MID = 1000
const SCROLL_MAX = 2000
const SCROLL_EDGE = 220

type TimePart = 'hour' | 'minute'

function wrap(value: number, cycle: number): number {
  return ((value % cycle) + cycle) % cycle
}

function normalizeWheelDeltaPx(event: WheelEvent) {
  let deltaPx = event.deltaY
  if (event.deltaMode === 1) deltaPx *= 16
  else if (event.deltaMode === 2) deltaPx *= 400
  return deltaPx
}

export function CalendarTimeInput({
  label,
  ariaLabelPrefix,
  value,
  minuteStep,
  onTimeChange,
  interactionLocked = false,
}: CalendarTimeInputProps) {
  const step = normalizeMinuteStep(minuteStep)
  const a11yPrefix = ariaLabelPrefix ?? label
  const hour = value?.hour ?? null
  const minute = value?.minute ?? null
  const disabled = value === null || interactionLocked
  const [editingPart, setEditingPart] = useState<TimePart | null>(null)
  // TEMP(local optimistic state): setSelectedTime 반영 지연 중에도 입력 반응성을 유지한다.
  const [draftTime, setDraftTime] = useState<{ hour: number; minute: number } | null>(
    value ? { hour: value.hour, minute: value.minute } : null,
  )

  const hourInputRef = useRef<HTMLInputElement | null>(null)
  const minuteInputRef = useRef<HTMLInputElement | null>(null)
  const timeEditorRef = useRef<HTMLDivElement | null>(null)
  const hourPartRef = useRef<HTMLDivElement | null>(null)
  const minutePartRef = useRef<HTMLDivElement | null>(null)
  const hourScrollAccumRef = useRef(0)
  const minuteScrollAccumRef = useRef(0)
  const hourPartPrevTopRef = useRef(SCROLL_MID)
  const minutePartPrevTopRef = useRef(SCROLL_MID)
  // TEMP(local optimistic state): setSelectedTime 반영 지연 중에도 입력 반응성을 유지한다.
  const pendingCommitRef = useRef<{ hour: number; minute: number } | null>(null)
  const commitFrameRef = useRef<number | null>(null)
  const onTimeChangeRef = useRef(onTimeChange)

  useEffect(() => {
    onTimeChangeRef.current = onTimeChange
  }, [onTimeChange])

  useEffect(() => {
    queueMicrotask(() => {
      if (value === null) {
        setDraftTime(null)
        return
      }
      setDraftTime({ hour: value.hour, minute: value.minute })
    })
  }, [value])

  useEffect(() => {
    return () => {
      if (commitFrameRef.current !== null) cancelAnimationFrame(commitFrameRef.current)
      const pending = pendingCommitRef.current
      if (pending) onTimeChangeRef.current(pending.hour, pending.minute)
    }
  }, [])

  const resolvedHour = draftTime?.hour ?? hour
  const resolvedMinute = draftTime?.minute ?? minute

  const flushCommit = () => {
    commitFrameRef.current = null
    const pending = pendingCommitRef.current
    if (!pending) return
    pendingCommitRef.current = null
    onTimeChangeRef.current(pending.hour, pending.minute)
  }

  const scheduleCommit = (nextHour: number, nextMinute: number) => {
    pendingCommitRef.current = { hour: nextHour, minute: nextMinute }
    if (commitFrameRef.current !== null) return
    commitFrameRef.current = requestAnimationFrame(flushCommit)
  }

  const commitNext = (nextHour: number, nextMinute: number) => {
    if (disabled) return
    const normalizedHour = wrap(nextHour, 24)
    const normalizedMinute = wrap(nextMinute, 60)
    setDraftTime({ hour: normalizedHour, minute: normalizedMinute })
    scheduleCommit(normalizedHour, normalizedMinute)
  }

  const handleDelta = (part: TimePart, deltaPx: number) => {
    if (disabled) return

    const stepsPerLoop = part === 'hour' ? 24 : 60 / step
    const accumRef = part === 'hour' ? hourScrollAccumRef : minuteScrollAccumRef
    accumRef.current += (deltaPx * stepsPerLoop) / SCROLL_PIXELS_PER_LOOP
    const steps = accumRef.current >= 0 ? Math.floor(accumRef.current) : Math.ceil(accumRef.current)
    if (steps === 0) return
    accumRef.current -= steps

    if (part === 'hour') commitNext((resolvedHour ?? 0) + steps, resolvedMinute ?? 0)
    else commitNext(resolvedHour ?? 0, (resolvedMinute ?? 0) + steps * step)
  }

  const commitHour = (raw: string) => {
    if (disabled) return
    const next = Number(raw)
    if (Number.isNaN(next)) return
    commitNext(next, resolvedMinute ?? 0)
  }

  const commitMinute = (raw: string) => {
    if (disabled) return
    const next = Number(raw)
    if (Number.isNaN(next)) return
    commitNext(resolvedHour ?? 0, next)
  }

  useEffect(() => {
    const hourPart = hourPartRef.current
    const minutePart = minutePartRef.current
    if (hourPart) {
      hourPart.scrollTop = SCROLL_MID
      hourPartPrevTopRef.current = SCROLL_MID
    }
    if (minutePart) {
      minutePart.scrollTop = SCROLL_MID
      minutePartPrevTopRef.current = SCROLL_MID
    }
  }, [])

  useEffect(() => {
    const editor = timeEditorRef.current
    if (!editor) return

    /** 시·분 스크롤 영역은 네이티브 스크롤을 유지해 onScroll이 발생하게 하고, 라벨·콜론 등만 기본 스크롤(배경)을 막는다. */
    const wheelOnEditor = (event: WheelEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      const hourPart = hourPartRef.current
      const minutePart = minutePartRef.current
      if (hourPart?.contains(target) || minutePart?.contains(target)) return
      event.preventDefault()
      event.stopPropagation()
    }

    const opts: AddEventListenerOptions = { passive: false }
    editor.addEventListener('wheel', wheelOnEditor, opts)
    return () => editor.removeEventListener('wheel', wheelOnEditor, opts)
  }, [])

  /** 네이티브 스크롤(관성 포함) 대신 휠 델타만 반영 — 트랙패드 관성 제거, scroll 이벤트는 scrollTop 변경으로 발생 */
  useEffect(() => {
    const hourPart = hourPartRef.current
    const minutePart = minutePartRef.current
    const opts: AddEventListenerOptions = { passive: false }

    const wheelHour = (event: WheelEvent) => {
      if (disabled) return
      event.preventDefault()
      event.stopPropagation()
      const node = hourPartRef.current
      if (!node) return
      node.scrollTop += normalizeWheelDeltaPx(event)
    }

    const wheelMinute = (event: WheelEvent) => {
      if (disabled) return
      event.preventDefault()
      event.stopPropagation()
      const node = minutePartRef.current
      if (!node) return
      node.scrollTop += normalizeWheelDeltaPx(event)
    }

    hourPart?.addEventListener('wheel', wheelHour, opts)
    minutePart?.addEventListener('wheel', wheelMinute, opts)
    return () => {
      hourPart?.removeEventListener('wheel', wheelHour, opts)
      minutePart?.removeEventListener('wheel', wheelMinute, opts)
    }
  }, [disabled])

  useEffect(() => {
    if (editingPart === 'hour') {
      hourInputRef.current?.focus()
      hourInputRef.current?.select()
    } else if (editingPart === 'minute') {
      minuteInputRef.current?.focus()
      minuteInputRef.current?.select()
    }
  }, [editingPart])

  const onPartScroll = (part: TimePart) => {
    const node = part === 'hour' ? hourPartRef.current : minutePartRef.current
    const prevTopRef = part === 'hour' ? hourPartPrevTopRef : minutePartPrevTopRef
    if (!node) return

    const currentTop = node.scrollTop
    const delta = currentTop - prevTopRef.current
    prevTopRef.current = currentTop
    handleDelta(part, delta)

    if (currentTop < SCROLL_EDGE || currentTop > SCROLL_MAX - SCROLL_EDGE) {
      node.scrollTop = SCROLL_MID
      prevTopRef.current = SCROLL_MID
    }
  }

  const renderPart = (part: TimePart) => {
    const currentValue = part === 'hour' ? resolvedHour : resolvedMinute

    if (editingPart === part) {
      return (
        <input
          ref={part === 'hour' ? hourInputRef : minuteInputRef}
          className="calendar__timeInput"
          inputMode="numeric"
          type="number"
          min={0}
          max={part === 'hour' ? 23 : 59}
          step={part === 'hour' ? 1 : step}
          value={currentValue ?? ''}
          placeholder={part === 'hour' ? 'hh' : 'mm'}
          disabled={disabled}
          onChange={(event) => (part === 'hour' ? commitHour(event.target.value) : commitMinute(event.target.value))}
          onBlur={() => setEditingPart(null)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === 'Escape') setEditingPart(null)
          }}
          aria-label={a11yPrefix ? `${a11yPrefix} ${part}` : part}
          autoFocus
        />
      )
    }

    return (
      <button
        type="button"
        className="calendar__timeDisplay"
        disabled={disabled}
        onMouseDown={(event) => {
          event.preventDefault()
          setEditingPart(part)
        }}
        onClick={() => setEditingPart(part)}
        aria-label={a11yPrefix ? `${a11yPrefix} ${part} value` : `${part} value`}
      >
        {currentValue === null ? '--' : String(currentValue).padStart(2, '0')}
      </button>
    )
  }

  return (
    <div ref={timeEditorRef} className="calendar__timeEditor">
      {label ? <span className="calendar__timeEditorLabel">{label}</span> : null}
      <div className="calendar__timeFields">
        <div ref={hourPartRef} className="calendar__timePart" onScroll={() => onPartScroll('hour')}>
          <div className="calendar__timePartControl">{renderPart('hour')}</div>
          <div className="calendar__timeScrollSensorTrack" aria-hidden="true" />
        </div>
        <span className="calendar__timeColon">:</span>
        <div ref={minutePartRef} className="calendar__timePart" onScroll={() => onPartScroll('minute')}>
          <div className="calendar__timePartControl">{renderPart('minute')}</div>
          <div className="calendar__timeScrollSensorTrack" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
