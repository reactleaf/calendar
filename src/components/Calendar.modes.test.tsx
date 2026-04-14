import { Temporal } from '@js-temporal/polyfill'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CalendarRangeValue } from '../core/api.types'
import { Calendar } from '../Calendar'

function getGrid(container: HTMLElement): HTMLElement {
  const grid = container.querySelector('.calendar__scroll')
  if (!(grid instanceof HTMLElement)) throw new Error('grid 요소를 찾지 못했습니다.')
  return grid
}

function getEnabledGridCells(container: HTMLElement): HTMLElement[] {
  const cells = Array.from(container.querySelectorAll('button[role="gridcell"]')).filter(
    (node): node is HTMLElement => node instanceof HTMLElement && !node.hasAttribute('disabled'),
  )
  return cells
}

function getFirstEnabledGridCell(container: HTMLElement): HTMLElement {
  const button = getEnabledGridCells(container)[0]
  if (!button) throw new Error('활성화된 날짜 셀을 찾지 못했습니다.')
  return button
}

describe('Calendar preset mode integration', () => {
  it('single 모드에서 클릭/키보드 선택 및 월 변경 콜백이 동작한다', async () => {
    const onSelect = vi.fn()
    const onMonthChange = vi.fn()

    const { container } = render(
      <Calendar
        mode="single"
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2030-12-31')}
        onSelect={onSelect}
        onMonthChange={onMonthChange}
      />,
    )

    await waitFor(() => expect(onMonthChange).toHaveBeenCalled())

    fireEvent.click(getFirstEnabledGridCell(container))
    const grid = getGrid(container)
    fireEvent.keyDown(grid, { key: 'Enter' })

    expect(onSelect).toHaveBeenCalled()
    const last = onSelect.mock.calls.at(-1)?.[0]
    expect(last).toBeInstanceOf(Temporal.PlainDate)
  })

  it('multiple 모드에서 클릭/키보드 토글 선택 및 월 변경 콜백이 동작한다', async () => {
    const onSelect = vi.fn()
    const onMonthChange = vi.fn()

    const { container } = render(
      <Calendar
        mode="multiple"
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2030-12-31')}
        onSelect={onSelect}
        onMonthChange={onMonthChange}
      />,
    )

    await waitFor(() => expect(onMonthChange).toHaveBeenCalled())

    fireEvent.click(getFirstEnabledGridCell(container))
    const grid = getGrid(container)
    fireEvent.keyDown(grid, { key: 'Enter' })

    expect(onSelect).toHaveBeenCalled()
    const payload = onSelect.mock.calls.at(-1)?.[0]
    expect(Array.isArray(payload)).toBe(true)
  })

  it('range 모드에서 클릭/키보드 범위 확정 및 월 변경 콜백이 동작한다', async () => {
    const onSelect = vi.fn()
    const onMonthChange = vi.fn()

    const { container } = render(
      <Calendar
        mode="range"
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2030-12-31')}
        onSelect={onSelect}
        onMonthChange={onMonthChange}
        allowRangePreview
      />,
    )

    await waitFor(() => expect(onMonthChange).toHaveBeenCalled())

    const enabledCells = getEnabledGridCells(container)
    const first = enabledCells[0]
    const second = enabledCells[1]
    if (!first || !second) throw new Error('range 테스트에 필요한 날짜 셀이 부족합니다.')

    fireEvent.click(first)
    fireEvent.click(second)

    const grid = getGrid(container)
    fireEvent.keyDown(grid, { key: 'Enter' })
    fireEvent.keyDown(grid, { key: 'Enter' })

    expect(onSelect).toHaveBeenCalled()
    const payload = onSelect.mock.calls.at(-1)?.[0] as CalendarRangeValue
    expect(payload.start).not.toBeNull()
    expect(payload.end).not.toBeNull()
  })
})
