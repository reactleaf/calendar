import { Temporal } from '@js-temporal/polyfill'
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import Calendar from '../Calendar'
import { DEFAULT_CALENDAR_MESSAGES } from '../core/calendarLocale'

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
        defaultValue={Temporal.PlainDate.from('2026-04-15')}
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2030-12-31')}
      />,
    )

    await waitForDayCells(container)

    fireEvent.click(getByLabelText(DEFAULT_CALENDAR_MESSAGES.ariaOpenMonthPicker))
    await waitFor(() => {
      expect(container.querySelector('.calendar__monthPicker')).toBeTruthy()
    })

    fireEvent.click(getByLabelText(DEFAULT_CALENDAR_MESSAGES.ariaOpenDayGrid))

    await waitFor(() => {
      expect(container.querySelector('.calendar__monthPicker')).toBeNull()
    })
    await waitForDayCells(container)

    const scroll = getScroll(container)
    expect(scroll?.classList.contains('is-scrolling')).toBe(false)
  })

  it('이벤트 간 10px 이상 빠른 스크롤 중에는 day hover hit-test 를 100ms 동안 차단한다', async () => {
    const { container } = render(
      <Calendar
        mode="range"
        minDate={Temporal.PlainDate.from('2020-01-01')}
        maxDate={Temporal.PlainDate.from('2030-12-31')}
      />,
    )

    await waitForDayCells(container)
    const scroll = getScroll(container)
    expect(scroll).toBeTruthy()

    vi.useFakeTimers()
    try {
      scroll!.scrollTop = 0
      fireEvent.scroll(scroll!)
      scroll!.scrollTop = 10
      fireEvent.scroll(scroll!)

      expect(scroll!.classList.contains('is-fast-scrolling')).toBe(true)

      act(() => {
        vi.advanceTimersByTime(99)
      })
      expect(scroll!.classList.contains('is-fast-scrolling')).toBe(true)

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(scroll!.classList.contains('is-fast-scrolling')).toBe(false)

      act(() => {
        vi.runOnlyPendingTimers()
      })
    } finally {
      vi.useRealTimers()
    }
  })
})
