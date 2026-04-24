export type ItemSizeGetter = (index: number) => number
export type Align = 'start' | 'center' | 'end' | 'auto'

export interface ItemSizeAndPosition {
  size: number
  offset: number
}

export interface VisibleRange {
  start: number
  stop: number
}

export interface SizeAndPositionManagerOptions {
  itemCount: number
  itemSizeGetter: ItemSizeGetter
  estimatedItemSize: number
}

export class SizeAndPositionManager {
  private itemSizeGetter: ItemSizeGetter
  private itemCount: number
  private estimatedItemSize: number
  private itemSizeAndPositionData: Record<number, ItemSizeAndPosition> = {}
  private lastMeasuredIndex = -1

  constructor({ itemCount, itemSizeGetter, estimatedItemSize }: SizeAndPositionManagerOptions) {
    this.itemCount = itemCount
    this.itemSizeGetter = itemSizeGetter
    this.estimatedItemSize = estimatedItemSize
  }

  getSizeAndPositionForIndex(index: number): ItemSizeAndPosition {
    if (index < 0 || index >= this.itemCount) {
      throw new Error(`SizeAndPositionManager: index ${index} out of range (count=${this.itemCount})`)
    }

    if (index > this.lastMeasuredIndex) {
      const last = this.getSizeAndPositionOfLastMeasuredItem()
      let offset = last.offset + last.size

      for (let i = this.lastMeasuredIndex + 1; i <= index; i += 1) {
        const size = this.itemSizeGetter(i)
        if (!Number.isFinite(size)) {
          throw new Error(`SizeAndPositionManager: invalid size ${size} at index ${i}`)
        }
        this.itemSizeAndPositionData[i] = { offset, size }
        offset += size
      }

      this.lastMeasuredIndex = index
    }

    return this.itemSizeAndPositionData[index] as ItemSizeAndPosition
  }

  getSizeAndPositionOfLastMeasuredItem(): ItemSizeAndPosition {
    if (this.lastMeasuredIndex < 0) return { offset: 0, size: 0 }
    return this.itemSizeAndPositionData[this.lastMeasuredIndex] ?? { offset: 0, size: 0 }
  }

  getTotalSize(): number {
    const last = this.getSizeAndPositionOfLastMeasuredItem()
    return last.offset + last.size + (this.itemCount - this.lastMeasuredIndex - 1) * this.estimatedItemSize
  }

  getUpdatedOffsetForIndex({
    align = 'auto',
    containerSize,
    currentOffset,
    targetIndex,
  }: {
    align?: Align
    containerSize: number
    currentOffset: number
    targetIndex: number
  }): number {
    if (containerSize <= 0) return 0

    const datum = this.getSizeAndPositionForIndex(targetIndex)
    const maxOffset = datum.offset
    const minOffset = datum.offset - containerSize + datum.size

    let idealOffset: number
    switch (align) {
      case 'end':
        idealOffset = minOffset
        break
      case 'center':
        idealOffset = maxOffset - (containerSize - datum.size) / 2
        break
      case 'start':
        idealOffset = maxOffset
        break
      case 'auto':
      default:
        if (currentOffset >= minOffset && currentOffset <= maxOffset) {
          idealOffset = currentOffset
        } else if (currentOffset < minOffset) {
          idealOffset = minOffset
        } else {
          idealOffset = maxOffset
        }
        break
    }

    const totalSize = this.getTotalSize()
    return Math.max(0, Math.min(totalSize - containerSize, idealOffset))
  }

  getVisibleRange({
    containerSize,
    offset,
    overscanCount,
  }: {
    containerSize: number
    offset: number
    overscanCount: number
  }): VisibleRange {
    const totalSize = this.getTotalSize()
    if (totalSize === 0 || containerSize <= 0) return { start: -1, stop: -1 }

    const maxOffset = offset + containerSize
    let start = this.findNearestItem(offset)
    if (start === undefined) return { start: -1, stop: -1 }

    const datum = this.getSizeAndPositionForIndex(start)
    offset = datum.offset + datum.size

    let stop = start
    while (offset < maxOffset && stop < this.itemCount - 1) {
      stop += 1
      offset += this.getSizeAndPositionForIndex(stop).size
    }

    if (overscanCount > 0) {
      start = Math.max(0, start - overscanCount)
      stop = Math.min(this.itemCount - 1, stop + overscanCount)
    }

    return { start, stop }
  }

  private findNearestItem(offset: number): number | undefined {
    if (Number.isNaN(offset)) {
      throw new Error('SizeAndPositionManager: findNearestItem received NaN offset')
    }
    offset = Math.max(0, offset)

    const lastMeasured = this.getSizeAndPositionOfLastMeasuredItem()
    const lastMeasuredIndex = Math.max(0, this.lastMeasuredIndex)

    if (lastMeasured.offset >= offset) {
      return this.binarySearch({ high: lastMeasuredIndex, low: 0, offset })
    }
    return this.exponentialSearch({ index: lastMeasuredIndex, offset })
  }

  private binarySearch({ low, high, offset }: { low: number; high: number; offset: number }): number {
    while (low <= high) {
      const middle = low + Math.floor((high - low) / 2)
      const currentOffset = this.getSizeAndPositionForIndex(middle).offset
      if (currentOffset === offset) return middle
      if (currentOffset < offset) low = middle + 1
      else high = middle - 1
    }
    return low > 0 ? low - 1 : 0
  }

  private exponentialSearch({ index, offset }: { index: number; offset: number }): number {
    let interval = 1
    while (index < this.itemCount && this.getSizeAndPositionForIndex(index).offset < offset) {
      index += interval
      interval *= 2
    }
    return this.binarySearch({
      low: Math.floor(index / 2),
      high: Math.min(index, this.itemCount - 1),
      offset,
    })
  }
}
