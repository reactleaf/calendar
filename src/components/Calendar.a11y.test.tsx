import { Temporal } from '@js-temporal/polyfill'
import { fireEvent, render, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeAll, describe, expect, it } from 'vitest'

import Calendar from '../Calendar'

/**
 * Phase 5-1 하이브리드 ARIA 계약 회귀 테스트.
 *
 * 목표는 "roving tabindex 없이도 스크린리더가 가상 커서 이동을 인지" 다.
 * - scroll container 1 개만 tabstop (`role="grid"`, `aria-activedescendant`)
 * - 주별 `<ul>` 은 `role="row"`
 * - 날짜 셀 `<button>` 은 고유 id + `aria-selected`
 *
 * 실제 DOM focus 는 절대 개별 날짜 버튼으로 이동하지 않는다. 이 규약이 깨지면
 * 가상화된 월 섹션 언마운트와 충돌해 focus lost 가 발생할 수 있다.
 */

function getGrid(container: HTMLElement): HTMLElement {
  const grid = container.querySelector('[role="grid"]')
  if (!(grid instanceof HTMLElement)) throw new Error('role=grid 요소를 찾지 못했습니다.')
  return grid
}

async function waitForDayCells(container: HTMLElement) {
  await waitFor(() => {
    const any = container.querySelector('button.calendar__day:not([disabled])')
    if (!any) throw new Error('아직 활성 날짜 셀이 없습니다.')
  })
}

beforeAll(() => {
  if (!HTMLElement.prototype.scrollTo) {
    HTMLElement.prototype.scrollTo = function scrollToPolyfill() {}
  }
})

describe('Calendar grid ARIA (Phase 5-1 하이브리드)', () => {
  it('scroll container 는 role="grid" 와 aria-label 을 가진다', async () => {
    const { container } = render(
      <Calendar
        mode="single"
        defaultValue={Temporal.PlainDate.from('2024-05-10')}
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2030-12-31')}
      />,
    )

    const grid = getGrid(container)
    expect(grid.getAttribute('role')).toBe('grid')
    expect(grid.getAttribute('aria-label')).toBeTruthy()
  })

  it('클릭한 셀의 id 가 aria-activedescendant 에 반영된다', async () => {
    // jsdom 의 virtualizer 는 초기에 today 가 viewport 밖일 수 있어
    // 실제로 DOM 에 존재하는 셀을 클릭해서 focusedDate 를 강제 동기화한 뒤 검증한다.
    const { container } = render(
      <Calendar
        mode="single"
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2030-12-31')}
      />,
    )

    const grid = getGrid(container)
    await waitForDayCells(container)

    const firstEnabled = Array.from(container.querySelectorAll('button.calendar__day')).find(
      (node): node is HTMLButtonElement => node instanceof HTMLButtonElement && !node.disabled,
    )
    if (!firstEnabled) throw new Error('활성 셀을 찾지 못했습니다.')
    expect(firstEnabled.id).toBeTruthy()

    fireEvent.click(firstEnabled)

    await waitFor(() => {
      expect(grid.getAttribute('aria-activedescendant')).toBe(firstEnabled.id)
    })
  })

  it('화살표 키 이동 시 aria-activedescendant 가 업데이트된다', async () => {
    const { container } = render(
      <Calendar
        mode="single"
        defaultValue={Temporal.PlainDate.from('2024-05-10')}
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2030-12-31')}
      />,
    )

    const grid = getGrid(container)
    await waitForDayCells(container)

    const before = grid.getAttribute('aria-activedescendant')
    expect(before).toBeTruthy()

    fireEvent.keyDown(grid, { key: 'ArrowRight' })

    await waitFor(() => {
      const after = grid.getAttribute('aria-activedescendant')
      expect(after).toBeTruthy()
      expect(after).not.toBe(before)
    })
  })

  it('DOM focus 는 개별 셀이 아닌 scroll container 에만 머무른다', async () => {
    const { container } = render(
      <Calendar
        mode="single"
        defaultValue={Temporal.PlainDate.from('2024-05-10')}
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2030-12-31')}
      />,
    )

    const grid = getGrid(container)
    await waitForDayCells(container)
    grid.focus()
    expect(document.activeElement).toBe(grid)

    fireEvent.keyDown(grid, { key: 'ArrowDown' })
    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    fireEvent.keyDown(grid, { key: 'ArrowUp' })
    // 화살표 이동 후에도 실제 포커스는 grid 에 고정
    expect(document.activeElement).toBe(grid)
  })

  it('주별 <ul> 은 role="row" 를 가진다', async () => {
    const { container } = render(
      <Calendar
        mode="single"
        defaultValue={Temporal.PlainDate.from('2024-05-10')}
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2030-12-31')}
      />,
    )

    await waitForDayCells(container)
    const rows = container.querySelectorAll('[role="row"]')
    expect(rows.length).toBeGreaterThan(0)
  })

  it('날짜 셀 <button> 은 aria-pressed 가 아닌 aria-selected 를 사용한다', async () => {
    const { container } = render(
      <Calendar
        mode="single"
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2030-12-31')}
      />,
    )

    await waitForDayCells(container)
    const dayButtons = container.querySelectorAll('button.calendar__day')
    expect(dayButtons.length).toBeGreaterThan(0)

    for (const btn of Array.from(dayButtons)) {
      expect(btn.hasAttribute('aria-pressed')).toBe(false)
      expect(btn.hasAttribute('aria-selected')).toBe(true)
      expect(btn.getAttribute('aria-selected')).toBe('false')
    }

    // 실제 선택 동작 후 aria-selected=true 가 반영되는지 확인
    const firstEnabled = Array.from(dayButtons).find(
      (node): node is HTMLButtonElement => node instanceof HTMLButtonElement && !node.disabled,
    )
    if (!firstEnabled) throw new Error('활성 셀을 찾지 못했습니다.')
    const date = firstEnabled.dataset.date
    if (date === undefined) throw new Error('data-date 없음')
    fireEvent.click(firstEnabled)

    await waitFor(() => {
      const updated = container.querySelector(`button.calendar__day[data-date="${date}"]`)
      expect(updated?.getAttribute('aria-selected')).toBe('true')
    })
  })

  it('gridcell 역할은 <li> 에 부여된다', async () => {
    const { container } = render(
      <Calendar
        mode="single"
        defaultValue={Temporal.PlainDate.from('2024-05-10')}
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2030-12-31')}
      />,
    )

    await waitForDayCells(container)
    const cells = container.querySelectorAll('li[role="gridcell"]')
    expect(cells.length).toBeGreaterThan(0)
  })
})
