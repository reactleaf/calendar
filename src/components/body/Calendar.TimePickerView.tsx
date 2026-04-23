import { Temporal } from '@js-temporal/polyfill'
import type { KeyboardEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toPlainDate, toSelectionValue } from '../../core/calendarDate'
import type { DateValue } from '../../core/api.types'
import { useCalendarContext } from '../Calendar.context'
import type { CalendarRuntime } from '../Calendar.types'
import { CalendarScrollPicker } from './Calendar.ScrollPicker'
import type { CalendarTimeEditTarget } from '../Calendar.types'

/**
 * 시간 선택 보조 뷰(`displayMode === 'time'`).
 *
 * 레이아웃
 *  - 상단 툴바: "5분 단위로 보기" 체크박스 (기본 on = 5분 단위 뷰 필터)
 *  - single / multiple : 한 쌍의 피커 (hour · minute)
 *  - range            : 두 쌍 (시작 / 종료) 각각에 hour · minute 피커
 *
 * 각 피커는 `CalendarScrollPicker` — iOS 풍 세로 스크롤 + snap + 클릭 commit.
 * 시각 언어(중앙 원형 pip)는 day cell / month picker 와 일관.
 *
 * 복귀 경로
 *  - ESC: days 뷰로 복귀
 *  - 헤더의 year / date 라벨(기존 단방향 네비게이션) 그대로 사용
 */

type Granularity = 'coarse' | 'fine'

function resolveEditorDateTime(value: DateValue | null): Temporal.PlainDateTime | null {
  if (value === null) return null
  if (value instanceof Temporal.PlainDateTime) return value
  return toSelectionValue(value, true) as Temporal.PlainDateTime
}

interface SectionTime {
  target: CalendarTimeEditTarget
  label: string | null
  value: Temporal.PlainDateTime | null
  /** a11y prefix — picker button 들의 aria-label 구분자 (예: "from hour", "hour") */
  prefix: string
  ariaHour: string
  ariaMinute: string
}

/**
 * `useMemo` 의존성과 `useState` 초기함수 양쪽에서 공유하기 위해 helper 로 분리.
 * `mode / selectionSnapshot / rangeHeaderValue` 가 같으면 결과도 같음(순수 함수).
 */
function computeSections(
  mode: CalendarRuntime['mode'],
  selectionSnapshot: CalendarRuntime['selectionSnapshot'],
  rangeHeaderValue: CalendarRuntime['rangeHeaderValue'],
): SectionTime[] {
  if (mode === 'range') {
    const source =
      selectionSnapshot.mode === 'range' ? (rangeHeaderValue ?? selectionSnapshot.value) : { start: null, end: null }
    return [
      {
        target: 'rangeStart',
        label: '시작',
        value: resolveEditorDateTime(source.start),
        prefix: 'from',
        ariaHour: 'from hour',
        ariaMinute: 'from minute',
      },
      {
        target: 'rangeEnd',
        label: '종료',
        value: resolveEditorDateTime(source.end),
        prefix: 'to',
        ariaHour: 'to hour',
        ariaMinute: 'to minute',
      },
    ]
  }
  let dt: Temporal.PlainDateTime | null = null
  if (selectionSnapshot.mode === 'single') dt = resolveEditorDateTime(selectionSnapshot.value)
  else if (selectionSnapshot.mode === 'multiple') {
    const entries = selectionSnapshot.values.map((value, index) => ({
      value,
      plain: selectionSnapshot.plain.values[index] ?? toPlainDate(value),
    }))
    entries.sort((a, b) => Temporal.PlainDate.compare(a.plain, b.plain))
    const primaryIndex =
      selectionSnapshot.plain.primary === null
        ? -1
        : selectionSnapshot.plain.values.findIndex((value) => value.equals(selectionSnapshot.plain.primary!))
    dt = resolveEditorDateTime(
      (primaryIndex >= 0 ? selectionSnapshot.values[primaryIndex] : null) ?? entries.at(-1)?.value ?? null,
    )
  }
  return [
    {
      target: 'primary',
      label: null,
      value: dt,
      prefix: '',
      ariaHour: 'hour',
      ariaMinute: 'minute',
    },
  ]
}

/** 초기에 선택된 값의 분이 5의 배수가 아닌 섹션이 하나라도 있으면 1분 단위(fine) 뷰로 진입. */
function needsFineGranularity(sections: SectionTime[]): boolean {
  return sections.some((s) => s.value !== null && s.value.minute % 5 !== 0)
}

