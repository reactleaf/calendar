import { describe, expect, it } from 'vitest'
import { SizeAndPositionManager } from './sizeAndPositionManager'

describe('SizeAndPositionManager', () => {
  it('measures item offsets lazily and estimates the unmeasured tail', () => {
    const sizes = [10, 20, 30, 40]
    const manager = new SizeAndPositionManager({
      itemCount: sizes.length,
      itemSizeGetter: (index) => sizes[index] ?? 0,
      estimatedItemSize: 25,
    })

    expect(manager.getTotalSize()).toBe(100)
    expect(manager.getSizeAndPositionForIndex(2)).toEqual({ offset: 30, size: 30 })
    expect(manager.getTotalSize()).toBe(85)
  })

  it('returns an overscanned visible range for the current offset', () => {
    const manager = new SizeAndPositionManager({
      itemCount: 6,
      itemSizeGetter: () => 10,
      estimatedItemSize: 10,
    })

    expect(manager.getVisibleRange({ containerSize: 20, offset: 20, overscanCount: 1 })).toEqual({
      start: 1,
      stop: 4,
    })
  })

  it('computes scroll offsets for start, center, end, and auto alignment', () => {
    const manager = new SizeAndPositionManager({
      itemCount: 5,
      itemSizeGetter: () => 20,
      estimatedItemSize: 20,
    })

    const base = {
      containerSize: 40,
      currentOffset: 0,
      targetIndex: 3,
    }

    expect(manager.getUpdatedOffsetForIndex({ ...base, align: 'start' })).toBe(60)
    expect(manager.getUpdatedOffsetForIndex({ ...base, align: 'center' })).toBe(50)
    expect(manager.getUpdatedOffsetForIndex({ ...base, align: 'end' })).toBe(40)
    expect(manager.getUpdatedOffsetForIndex({ ...base, currentOffset: 50, align: 'auto' })).toBe(50)
  })

  it('returns an empty range when the viewport cannot show items', () => {
    const manager = new SizeAndPositionManager({
      itemCount: 1,
      itemSizeGetter: () => 10,
      estimatedItemSize: 10,
    })

    expect(manager.getVisibleRange({ containerSize: 0, offset: 0, overscanCount: 1 })).toEqual({
      start: -1,
      stop: -1,
    })
  })
})
