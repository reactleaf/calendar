import { Temporal } from '@js-temporal/polyfill'
import { fireEvent, render, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { CalendarRangeValue } from '../core/api.types'
import { Calendar } from '../Calendar'

function getEnabledDayButtons(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('button.calendar__day')).filter(
    (node): node is HTMLButtonElement => node instanceof HTMLButtonElement && !node.disabled,
  )
}

/**
 * 특정 섹션(primary/rangeStart/rangeEnd)의 피커 내에서 값이 매칭되는 아이템 버튼을 찾는다.
 *
 * loop 스크롤 구현상 동일 aria-label 을 가진 option 이 여러 번(REPEAT) 렌더되므로,
 * `getAllByRole` 후 첫 번째를 사용한다. 모든 복제본은 같은 값으로 commit 되므로 어떤 것을
 * 눌러도 결과는 동일.
 */
function pickerItem(
  container: HTMLElement,
  section: 'primary' | 'rangeStart' | 'rangeEnd',
  ariaLabel: string,
  value: number,
): HTMLButtonElement {
  const sectionEl = container.querySelector<HTMLElement>(`[data-time-section="${section}"]`)
  if (!sectionEl) throw new Error(`section "${section}" not found`)
  const options = within(sectionEl).getAllByRole('option', { name: `${ariaLabel} ${value}` })
  const btn = options[0]
  if (!(btn instanceof HTMLButtonElement)) throw new Error('item is not a button')
  return btn
}

/** 섹션 내 특정 축(hour/minute) 피커의 "고유" 값 개수. 복제본(REPEAT)이 있으므로 Set 으로 de-dup. */
function uniqueAxisValueCount(container: HTMLElement, section: string, axis: 'hour' | 'minute'): number {
  const list = container.querySelector<HTMLElement>(
    `[data-time-section="${section}"] [data-time-axis="${axis}"]`,
  )
  if (!list) throw new Error(`${axis} listbox not found in section ${section}`)
  const buttons = list.querySelectorAll<HTMLElement>('button.calendar__timeScrollItem')
  return new Set(Array.from(buttons).map((b) => b.getAttribute('data-time-value'))).size
}

