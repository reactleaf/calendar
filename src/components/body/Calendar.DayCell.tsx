import type { Temporal } from '@js-temporal/polyfill'
import { clsx } from 'clsx'
import type { MouseEvent } from 'react'
import { memo } from 'react'
import type { CalendarMode } from '../../core/api.types'

export interface CalendarDayCellProps {
  mode: CalendarMode
  date: Temporal.PlainDate
  monthShort: string
  state: CalendarDayCellState
  /** `Intl.RelativeTimeFormat(...).format(0,'day')` — 선택 셀 상단에 월 대신 표시 */
  todayLabelShort: string
  /**
   * grid 당 stable prefix (DatePickerView 의 `useId()`). 각 셀 `<button>` 은
   * `${idPrefix}-day-${dayKey}` 형태의 id 를 가지며, DatePickerView 의
   * `aria-activedescendant` 타겟이 된다.
   */
  idPrefix: string
  legacyDayStamp?: number
  onDayClick: (date: Temporal.PlainDate) => void
  /** range 프리뷰는 month rows `mouseover` 위임으로 처리 — 미전달 시 리스너 없음 */
  onDayMouseEnter?: (event: MouseEvent<HTMLButtonElement>) => void
}

export interface CalendarDayCellState {
  dayKey: string
  isFocused: boolean
  isSelected: boolean
  isDisabled: boolean
  isToday: boolean
  isRangeStartDate: boolean
  isRangeEndDate: boolean
  isInPreview: boolean
  /** multiple: 헤더·시간 편집 중인 대표 일 — 그리드에서 추가 강조 */
  isMultiplePrimaryEdit?: boolean
  isFirstOfMonth: boolean
  showYear: boolean
  year: number
  dayOfMonth: number
  cellIndex: number
}

function buildDayClass(
  mode: CalendarMode,
  isFocused: boolean,
  isSelected: boolean,
  isToday: boolean,
  isRangeStartDate: boolean,
  isRangeEndDate: boolean,
  isInPreview: boolean,
  isMultiplePrimaryEdit: boolean,
): string {
  return clsx(
    'calendar__day',
    isFocused && 'calendar__day--focused',
    isSelected && 'calendar__day--selected',
    isToday && 'calendar__day--today',
    isMultiplePrimaryEdit && 'calendar__day--multiplePrimary',
    mode === 'range' && isSelected && !isRangeStartDate && !isRangeEndDate && 'calendar__day--inRange',
    mode === 'range' && isInPreview && !isSelected && 'calendar__day--inPreviewRange',
    mode === 'range' && isRangeStartDate && 'calendar__day--rangeStart',
    mode === 'range' && isRangeEndDate && 'calendar__day--rangeEnd',
  )
}

function getSelectionShape(
  mode: CalendarMode,
  isSelected: boolean,
  isInPreview: boolean,
  isRangeStartDate: boolean,
  isRangeEndDate: boolean,
): 'single' | 'start' | 'end' | 'between' | null {
  const layerActive = isSelected || (mode === 'range' && isInPreview)
  if (!layerActive) return null
  if (mode !== 'range') return 'single'
  if (isRangeStartDate && isRangeEndDate) return 'single'
  if (isRangeStartDate) return 'start'
  if (isRangeEndDate) return 'end'
  return 'between'
}

function buildSelectionLayerClass(
  mode: CalendarMode,
  isSelected: boolean,
  isInPreview: boolean,
  isRangeStartDate: boolean,
  isRangeEndDate: boolean,
  isMultiplePrimaryEdit: boolean,
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

  return clsx(
    'calendar__selectionLayer',
    isPreviewOnly ? 'calendar__selectionLayer--preview' : 'calendar__selectionLayer--selected',
    `calendar__selectionLayer--${shape}`,
    isMultiplePrimaryEdit && 'calendar__selectionLayer--multiplePrimary',
  )
}

/**
 * Lots of DayCell will be rendered.
 * Do not use contexts in this component.
 * Make this component as stateless as possible.
 */
export const CalendarDayCell = memo(function CalendarDayCell({
  mode,
  date,
  monthShort,
  state,
  todayLabelShort,
  idPrefix,
  legacyDayStamp,
  onDayClick,
  onDayMouseEnter,
}: CalendarDayCellProps) {
  const {
    dayKey,
    isFocused,
    isSelected,
    isDisabled,
    isToday,
    isRangeStartDate,
    isRangeEndDate,
    isInPreview,
    isMultiplePrimaryEdit = false,
    isFirstOfMonth,
    showYear,
    year,
    dayOfMonth,
    cellIndex,
  } = state
  const selectionLayerActive = isSelected || (mode === 'range' && isInPreview)
  const dayClass = buildDayClass(
    mode,
    isFocused,
    isSelected,
    isToday,
    isRangeStartDate,
    isRangeEndDate,
    isInPreview,
    isMultiplePrimaryEdit,
  )
  const selectionLayerClass = selectionLayerActive
    ? buildSelectionLayerClass(mode, isSelected, isInPreview, isRangeStartDate, isRangeEndDate, isMultiplePrimaryEdit)
    : null

  const selectionShape = getSelectionShape(mode, isSelected, isInPreview, isRangeStartDate, isRangeEndDate)
  const showSelectionStack = selectionLayerActive && selectionShape !== null && selectionShape !== 'between'
  const showBetweenDayOnly = selectionLayerActive && selectionShape === 'between'
  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }
  const handleClick = () => {
    onDayClick(date)
  }

  return (
    <li className={clsx('calendar__dayItem', cellIndex === 0 && 'is-first')} role="gridcell">
      <button
        type="button"
        id={`${idPrefix}-day-${dayKey}`}
        className={dayClass}
        disabled={isDisabled}
        tabIndex={-1}
        aria-selected={isSelected}
        data-day-stamp={legacyDayStamp !== undefined ? String(legacyDayStamp) : undefined}
        data-date={date.toString()}
        {...(isToday ? { 'aria-current': 'date' as const } : {})}
        onMouseDown={handleMouseDown}
        {...(onDayMouseEnter ? { onMouseEnter: onDayMouseEnter } : {})}
        onClick={handleClick}
      >
        {selectionLayerClass ? <span className={selectionLayerClass} aria-hidden="true" /> : null}
        {showBetweenDayOnly ? (
          <span className="calendar__daySelectionBetweenOnly">{dayOfMonth}</span>
        ) : showSelectionStack ? (
          <span className="calendar__daySelectionContent">
            <span className="calendar__daySelectionMonth">{isToday ? todayLabelShort : monthShort}</span>
            <span className="calendar__daySelectionDay">{dayOfMonth}</span>
          </span>
        ) : (
          <>
            {isFirstOfMonth ? <span className="calendar__dayMonth">{monthShort}</span> : null}
            <span className="calendar__dayNumber">{dayOfMonth}</span>
            {showYear ? <span className="calendar__dayYear">{year}</span> : null}
          </>
        )}
      </button>
    </li>
  )
})
