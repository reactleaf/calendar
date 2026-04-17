import { Temporal } from '@js-temporal/polyfill'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CalendarRangeValue } from '../core/api.types'
import { Calendar } from '../Calendar'

function getEnabledDayButtons(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('button.calendar__day')).filter(
    (node): node is HTMLButtonElement => node instanceof HTMLButtonElement && !node.disabled,
  )
}

function scrollTimePart(element: HTMLElement, deltaPx: number) {
  const part = element.closest('.calendar__timePart')
  if (!(part instanceof HTMLDivElement)) throw new Error('시간 스크롤 컨테이너를 찾지 못했습니다.')
  part.scrollTop += deltaPx
  fireEvent.scroll(part)
}

describe('Calendar includeTime', () => {
  it('날짜를 고르면 00:00으로 시간 입력이 활성화되고 스크롤 300px당 1 loop로 값이 바뀐다', async () => {
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

    const hour = getByLabelText('hour value')
    const minute = getByLabelText('minute value')
    expect(hour.textContent).toBe('00')
    expect(minute.textContent).toBe('00')

    scrollTimePart(hour as HTMLElement, 150)
    await waitFor(() => expect(onSelect).toHaveBeenCalled())
    await waitFor(() => expect(hour.textContent).toBe('12'))
  })

  it('스크롤 증감은 hour/minute 범위를 순환한다', async () => {
    const onSelect = vi.fn()
    const { container } = render(
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

    fireEvent.click(container.querySelector('button[aria-label="hour value"]') as HTMLButtonElement)
    fireEvent.change(container.querySelector('input[aria-label="hour"]') as HTMLInputElement, { target: { value: '23' } })
    fireEvent.blur(container.querySelector('input[aria-label="hour"]') as HTMLInputElement)

    fireEvent.click(container.querySelector('button[aria-label="minute value"]') as HTMLButtonElement)
    fireEvent.change(container.querySelector('input[aria-label="minute"]') as HTMLInputElement, { target: { value: '59' } })
    fireEvent.blur(container.querySelector('input[aria-label="minute"]') as HTMLInputElement)

    const hour = container.querySelector('button[aria-label="hour value"]') as HTMLButtonElement | null
    const minute = container.querySelector('button[aria-label="minute value"]') as HTMLButtonElement | null
    if (!(hour instanceof HTMLButtonElement) || !(minute instanceof HTMLButtonElement)) {
      throw new Error('시간 입력 필드를 찾지 못했습니다.')
    }

    scrollTimePart(hour, 30)
    scrollTimePart(minute, 10)

    expect(hour.textContent).toBe('01')
    expect(minute.textContent).toBe('01')
  })

  it('range 모드 초기값 시간을 표시하고 시작/종료 시간을 독립적으로 편집한다', async () => {
    const onSelect = vi.fn()
    const initial: CalendarRangeValue = {
      start: Temporal.PlainDateTime.from('2026-04-01T08:00'),
      end: Temporal.PlainDateTime.from('2026-04-05T18:30'),
    }
    const { getByLabelText } = render(<Calendar mode="range" includeTime value={initial} onSelect={onSelect} />)

    expect(getByLabelText('from hour value').textContent).toBe('08')
    expect(getByLabelText('to minute value').textContent).toBe('30')

    fireEvent.click(getByLabelText('from hour value'))
    fireEvent.change(getByLabelText('from hour'), { target: { value: '11' } })
    await waitFor(() => expect(onSelect).toHaveBeenCalled())
    const payload = onSelect.mock.calls.at(-1)?.[0] as CalendarRangeValue
    expect(payload.start?.toString()).toContain('T11:')
    expect(payload.end?.toString()).toContain('T18:30')
  })
})
