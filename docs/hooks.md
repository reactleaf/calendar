# Headless Hooks Draft 0

이 문서는 `Calendar` 구현에서 사용하는 headless hook 계약 초안이다.  
공개 컴포넌트 API는 `docs/api.md`를 우선 기준으로 삼고, 본 문서는 상태 머신/핸들러 계약을 고정하기 위한 목적이다.

## 공통 타입

```ts
type DateValue = Temporal.PlainDate | Temporal.PlainDateTime
type MonthValue = Temporal.PlainYearMonth
type CalendarMode = 'single' | 'multiple' | 'range'

interface CalendarRangeValue {
  start: DateValue | null
  end: DateValue | null
}
```

## 1) useCalendarState

달력의 뷰 상태(포커스/표시 월/탐색)를 관리한다.

```ts
interface UseCalendarStateOptions {
  mode: CalendarMode
  minDate?: DateValue
  maxDate?: DateValue
  initialFocusedDate?: DateValue | null
  initialVisibleMonth?: DateValue | null // month start를 권장
  keyboardNavigation?: boolean
  includeTime?: boolean
  minuteStep?: number
  onFocusedDateChange?: (date: DateValue | null) => void
  onMonthChange?: (monthStart: MonthValue) => void
}

interface UseCalendarStateResult {
  focusedDate: DateValue | null
  visibleMonth: DateValue
  setFocusedDate: (date: DateValue | null) => void
  setVisibleMonth: (monthStart: DateValue) => void
  focusNextDay: () => void
  focusPrevDay: () => void
  focusNextWeek: () => void
  focusPrevWeek: () => void
}

declare function useCalendarState(options: UseCalendarStateOptions): UseCalendarStateResult
```

핵심 규칙:

- `focusedDate`는 `minDate ~ maxDate` 범위를 벗어나지 않게 clamp한다.
- 월 변경은 `visibleMonth`를 month-start normalized 값으로 유지한다.

## 2) useSingleSelection

단일 날짜 선택 상태를 관리한다.

```ts
interface UseSingleSelectionOptions {
  value?: DateValue | null
  defaultValue?: DateValue | null
  disabled?: boolean
  minDate?: DateValue
  maxDate?: DateValue
  disabledDates?: DateValue[]
  disabledDays?: number[]
  includeTime?: boolean
  minuteStep?: number
  onSelect?: (next: DateValue | null) => void
}

interface UseSingleSelectionResult {
  value: DateValue | null
  isSelected: (date: DateValue) => boolean
  isDisabled: (date: DateValue) => boolean
  selectDate: (date: DateValue, source?: 'click' | 'keyboard') => void
  clear: () => void
}

declare function useSingleSelection(options: UseSingleSelectionOptions): UseSingleSelectionResult
```

핵심 규칙:

- disabled/min/max에 걸리는 날짜는 선택 무시.
- controlled(`value`)일 때 내부 상태를 source of truth로 사용하지 않는다.

## 3) useMultipleSelection

다중 선택 상태를 관리한다.

```ts
interface UseMultipleSelectionOptions {
  value?: DateValue[]
  defaultValue?: DateValue[]
  disabled?: boolean
  minDate?: DateValue
  maxDate?: DateValue
  disabledDates?: DateValue[]
  disabledDays?: number[]
  includeTime?: boolean
  minuteStep?: number
  maxSelections?: number
  onSelect?: (next: DateValue[]) => void
}

interface UseMultipleSelectionResult {
  value: DateValue[]
  isSelected: (date: DateValue) => boolean
  isDisabled: (date: DateValue) => boolean
  toggleDate: (date: DateValue, source?: 'click' | 'keyboard') => void
  clear: () => void
}

declare function useMultipleSelection(options: UseMultipleSelectionOptions): UseMultipleSelectionResult
```

핵심 규칙:

- 동일 날짜를 다시 선택하면 토글 제거.
- `maxSelections` 초과 정책은 Draft 0에서 `ignore-new`(신규 입력 무시)로 고정.

## 4) useRangeSelection

기간 선택 상태(시작/미리보기/완료)를 관리한다.

```ts
interface UseRangeSelectionOptions {
  value?: CalendarRangeValue
  defaultValue?: CalendarRangeValue
  disabled?: boolean
  minDate?: DateValue
  maxDate?: DateValue
  disabledDates?: DateValue[]
  disabledDays?: number[]
  includeTime?: boolean
  minuteStep?: number
  allowRangePreview?: boolean
  onSelect?: (next: CalendarRangeValue) => void
  onRangePreview?: (next: CalendarRangeValue | null) => void
}

interface UseRangeSelectionResult {
  value: CalendarRangeValue
  preview: CalendarRangeValue | null
  isSelected: (date: DateValue) => boolean
  isInPreviewRange: (date: DateValue) => boolean
  isRangeStart: (date: DateValue) => boolean
  isRangeEnd: (date: DateValue) => boolean
  isDisabled: (date: DateValue) => boolean
  selectDate: (date: DateValue, source?: 'click' | 'keyboard') => void
  previewDate: (date: DateValue, source?: 'hover' | 'keyboard') => void
  clear: () => void
}

declare function useRangeSelection(options: UseRangeSelectionOptions): UseRangeSelectionResult
```

핵심 규칙:

- `onSelect`는 **범위가 완료된 시점**(start/end 확정)에만 호출한다.
- 진행 중 상태(시작점만, 프리뷰 중)는 `onRangePreview`로만 알린다. 프리뷰 종료 시 `onRangePreview(null)`을 호출할 수 있다.
- 확정 시 `start > end`면 자동 정렬한다.

## 5) useCalendarKeyboard

키보드 탐색/선택 이벤트를 캡슐화한다.

```ts
interface UseCalendarKeyboardOptions {
  enabled?: boolean
  focusedDate: DateValue | null
  setFocusedDate: (date: DateValue | null) => void
  focusNextDay: () => void
  focusPrevDay: () => void
  focusNextWeek: () => void
  focusPrevWeek: () => void
  commitFocusedDate: (source?: 'keyboard') => void
}

interface UseCalendarKeyboardResult {
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
}

declare function useCalendarKeyboard(options: UseCalendarKeyboardOptions): UseCalendarKeyboardResult
```

기본 키 매핑:

- ArrowLeft/Right: -1/+1 day
- ArrowUp/Down: -7/+7 days
- Enter/Space: focused date 선택 확정
- Home/End: 주 시작/끝으로 이동 (후속 상세화)
- PageUp/PageDown: 월 단위 이동 (후속 상세화)

추가 시간 규칙:

- `includeTime`이 `true`면 hook은 `Temporal.PlainDateTime` 값을 다룬다.
- `minuteStep`은 minute UI/입력 보정에 사용하며 기본값은 `1`이다.
- `timePrecision` props는 지원하지 않으며 minute 고정이다.

## 6) 구현 순서 권장

1. `useCalendarState`
2. `useSingleSelection`
3. `useMultipleSelection`
4. `useRangeSelection`
5. `useCalendarKeyboard`

이 순서로 구현하면 range/keyboard가 공통 유틸과 상태를 재사용하기 쉽다.
