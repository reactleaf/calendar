import { Temporal } from '@js-temporal/polyfill'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useMultipleSelection } from './useMultipleSelection'

describe('useMultipleSelection', () => {
  it('토글로 날짜를 추가·제거한다', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useMultipleSelection({ onSelect }))

    const a = Temporal.PlainDate.from('2024-06-01')
    const b = Temporal.PlainDate.from('2024-06-02')

    act(() => {
      result.current.toggleDate(a)
    })
    expect(result.current.value).toEqual([a])
    expect(onSelect).toHaveBeenLastCalledWith([a])

    act(() => {
      result.current.toggleDate(b)
    })
    expect(result.current.value).toEqual([a, b])

    act(() => {
      result.current.toggleDate(a)
    })
    expect(result.current.value).toEqual([b])
  })
})