export function CalendarTimePickerView() {
  const { mode, selection, displayMode, setDisplayMode, timeEditTarget, selectionSnapshot, rangeHeaderValue } =
    useCalendarContext()

  const sections = useMemo<SectionTime[]>(
    () => computeSections(mode, selectionSnapshot, rangeHeaderValue),
    [mode, selectionSnapshot, rangeHeaderValue],
  )

  /**
   * "5분 단위로 보기" 뷰 필터 토글.
   * - 체크(기본): `coarse` — 분 피커를 5분 간격으로 줄여 노출 (필터 적용 상태).
   * - 체크 해제: `fine` — 0~59 전체 노출.
   * - **단, 진입 시** 선택된 minute 이 5의 배수가 아닌 섹션이 있으면 자동으로 체크 해제(fine)
   *   상태로 진입해 현재 값이 필터에 가려지지 않도록 한다. 이후 사용자가 토글을 바꾸면 그 선택을 유지.
   * - `useState` 초기함수에서 계산하므로 time view 마다(=mount 마다) 재평가됨.
   */
  const [granularity, setGranularity] = useState<Granularity>(() =>
    needsFineGranularity(computeSections(mode, selectionSnapshot, rangeHeaderValue)) ? 'fine' : 'coarse',
  )
  const minuteStepUi = granularity === 'fine' ? 1 : 5
  const minuteOptions = useMemo(() => {
    const list: number[] = []
    for (let m = 0; m < 60; m += minuteStepUi) list.push(m)
    return list
  }, [minuteStepUi])
  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => i), [])

  const commitHour = useCallback(
    (target: CalendarTimeEditTarget, current: Temporal.PlainDateTime | null, hour: number) => {
      const minute = current?.minute ?? 0
      if (target === 'primary') selection.setSelectedTime?.(hour, minute)
      else if (target === 'rangeStart') selection.setRangeTime?.('start', hour, minute)
      else selection.setRangeTime?.('end', hour, minute)
    },
    [selection],
  )

  const commitMinute = useCallback(
    (target: CalendarTimeEditTarget, current: Temporal.PlainDateTime | null, minute: number) => {
      const hour = current?.hour ?? 0
      if (target === 'primary') selection.setSelectedTime?.(hour, minute)
      else if (target === 'rangeStart') selection.setRangeTime?.('start', hour, minute)
      else selection.setRangeTime?.('end', hour, minute)
    },
    [selection],
  )

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setDisplayMode('days')
      }
    },
    [setDisplayMode],
  )

  /**
   * 진입 직후 `timeEditTarget` 에 해당하는 섹션의 hour picker 로 포커스를 잠시 옮긴다.
   * 단, 헤더 TimeInput 의 hour/minute 클릭으로 진입한 경우 이미 `<input>` 에 포커스가 가 있으므로
   * 그 포커스를 빼앗지 않는다(=타이핑 경로 보존).
   */
  const rootRef = useRef<HTMLDivElement | null>(null)
  const didFocusRef = useRef(false)
  useEffect(() => {
    if (displayMode !== 'time') {
      didFocusRef.current = false
      return
    }
    if (didFocusRef.current) return
    if (document.activeElement instanceof HTMLInputElement) {
      didFocusRef.current = true
      return
    }
    const root = rootRef.current
    if (!root) return
    const sectionSelector =
      timeEditTarget === 'rangeEnd'
        ? '[data-time-section="rangeEnd"]'
        : timeEditTarget === 'rangeStart'
          ? '[data-time-section="rangeStart"]'
          : '[data-time-section="primary"]'
    const section = root.querySelector<HTMLElement>(sectionSelector) ?? root
    const active = section.querySelector<HTMLButtonElement>('.calendar__timeScrollItem.is-active')
    if (active) {
      active.focus({ preventScroll: true })
      didFocusRef.current = true
    }
  }, [displayMode, timeEditTarget])

  const ariaLabel =
    mode === 'range'
      ? '시간 선택 (시작/종료)'
      : timeEditTarget === 'rangeStart'
        ? '시작 시간 선택'
        : timeEditTarget === 'rangeEnd'
          ? '종료 시간 선택'
          : '시간 선택'

  /** 어느 한 섹션이라도 날짜가 선택되어 있으면 피커들을 렌더 (없는 섹션은 비활성 표시). */
  const hasAnySelection = sections.some((s) => s.value !== null)

  return (
    <div
      ref={rootRef}
      className="calendar__timeSelect"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      <div className="calendar__timeSelectToolbar">
        <label className="calendar__timeSelectGranularity">
          <input
            type="checkbox"
            checked={granularity === 'coarse'}
            onChange={(event) => setGranularity(event.target.checked ? 'coarse' : 'fine')}
            aria-label="5분 단위로 보기"
          />
          <span>5분 단위로 보기</span>
        </label>
      </div>

      {!hasAnySelection ? (
        <div className="calendar__timeSelectEmpty">날짜를 먼저 선택해 주세요.</div>
      ) : (
        <div className={`calendar__timeSelectSections${mode === 'range' ? ' is-range' : ''}`}>
          {sections.map((section) => {
            const disabled = section.value === null
            return (
              <section
                key={section.target}
                className="calendar__timeSelectSection"
                data-time-section={section.target}
                aria-label={section.label ?? ariaLabel}
              >
                {section.label ? <header className="calendar__timeSelectSectionTitle">{section.label}</header> : null}
                {disabled ? (
                  <div className="calendar__timeSelectSectionEmpty">—</div>
                ) : (
                  <div className="calendar__timeSelectPickers">
                    <CalendarScrollPicker
                      values={hourOptions}
                      currentValue={section.value?.hour ?? null}
                      pad={2}
                      onPick={(h) => commitHour(section.target, section.value, h)}
                      ariaLabelPrefix={section.ariaHour}
                      columnLabel="H"
                    />
                    {/*
                      granularity 가 바뀌면 minute picker 의 `values` 길이가 12↔60 으로 달라지는데,
                      같은 인스턴스를 유지하면 이전 `scrollTop` 을 그대로 상속해 active pip 이 엉뚱한
                      slot 에 보이고 loop 경계 계산도 어긋난다. `key` 에 `minuteStepUi` 를 포함해
                      토글 시 picker 를 **remount** 시키면, 초기 layout effect 가 다시 돌면서
                      **현재 시간값을 중앙 slot 에 재정렬**한다. 값 자체는 context 상에서 그대로
                      유지되므로 commit 은 발생하지 않는다.
                    */}
                    <CalendarScrollPicker
                      key={`minute-${minuteStepUi}`}
                      values={minuteOptions}
                      currentValue={section.value?.minute ?? null}
                      pad={2}
                      onPick={(m) => commitMinute(section.target, section.value, m)}
                      ariaLabelPrefix={section.ariaMinute}
                      columnLabel="M"
                    />
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
