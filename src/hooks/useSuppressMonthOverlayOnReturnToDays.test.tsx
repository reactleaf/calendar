import { act, renderHook } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { CalendarDisplayMode } from '../components/Calendar.types'
import { useSuppressMonthOverlayOnReturnToDays } from './useSuppressMonthOverlayOnReturnToDays'

function harness(initial: CalendarDisplayMode = 'days') {
  return function useHarness() {
    const [displayMode, setDisplayMode] = useState<CalendarDisplayMode>(initial)
    const overlaySuppressUntilRef = useRef(0)
    useSuppressMonthOverlayOnReturnToDays(displayMode, overlaySuppressUntilRef)
    return { displayMode, setDisplayMode, overlaySuppressUntilRef }
  }
}

describe('useSuppressMonthOverlayOnReturnToDays', () => {
  it('최초 days 에서는 억제 타임스탬프를 찍지 않는다', () => {
    const { result } = renderHook(harness('days'))
    expect(result.current.overlaySuppressUntilRef.current).toBe(0)
  })

  it('months → days 전환 시 억제 타임스탬프가 미래로 설정된다', () => {
    const { result } = renderHook(harness('months'))

    act(() => {
      result.current.setDisplayMode('days')
    })

    expect(result.current.overlaySuppressUntilRef.current).toBeGreaterThan(Date.now())
  })

  it('time → days 전환 시에도 억제 타임스탬프가 설정된다', () => {
    const { result } = renderHook(harness('time'))

    act(() => {
      result.current.setDisplayMode('days')
    })

    expect(result.current.overlaySuppressUntilRef.current).toBeGreaterThan(Date.now())
  })

  it('days 에 머무는 동안은 타임스탬프가 갱신되지 않는다', () => {
    const { result } = renderHook(harness('days'))
    const before = result.current.overlaySuppressUntilRef.current

    act(() => {
      result.current.setDisplayMode('days')
    })

    expect(result.current.overlaySuppressUntilRef.current).toBe(before)
  })
})
