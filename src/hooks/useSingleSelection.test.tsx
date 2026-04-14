import { Temporal } from '@js-temporal/polyfill'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSingleSelection } from './useSingleSelection'

describe('useSingleSelection', () => {
  it('선택 시 onSelect를 호출하고 비제어 값을 갱신한다', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useSingleSelection({ onSelect }))

    const d = Temporal.PlainDate.from('2024-06-10')
    act(() => {
      result.current.selectDate(d)
    })

    expect(onSelect).toHaveBeenCalledWith(d)
    expect(result.current.value).toEqual(d)
    expect(result.current.isSelected(d)).toBe(true)
  })

  it('제어 모드에서는 부모 value가 바뀌기 전까지 표시 값이 고정된다', () => {
    const onSelect = vi.fn()
    const v = Temporal.PlainDate.from('2024-06-01')
    const { result, rerender } = renderHook(
      (props: { value: Temporal.PlainDate | null }) =>
        useSingleSelection({
          value: props.value,
          onSelect,
        }),
      { initialProps: { value: v } },
    )

    act(() => {
      result.current.selectDate(Temporal.PlainDate.from('2024-06-15'))
    })

    expect(onSelect).toHaveBeenCalled()
    expect(result.current.value).toEqual(v)

    const next = Temporal.PlainDate.from('2024-06-15')
    rerender({ value: next })
    expect(result.current.value).toEqual(next)
  })
})
