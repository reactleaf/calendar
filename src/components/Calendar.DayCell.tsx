import type { MouseEvent } from 'react'
import { memo } from 'react'
import type { CalendarMode } from '../core/api.types'

export interface CalendarDayCellProps {
  mode: CalendarMode
  dayStamp: number
  monthShort: string
  focusedDateStamp: number
  isSelected: boolean
  isDisabled: boolean
  isToday: boolean
  isRangeStartDate: boolean
  isRangeEndDate: boolean
  isInPreview: boolean
  isFirstOfMonth: boolean
  showYear: boolean
  year: number
  dayOfMonth: number
  cellIndex: number
  onDayMouseDown: (event: MouseEvent<HTMLButtonElement>) => void
  onDayClick: (event: MouseEvent<HTMLButtonElement>) => void
  /** range 프리뷰는 ModeBody에서 monthRows `mouseover` 위임으로 처리 — 미전달 시 리스너 없음 */
  onDayMouseEnter?: (event: MouseEvent<HTMLButtonElement>) => void
}

function buildDayClass(
  mode: CalendarMode,
  dayStamp: number,
  focusedDateStamp: number,
  isSelected: boolean,
  isToday: boolean,
  isRangeStartDate: boolean,
  isRangeEndDate: boolean,
  isInPreview: boolean,
): string {
  return [
    'calendar__day',
    dayStamp === focusedDateStamp ? 'calendar__day--focused' : '',
    isSelected ? 'calendar__day--selected' : '',
    isToday ? 'calendar__day--today' : '',
    mode === 'range' && isSelected && !isRangeStartDate && !isRangeEndDate ? 'calendar__day--inRange' : '',
    mode === 'range' && isInPreview && !isSelected ? 'calendar__day--inPreviewRange' : '',
    mode === 'range' && isRangeStartDate ? 'calendar__day--rangeStart' : '',
    mode === 'range' && isRangeEndDate ? 'calendar__day--rangeEnd' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function buildSelectionLayerClass(
  mode: CalendarMode,
  isSelected: boolean,
  isInPreview: boolean,
  isRangeStartDate: boolean,
  isRangeEndDate: boolean,
): string {
  const isPreviewOnly = isInPreview && !isSelected
  const shape =
    mode !== 'range'
      ? 'single'
      : isRangeStartDate && isRangeEndDate
        ? 'single'
        : isRangeStartDate
          ? 'start'
          : isRangeEndDate
            ? 'end'
            : 'between'

  return [
    'calendar__selectionLayer',
    isPreviewOnly ? 'calendar__selectionLayer--preview' : 'calendar__selectionLayer--selected',
    `calendar__selectionLayer--${shape}`,
  ]
    .filter(Boolean)
    .join(' ')
}

export const CalendarDayCell = memo(function CalendarDayCell({
  mode,
  dayStamp,
  monthShort,
  focusedDateStamp,
  isSelected,
  isDisabled,
  isToday,
  isRangeStartDate,
  isRangeEndDate,
  isInPreview,
  isFirstOfMonth,
  showYear,
  year,
  dayOfMonth,
  cellIndex,
  onDayMouseDown,
  onDayClick,
  onDayMouseEnter,
}: CalendarDayCellProps) {
  const selectionLayerActive = isSelected || (mode === 'range' && isInPreview)
  const dayClass = buildDayClass(
    mode,
    dayStamp,
    focusedDateStamp,
    isSelected,
    isToday,
    isRangeStartDate,
    isRangeEndDate,
    isInPreview,
  )
  const selectionLayerClass = selectionLayerActive
    ? buildSelectionLayerClass(mode, isSelected, isInPreview, isRangeStartDate, isRangeEndDate)
    : null

  return (
    <li className={`calendar__dayItem${cellIndex === 0 ? ' is-first' : ''}`}>
      <button
        type="button"
        className={dayClass}
        disabled={isDisabled}
        tabIndex={-1}
        aria-pressed={isSelected}
        data-day-stamp={String(dayStamp)}
        {...(isToday ? { 'aria-current': 'date' as const } : {})}
        onMouseDown={onDayMouseDown}
        {...(onDayMouseEnter ? { onMouseEnter: onDayMouseEnter } : {})}
        onClick={onDayClick}
      >
        {selectionLayerClass ? <span className={selectionLayerClass} aria-hidden="true" /> : null}
        {isFirstOfMonth ? <span className="calendar__dayMonth">{monthShort}</span> : null}
        <span className="calendar__dayNumber">{dayOfMonth}</span>
        {showYear ? <span className="calendar__dayYear">{year}</span> : null}
      </button>
    </li>
  )
})
