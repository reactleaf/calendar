import type { Temporal } from '@js-temporal/polyfill'
import { useEffect, useRef, useState } from 'react'
import { useCalendarContext } from './Calendar.context'
import type { CalendarTimeEditTarget } from './Calendar.types'

/**
 * 헤더의 시·분 표시/입력 컴포넌트.
 *
 * 과거 버전은 wheel·scroll 가속/rAF commit/draft state 등 큰 덩어리를 품고 있었다.
 * 스크롤 기반 값 조절은 `'time'` 보조 뷰(`CalendarTimeSelectView`)로 옮겨갔고,
 * 여기서는 아래 **두 가지**만 남긴다.
 *
 *  1) 숫자 직접 타이핑: hour/minute 셀을 클릭하면 해당 part 가 `<input>` 으로 전환,
 *     focus + select 되어 바로 숫자 입력이 가능하다. Enter/Esc/Blur 로 commit.
 *  2) Time view 진입: 위 클릭과 **동시에** `openTimeView(timeEditTarget)` 를 호출해
 *     보조 뷰로 전환한다. 타이핑도 되고, 그리드 선택도 되는 이중 진입점이다.
 *
 * 값 정규화(minuteStep 등)는 `onTimeChange` 바깥의 `setSelectedTime / setRangeTime`
 * 내부에서 처리되므로, 여기서는 단순 파싱만 한다.
 */
interface CalendarTimeInputProps {
  label?: string
  /** 보이는 `label`과 별도로 aria 전용 접두어 (예: range 열 구분) */
  ariaLabelPrefix?: string
  value: Temporal.PlainDateTime | null
  onTimeChange: (hour: number, minute: number) => void
  /** 값이 있어도 편집 반응 비활성화 (예: range 프리뷰 중) */
  interactionLocked?: boolean
  /** 클릭 시 열릴 `'time'` 보조 뷰의 편집 타깃 */
  timeEditTarget: CalendarTimeEditTarget
}

type TimePart = 'hour' | 'minute'

export function CalendarTimeInput({
  label,
  ariaLabelPrefix,
  value,
  onTimeChange,
  interactionLocked = false,
  timeEditTarget,
}: CalendarTimeInputProps) {
  const { openTimeView } = useCalendarContext()
  const a11yPrefix = ariaLabelPrefix ?? label
  const hour = value?.hour ?? null
  const minute = value?.minute ?? null
  const disabled = value === null || interactionLocked
  const [editingPart, setEditingPart] = useState<TimePart | null>(null)

  const hourInputRef = useRef<HTMLInputElement | null>(null)
  const minuteInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (editingPart === 'hour') {
      hourInputRef.current?.focus()
      hourInputRef.current?.select()
    } else if (editingPart === 'minute') {
      minuteInputRef.current?.focus()
      minuteInputRef.current?.select()
    }
  }, [editingPart])

  const commitHour = (raw: string) => {
    if (disabled) return
    const next = Number(raw)
    if (Number.isNaN(next)) return
    const safeMinute = minute ?? 0
    onTimeChange(next, safeMinute)
  }

  const commitMinute = (raw: string) => {
    if (disabled) return
    const next = Number(raw)
    if (Number.isNaN(next)) return
    const safeHour = hour ?? 0
    onTimeChange(safeHour, next)
  }

  /**
   * hour/minute 셀이 눌렸을 때의 공통 진입점.
   *  - input 으로 전환 (+ 곧이은 useEffect 에서 focus/select)
   *  - 동시에 time 보조 뷰를 연다 (이중 편집 경로)
   */
  const onPartActivate = (part: TimePart) => {
    if (disabled) return
    setEditingPart(part)
    openTimeView(timeEditTarget)
  }

  const renderPart = (part: TimePart) => {
    const currentValue = part === 'hour' ? hour : minute

    if (editingPart === part) {
      return (
        <input
          ref={part === 'hour' ? hourInputRef : minuteInputRef}
          className="calendar__timeInput"
          inputMode="numeric"
          type="number"
          min={0}
          max={part === 'hour' ? 23 : 59}
          step={1}
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
          /**
           * preventDefault 로 이 mousedown 이 기본 포커스를 가져가지 않게 해서,
           * 재렌더 후 input 으로 교체된 노드가 `useEffect` 에서 focus/select 를 가져갈 수 있게 한다.
           */
          event.preventDefault()
          onPartActivate(part)
        }}
        onClick={() => onPartActivate(part)}
        aria-label={a11yPrefix ? `${a11yPrefix} ${part} value` : `${part} value`}
      >
        {currentValue === null ? '--' : String(currentValue).padStart(2, '0')}
      </button>
    )
  }

  return (
    <div className="calendar__timeEditor">
      {label ? <span className="calendar__timeEditorLabel">{label}</span> : null}
      <div className="calendar__timeFields">
        <div className="calendar__timePart">
          <div className="calendar__timePartControl">{renderPart('hour')}</div>
        </div>
        <span className="calendar__timeColon">:</span>
        <div className="calendar__timePart">
          <div className="calendar__timePartControl">{renderPart('minute')}</div>
        </div>
      </div>
    </div>
  )
}
