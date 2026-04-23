import { Temporal } from '@js-temporal/polyfill'
import type { CalendarMode, CalendarRangeValue } from '../../core/api.types'
import { toPlainDate } from '../../core/calendarDate'
import type { CalendarSelectionSnapshot } from '../Calendar.types'

export interface RangeRenderInfo {
  committedStartDate: string | null
  committedEndDate: string | null
  committedLo: string | null
  committedHi: string | null
  renderStartDate: string | null
  renderEndDate: string | null
  previewLo: string | null
  previewHi: string | null
  previewActive: boolean
}

export interface MonthRowRenderInfo {
  singleSelectedDate: string | null
  multiplePrimaryDate: string | null
  multipleSelectedDates: Set<string> | null
  range: RangeRenderInfo | null
}

export interface CalendarDaySelectionState {
  isSelected: boolean
  isRangeStartDate: boolean
  isRangeEndDate: boolean
  isInPreview: boolean
  isMultiplePrimaryEdit: boolean
}

function toDateString(value: Temporal.PlainDate | null | undefined): string | null {
  return value ? value.toString() : null
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

  const committedStartDate = toDateString(selectionSnapshot.plain.start)
  const committedEndDate = toDateString(selectionSnapshot.plain.end)
  const [committedLo, committedHi] = orderDayKeys(committedStartDate, committedEndDate)
  const renderStartDate = rangeHeaderValue?.start ? toPlainDate(rangeHeaderValue.start).toString() : committedStartDate
  const renderEndDate = rangeHeaderValue?.end ? toPlainDate(rangeHeaderValue.end).toString() : committedEndDate
  const previewActive = rangeHeaderPreviewActive === true
  const [previewLo, previewHi] = previewActive ? orderDayKeys(renderStartDate, renderEndDate) : [null, null]

  return {
    committedStartDate,
    committedEndDate,
    committedLo,
    committedHi,
    renderStartDate,
    renderEndDate,
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
    singleSelectedDate: selectionSnapshot.mode === 'single' ? toDateString(selectionSnapshot.plain.value) : null,
    multiplePrimaryDate:
      selectionSnapshot.mode === 'multiple' && selectionSnapshot.plain.primary !== null
        ? selectionSnapshot.plain.primary.toString()
        : null,
    multipleSelectedDates:
      selectionSnapshot.mode === 'multiple'
        ? new Set(selectionSnapshot.plain.values.map((value) => value.toString()))
        : null,
    range: buildRangeRenderInfo(mode, selectionSnapshot, rangeHeaderValue, rangeHeaderPreviewActive),
  }
}

function isSelectedDate(mode: CalendarMode, date: string, info: MonthRowRenderInfo): boolean {
  if (mode === 'single') return info.singleSelectedDate === date
  if (mode === 'multiple') return info.multipleSelectedDates?.has(date) ?? false
  return (
    info.range !== null &&
    info.range.previewActive !== true &&
    info.range.committedLo !== null &&
    info.range.committedHi !== null &&
    date >= info.range.committedLo &&
    date <= info.range.committedHi
  )
}

function isRangeStartDate(mode: CalendarMode, date: string, info: MonthRowRenderInfo): boolean {
  if (mode !== 'range' || info.range === null) return false
  return date === (info.range.previewActive ? info.range.renderStartDate : info.range.committedStartDate)
}

function isRangeEndDate(mode: CalendarMode, date: string, info: MonthRowRenderInfo): boolean {
  if (mode !== 'range' || info.range === null) return false
  return date === (info.range.previewActive ? info.range.renderEndDate : info.range.committedEndDate)
}

function isPreviewDate(mode: CalendarMode, date: string, info: MonthRowRenderInfo): boolean {
  return (
    mode === 'range' &&
    info.range !== null &&
    info.range.previewLo !== null &&
    info.range.previewHi !== null &&
    date >= info.range.previewLo &&
    date <= info.range.previewHi
  )
}

export function calculateCellState(
  mode: CalendarMode,
  date: string,
  info: MonthRowRenderInfo,
): CalendarDaySelectionState {
  return {
    isSelected: isSelectedDate(mode, date, info),
    isRangeStartDate: isRangeStartDate(mode, date, info),
    isRangeEndDate: isRangeEndDate(mode, date, info),
    isInPreview: isPreviewDate(mode, date, info),
    isMultiplePrimaryEdit: mode === 'multiple' && info.multiplePrimaryDate === date,
  }
}