describe('Calendar includeTime', () => {
  it('날짜를 고르면 시간 입력이 활성화되고, hour 라벨 클릭 시 직접 타이핑 + time view 로 진입한다', async () => {
    const onSelect = vi.fn()
    const { container, getByLabelText, getByRole } = render(
      <Calendar
        mode="single"
        includeTime
        minDate={Temporal.PlainDate.from('2026-01-01')}
        maxDate={Temporal.PlainDate.from('2026-12-31')}
        onSelect={onSelect}
      />,
    )

    await waitFor(() => expect(getEnabledDayButtons(container).length).toBeGreaterThan(0))
    fireEvent.click(getEnabledDayButtons(container)[0] as HTMLButtonElement)

    const hourDisplay = getByLabelText('hour value')
    const minuteDisplay = getByLabelText('minute value')
    expect(hourDisplay.textContent).toBe('00')
    expect(minuteDisplay.textContent).toBe('00')

    fireEvent.click(hourDisplay)
    // input 전환 + time view 동시 진입
    const hourInput = container.querySelector<HTMLInputElement>('input[aria-label="hour"]')
    expect(hourInput).not.toBeNull()
    expect(getByRole('dialog', { name: '시간 선택' })).toBeDefined()
    if (!hourInput) throw new Error('hour input not rendered')

    fireEvent.change(hourInput, { target: { value: '14' } })
    fireEvent.blur(hourInput)
    await waitFor(() => expect(onSelect).toHaveBeenCalled())
  })

  it('time view 에서 hour 스크롤 피커의 아이템을 클릭하면 시간이 즉시 반영된다', async () => {
    const onSelect = vi.fn()
    const { container, getByLabelText } = render(
      <Calendar
        mode="single"
        includeTime
        minDate={Temporal.PlainDate.from('2026-01-01')}
        maxDate={Temporal.PlainDate.from('2026-12-31')}
        onSelect={onSelect}
      />,
    )

    await waitFor(() => expect(getEnabledDayButtons(container).length).toBeGreaterThan(0))
    fireEvent.click(getEnabledDayButtons(container)[0] as HTMLButtonElement)
    fireEvent.click(getByLabelText('hour value'))

    fireEvent.click(pickerItem(container, 'primary', 'hour', 9))
    await waitFor(() => {
      const payload = onSelect.mock.calls.at(-1)?.[0] as Temporal.PlainDateTime | null
      expect(payload).toBeInstanceOf(Temporal.PlainDateTime)
      expect(payload?.hour).toBe(9)
      expect(payload?.minute).toBe(0)
    })
  })

  it('기본은 "5분 단위로 보기"가 체크되어 분 12개가 노출되고, 체크 해제 시 60개 전체가 노출된다', async () => {
    const { container, getByLabelText } = render(
      <Calendar
        mode="single"
        includeTime
        minDate={Temporal.PlainDate.from('2026-01-01')}
        maxDate={Temporal.PlainDate.from('2026-12-31')}
        onSelect={() => {}}
      />,
    )

    await waitFor(() => expect(getEnabledDayButtons(container).length).toBeGreaterThan(0))
    fireEvent.click(getEnabledDayButtons(container)[0] as HTMLButtonElement)
    fireEvent.click(getByLabelText('hour value'))

    const toggle = getByLabelText('5분 단위로 보기') as HTMLInputElement
    expect(toggle.checked).toBe(true)
    expect(uniqueAxisValueCount(container, 'primary', 'minute')).toBe(12)

    fireEvent.click(toggle)
    expect(toggle.checked).toBe(false)
    expect(uniqueAxisValueCount(container, 'primary', 'minute')).toBe(60)
  })

  it('"5분 단위로 보기" 토글은 뷰 필터 — 체크해도 선택값은 유지되고, 값이 노출 목록에 없으면 active 표시가 사라진다', async () => {
    const initial: CalendarRangeValue = {
      start: Temporal.PlainDateTime.from('2026-04-08T00:00'),
      end: Temporal.PlainDateTime.from('2026-04-20T13:33'),
    }
    const onSelectSpy = vi.fn()
    function Host() {
      const [value, setValue] = useState<CalendarRangeValue>(initial)
      return (
        <Calendar
          mode="range"
          includeTime
          value={value}
          onSelect={(next) => {
            onSelectSpy(next)
            setValue(next)
          }}
        />
      )
    }
    const { container, getByLabelText } = render(<Host />)

    fireEvent.click(getByLabelText('to hour value'))

    // 진입 시 값이 5 배수가 아니므로 "5분 단위로 보기"는 자동 해제(fine) — 33 에 active 존재
    const endMinuteList = container.querySelector<HTMLElement>(
      '[data-time-section="rangeEnd"] [data-time-axis="minute"]',
    )!
    expect(endMinuteList.querySelector('button.calendar__timeScrollItem.is-active[data-time-value="33"]')).toBeTruthy()

    // 사용자가 "5분 단위로 보기"를 체크 → coarse 필터 적용
    const toggle = getByLabelText('5분 단위로 보기') as HTMLInputElement
    expect(toggle.checked).toBe(false)
    fireEvent.click(toggle)
    expect(toggle.checked).toBe(true)

    // 선택값 자체는 commit 되지 않아 그대로 유지 (onSelect 호출 없음)
    expect(onSelectSpy).not.toHaveBeenCalled()

    // 노출 목록에 33 이 없으므로 어느 slot 도 active 표시되지 않아야 한다 (뷰 필터)
    const endMinuteListAfter = container.querySelector<HTMLElement>(
      '[data-time-section="rangeEnd"] [data-time-axis="minute"]',
    )!
    expect(endMinuteListAfter.querySelectorAll('button.calendar__timeScrollItem.is-active').length).toBe(0)

    // 반면, 종료 시(hour=13)는 hour 목록에 그대로 있으므로 active 는 유지된다
    const endHourList = container.querySelector<HTMLElement>(
      '[data-time-section="rangeEnd"] [data-time-axis="hour"]',
    )!
    expect(endHourList.querySelector('button.calendar__timeScrollItem.is-active[data-time-value="13"]')).toBeTruthy()
  })

  it('초기 선택값의 분이 5의 배수가 아니면 "5분 단위로 보기"가 자동 해제된 채로 진입한다', async () => {
    const initial: CalendarRangeValue = {
      start: Temporal.PlainDateTime.from('2026-04-08T00:00'),
      end: Temporal.PlainDateTime.from('2026-04-20T13:33'),
    }
    const { container, getByLabelText } = render(
      <Calendar mode="range" includeTime value={initial} onSelect={() => {}} />,
    )

    fireEvent.click(getByLabelText('from hour value'))

    const toggle = getByLabelText('5분 단위로 보기') as HTMLInputElement
    expect(toggle.checked).toBe(false)
    // fine 뷰이므로 분 피커에 60 개의 고유 값이 렌더된다.
    expect(uniqueAxisValueCount(container, 'rangeEnd', 'minute')).toBe(60)
  })

  it('range 모드에서 time view 는 시작/종료 두 섹션을 보여주고, 각 섹션은 독립적으로 편집된다', async () => {
    const onSelectSpy = vi.fn()
    function RangeHost() {
      const [value, setValue] = useState<CalendarRangeValue>({
        start: Temporal.PlainDateTime.from('2026-04-01T08:00'),
        end: Temporal.PlainDateTime.from('2026-04-05T18:30'),
      })
      return (
        <Calendar
          mode="range"
          includeTime
          value={value}
          onSelect={(next) => {
            onSelectSpy(next)
            setValue(next)
          }}
        />
      )
    }
    const { container, getByLabelText, getByRole } = render(<RangeHost />)

    expect(getByLabelText('from hour value').textContent).toBe('08')
    expect(getByLabelText('to minute value').textContent).toBe('30')

    fireEvent.click(getByLabelText('from hour value'))
    expect(getByRole('dialog', { name: '시간 선택 (시작/종료)' })).toBeDefined()
    // 두 섹션 모두 렌더됨
    expect(container.querySelector('[data-time-section="rangeStart"]')).toBeTruthy()
    expect(container.querySelector('[data-time-section="rangeEnd"]')).toBeTruthy()

    // 시작 섹션의 hour = 11 로 변경
    fireEvent.click(pickerItem(container, 'rangeStart', 'from hour', 11))
    await waitFor(() => {
      const last = onSelectSpy.mock.calls.at(-1)?.[0] as CalendarRangeValue
      expect(last.start?.toString()).toContain('T11:00')
      expect(last.end?.toString()).toContain('T18:30')
    })

    // 종료 섹션의 minute = 45 로 변경
    fireEvent.click(pickerItem(container, 'rangeEnd', 'to minute', 45))
    await waitFor(() => {
      const last = onSelectSpy.mock.calls.at(-1)?.[0] as CalendarRangeValue
      expect(last.end?.toString()).toContain('T18:45')
      // 시작은 앞선 변경이 유지
      expect(last.start?.toString()).toContain('T11:00')
    })
  })
})
