import { Temporal } from '@js-temporal/polyfill'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { Calendar } from '../Calendar'

function getScroll(container: HTMLElement): HTMLElement | null {
  return container.querySelector('.calendar__scroll')
}

beforeAll(() => {
  if (!HTMLElement.prototype.scrollTo) {
    HTMLElement.prototype.scrollTo = function scrollToPolyfill() {}
  }
})

async function waitForDayCells(container: HTMLElement) {
  await waitFor(() => {
    const any = container.querySelector('button.calendar__day:not([disabled])')
    if (!any) throw new Error('no day cell')
  })
}

describe('Calendar month overlay (isScrolling)', () => {
  it('일 그리드가 보일 때 첫 페인트 직후 scroll 에 is-scrolling 이 붙지 않는다', async () => {
    const { container } = render(
      <Calendar
        mode="single"
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2030-12-31')}
      />,
    )

    await waitForDayCells(container)
    const scroll = getScroll(container)
    expect(scroll).toBeTruthy()
    expect(scroll?.classList.contains('is-scrolling')).toBe(false)
  })

  it('월 피커를 열었다가 날짜 뷰로 돌아온 직후에도 is-scrolling 이 붙지 않는다', async () => {
    const { container, getByLabelText } = render(
      <Calendar
        mode="single"
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2030-12-31')}
      />,
    )

    await waitForDayCells(container)

    fireEvent.click(getByLabelText('월 선택 보기'))
    await waitFor(() => {
      expect(container.querySelector('.calendar__monthPicker')).toBeTruthy()
    })

    fireEvent.click(getByLabelText('날짜 선택 보기'))

    await waitFor(() => {
      expect(container.querySelector('.calendar__monthPicker')).toBeNull()
    })
    await waitForDayCells(container)

    const scroll = getScroll(container)
    expect(scroll?.classList.contains('is-scrolling')).toBe(false)
  })
})
