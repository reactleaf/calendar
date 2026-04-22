import { Temporal } from '@js-temporal/polyfill'
import type { CalendarMode, CalendarRangeValue, DateValue } from '../core/api.types'
import { toPlainDate } from '../core/calendarDate'
import type { CalendarDayCellState } from './Calendar.DayCell'
import type { CalendarSelectionSnapshot } from './Calendar.types'

export interface RangeRenderInfo {
  committedStartKey: string | null
  committedEndKey: string | null
  committedLo: string | null
  committedHi: string | null
  renderStartKey: string | null
  renderEndKey: string | null
  previewLo: string | null
  previewHi: string | null
  previewActive: boolean
}

export interface MonthRowRenderInfo {
  singleSelectedDayKey: string | null
  multiplePrimaryDayKey: string | null
  multipleSelectedDayKeys: Set<string> | null
  range: RangeRenderInfo | null
}

export type CalendarDayComputedState = Omit<CalendarDayCellState, 'isDisabled' | 'cellIndex'>

function toValueDayKey(value: DateValue | null | undefined): string | null {
  return value ? toPlainDate(value).toString() : null
}

function orderDayKeys(a: string | null, b: string | null): [string | null, string | null] {
  if (a === null || b === null) return [null, null]
  return a <= b ? [a, b] : [b, a]
}

function buildRangeRenderInfo(
  mode: CalendarMode,
  selectionSnapshot: CalendarSelectionSnapshot,
  rangeHeaderValue: CalendarRangeValue | undefined,
  rangeHeaderPreviewActive: boolean | undefined,
): RangeRenderInfo | null {
  if (mode !== 'range' || selectionSnapshot.mode !== 'range') return null

  const committedStartKey = toValueDayKey(selectionSnapshot.value.start)
  const committedEndKey = toValueDayKey(selectionSnapshot.value.end)
  const [committedLo, committedHi] = orderDayKeys(committedStartKey, committedEndKey)
  const renderStartKey = toValueDayKey(rangeHeaderValue?.start)
  const renderEndKey = toValueDayKey(rangeHeaderValue?.end)
  const previewActive = rangeHeaderPreviewActive === true
  const [previewLo, previewHi] = previewActive ? orderDayKeys(renderStartKey, renderEndKey) : [null, null]

  return {
    committedStartKey,
    committedEndKey,
    committedLo,
    committedHi,
    renderStartKey,
    renderEndKey,
    previewLo,
    previewHi,
    previewActive,
  }
}

export function buildMonthRowRenderInfo(
  mode: CalendarMode,
  selectionSnapshot: CalendarSelectionSnapshot,
  rangeHeaderValue: CalendarRangeValue | undefined,
  rangeHeaderPreviewActive: boolean | undefined,
): MonthRowRenderInfo {
  return {
    singleSelectedDayKey: selectionSnapshot.mode === 'single' ? toValueDayKey(selectionSnapshot.value) : null,
    multiplePrimaryDayKey:
      selectionSnapshot.mode === 'multiple' && selectionSnapshot.primaryPlainDate !== null
        ? selectionSnapshot.primaryPlainDate.toString()
        : null,
    multipleSelectedDayKeys:
      selectionSnapshot.mode === 'multiple'
        ? new Set(selectionSnapshot.values.map((value) => toPlainDate(value).toString()))
        : null,
    range: buildRangeRenderInfo(mode, selectionSnapshot, rangeHeaderValue, rangeHeaderPreviewActive),
  }
}

function isSelectedDay(mode: CalendarMode, dayKey: string, info: MonthRowRenderInfo): boolean {
  if (mode === 'single') return info.singleSelectedDayKey === dayKey
  if (mode === 'multiple') return info.multipleSelectedDayKeys?.has(dayKey) ?? false
  return (
    info.range !== null &&
    info.range.previewActive !== true &&
    info.range.committedLo !== null &&
    info.range.committedHi !== null &&
    dayKey >= info.range.committedLo &&
    dayKey <= info.range.committedHi
  )
}

function isRangeStartDay(mode: CalendarMode, dayKey: string, info: MonthRowRenderInfo): boolean {
  if (mode !== 'range' || info.range === null) return false
  return dayKey === (info.range.previewActive ? info.range.renderStartKey : info.range.committedStartKey)
}

function isRangeEndDay(mode: CalendarMode, dayKey: string, info: MonthRowRenderInfo): boolean {
  if (mode !== 'range' || info.range === null) return false
  return dayKey === (info.range.previewActive ? info.range.renderEndKey : info.range.committedEndKey)
}

function isPreviewDay(mode: CalendarMode, dayKey: string, info: MonthRowRenderInfo): boolean {
  return (
    mode === 'range' &&
    info.range !== null &&
    info.range.previewLo !== null &&
    info.range.previewHi !== null &&
    dayKey >= info.range.previewLo &&
    dayKey <= info.range.previewHi
  )
}

export function calculateCellState(
  mode: CalendarMode,
  date: Temporal.PlainDate,
  today: Temporal.PlainDate,
  focusedDayKey: string,
  info: MonthRowRenderInfo,
): CalendarDayComputedState {
  const dayKey = date.toString()
  const isFirstOfMonth = date.day === 1

  return {
    dayKey,
    isFocused: dayKey === focusedDayKey,
    isSelected: isSelectedDay(mode, dayKey, info),
    isToday: dayKey === today.toString(),
    isRangeStartDate: isRangeStartDay(mode, dayKey, info),
    isRangeEndDate: isRangeEndDay(mode, dayKey, info),
    isInPreview: isPreviewDay(mode, dayKey, info),
    isMultiplePrimaryEdit: mode === 'multiple' && info.multiplePrimaryDayKey === dayKey,
    isFirstOfMonth,
    showYear: isFirstOfMonth && date.year !== today.year,
    year: date.year,
    dayOfMonth: date.day,
  }
}
