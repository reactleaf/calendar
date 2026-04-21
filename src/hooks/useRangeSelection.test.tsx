import { Temporal } from '@js-temporal/polyfill'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CalendarRangeValue } from '../core/api.types'
import { useRangeSelection } from './useRangeSelection'

describe('useRangeSelection', () => {
  it('두 번째 클릭에서 범위를 확정하고 onSelect를 한 번 호출한다', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useRangeSelection({ onSelect }))

    const a = Temporal.PlainDate.from('2024-06-05')
    const b = Temporal.PlainDate.from('2024-06-01')

    act(() => {
      result.current.selectDate(a)
    })
    act(() => {
      result.current.selectDate(b)
    })

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(result.current.value.start).toEqual(b)
    expect(result.current.value.end).toEqual(a)
  })

  it('앵커 후 previewDate가 호버 범위를 반영하면 onRangePreview가 호출된다', () => {
    const onRangePreview = vi.fn()
    const { result } = renderHook(() =>
      useRangeSelection({
        onRangePreview,
      }),
    )

    const a = Temporal.PlainDate.from('2024-06-01')
    const b = Temporal.PlainDate.from('2024-06-10')

    act(() => {
      result.current.selectDate(a)
    })

    onRangePreview.mockClear()

    act(() => {
      result.current.previewDate(b)
    })

    expect(onRangePreview).toHaveBeenCalled()
    const last = onRangePreview.mock.calls.at(-1)?.[0] as CalendarRangeValue | null
    expect(last?.start).toEqual(a)
    expect(last?.end).toEqual(b)
  })

  it('확정 범위가 있을 때 새 앵커를 잡으면 확정 하이라이트를 숨기고 preview만 반영한다', () => {
    const initial: CalendarRangeValue = {
      start: Temporal.PlainDate.from('2024-01-01'),
      end: Temporal.PlainDate.from('2024-01-05'),
    }
    const { result } = renderHook(() => useRangeSelection({ defaultValue: initial }))

    const midOld = Temporal.PlainDate.from('2024-01-03')
    expect(result.current.isSelected(midOld)).toBe(true)

    const anchor = Temporal.PlainDate.from('2024-06-10')
    act(() => {
      result.current.selectDate(anchor)
    })

    expect(result.current.isSelected(midOld)).toBe(false)
    expect(result.current.isInPreviewRange(anchor)).toBe(true)
    expect(result.current.isRangeStart(anchor)).toBe(true)
    expect(result.current.isRangeEnd(anchor)).toBe(true)
  })

  it('제어 모드에서 value가 바뀌면 진행 중 포인터가 초기화된다', () => {
    const v1: CalendarRangeValue = {
      start: Temporal.PlainDate.from('2024-01-01'),
      end: Temporal.PlainDate.from('2024-01-02'),
    }
    const v2: CalendarRangeValue = {
      start: Temporal.PlainDate.from('2024-02-01'),
      end: Temporal.PlainDate.from('2024-02-02'),
    }

    const onSelect = vi.fn()
    const { result, rerender } = renderHook(
      ({ value }: { value: CalendarRangeValue }) => useRangeSelection({ value, onSelect }),
      { initialProps: { value: v1 } },
    )

    act(() => {
      result.current.selectDate(Temporal.PlainDate.from('2024-06-01'))
    })

    onSelect.mockClear()
    rerender({ value: v2 })

    const p1 = Temporal.PlainDate.from('2024-03-01')
    const p2 = Temporal.PlainDate.from('2024-03-05')

    act(() => {
      result.current.selectDate(p1)
    })
    act(() => {
      result.current.selectDate(p2)
    })

    expect(onSelect).toHaveBeenCalledTimes(1)
    const committed = onSelect.mock.calls[0]?.[0] as CalendarRangeValue
    expect(committed.start).toEqual(p1)
    expect(committed.end).toEqual(p2)
  })
})
