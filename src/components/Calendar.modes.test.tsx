import { Temporal } from '@js-temporal/polyfill'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { CalendarRangeValue } from '../core/api.types'
import { Calendar } from '../Calendar'

function getGrid(container: HTMLElement): HTMLElement {
  const grid = container.querySelector('.calendar__scroll')
  if (!(grid instanceof HTMLElement)) throw new Error('grid 요소를 찾지 못했습니다.')
  return grid
}

function getEnabledGridCells(container: HTMLElement): HTMLElement[] {
  const cells = Array.from(container.querySelectorAll('button.calendar__day')).filter(
    (node): node is HTMLElement => node instanceof HTMLElement && !node.hasAttribute('disabled'),
  )
  return cells
}

function getFirstEnabledGridCell(container: HTMLElement): HTMLElement {
  const button = getEnabledGridCells(container)[0]
  if (!button) throw new Error('활성화된 날짜 셀을 찾지 못했습니다.')
  return button
}

async function waitForVisibleDayCells(container: HTMLElement) {
  await waitFor(() => expect(getEnabledGridCells(container).length).toBeGreaterThan(0))
}

function findDayButton(container: HTMLElement, dayOfMonth: number): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button.calendar__day')).find((b) => {
    const plain = b.querySelector('.calendar__dayNumber')
    const inSelection = b.querySelector('.calendar__daySelectionDay')
    const text = plain?.textContent ?? inSelection?.textContent
    return text === String(dayOfMonth)
  }) as HTMLButtonElement | undefined
}

beforeAll(() => {
  if (!HTMLElement.prototype.scrollTo) {
    HTMLElement.prototype.scrollTo = function scrollToPolyfill() {}
  }
})

describe('Calendar preset mode integration', () => {
  it('days 뷰에서 오늘이 스크롤 밖이면 Today 버튼이 노출된다', async () => {
    const { container } = render(
      <Calendar
        mode="single"
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2030-12-31')}
      />,
    )
    await waitForVisibleDayCells(container)
    const grid = getGrid(container)
    grid.scrollTop = 0
    fireEvent.scroll(grid)
    await waitFor(() => {
      const btn = container.querySelector('.calendar__todayButton')
      expect(btn).toBeInstanceOf(HTMLButtonElement)
    })
    expect(container.querySelector('.calendar__todayChevron--down')).toBeTruthy()
  })

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
    await waitForVisibleDayCells(container)

    fireEvent.click(getFirstEnabledGridCell(container))
    const grid = getGrid(container)
    fireEvent.keyDown(grid, { key: 'Enter' })

    expect(onSelect).toHaveBeenCalled()
    const last = onSelect.mock.calls.at(-1)?.[0]
    expect(last).toBeInstanceOf(Temporal.PlainDate)
  })

  it('isDateDisabled가 true인 날은 버튼이 비활성이고 클릭해도 onSelect가 호출되지 않는다', async () => {
    const onSelect = vi.fn()
    const { container } = render(
      <Calendar
        mode="single"
        defaultValue={Temporal.PlainDate.from('2026-04-10')}
        minDate={Temporal.PlainDate.from('2026-04-01')}
        maxDate={Temporal.PlainDate.from('2026-04-30')}
        isDateDisabled={(d) => d.equals(Temporal.PlainDate.from('2026-04-15'))}
        onSelect={onSelect}
      />,
    )

    await waitForVisibleDayCells(container)

    const day15 = findDayButton(container, 15)
    expect(day15).toBeDefined()
    expect(day15?.disabled).toBe(true)

    const day16 = findDayButton(container, 16)
    expect(day16).toBeDefined()
    expect(day16?.disabled).toBe(false)

    fireEvent.click(day15!)
    expect(onSelect).not.toHaveBeenCalled()

    fireEvent.click(day16!)
    expect(onSelect).toHaveBeenCalled()
  })

  it('single 모드에서 화살표 이동은 가상 하이라이트를 이동하고 Space/Enter로 선택한다', async () => {
    const onSelect = vi.fn()
    const { container } = render(
      <Calendar
        mode="single"
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2030-12-31')}
        onSelect={onSelect}
      />,
    )

    const grid = getGrid(container)
    await waitForVisibleDayCells(container)
    grid.focus()
    expect(document.activeElement).toBe(grid)

    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(grid)

    fireEvent.keyDown(grid, { key: ' ' })
    fireEvent.keyDown(grid, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  it('각 월 1일은 월 라벨을 보이고 현재 연도와 다르면 연도도 보인다', async () => {
    const { container } = render(
      <Calendar
        mode="single"
        defaultValue={Temporal.PlainDate.from('2020-01-15')}
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2020-12-31')}
      />,
    )

    await waitForVisibleDayCells(container)

    await waitFor(() => {
      const withYear = Array.from(container.querySelectorAll('button.calendar__day')).find(
        (b) => b.querySelector('.calendar__dayYear')?.textContent === '2020',
      )
      expect(withYear).toBeTruthy()
      expect(withYear?.querySelector('.calendar__dayMonth')).toBeTruthy()
    })
  })

  it('multiple 모드에서 2개 이상 선택 시 +N 칩으로 전체 목록 패널을 연다', async () => {
    const { container } = render(
      <Calendar
        mode="multiple"
        value={[
          Temporal.PlainDate.from('2026-04-10'),
          Temporal.PlainDate.from('2026-04-12'),
          Temporal.PlainDate.from('2026-04-18'),
        ]}
        minDate={Temporal.PlainDate.from('2026-04-01')}
        maxDate={Temporal.PlainDate.from('2026-04-30')}
      />,
    )

    await waitForVisibleDayCells(container)

    const chip = container.querySelector('.calendar__headerMultipleMore')
    expect(chip).toBeInstanceOf(HTMLButtonElement)
    expect(chip?.textContent?.trim()).toBe('+2')

    fireEvent.click(chip as HTMLButtonElement)

    await waitFor(() => {
      expect(container.querySelector('.calendar__headerMultiplePopover')).toBeTruthy()
    })
    expect(container.querySelectorAll('.calendar__headerMultipleListButton').length).toBe(3)
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
    await waitForVisibleDayCells(container)

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
    await waitForVisibleDayCells(container)

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
