# Calendar API Draft 0

이 문서는 구현을 고정하기 위한 초안이다. 릴리즈 전 최종 API 문서에서 네이밍과 일부 세부 항목은 조정될 수 있다.

## 1) 공통 목표

- 하나의 공개 컴포넌트 `Calendar`를 제공한다.
- 선택 동작은 `mode`로 구분한다: `single | multiple | range`.
- `mode`에 따라 `value`, `defaultValue`, `onSelect` 타입이 달라지는 discriminated union 형태를 사용한다.

## 2) 공통 타입

```ts
export type CalendarMode = 'single' | 'multiple' | 'range'
export type DateValue = Temporal.PlainDate | Temporal.PlainDateTime
export type MonthValue = Temporal.PlainYearMonth

export interface CalendarRangeValue {
  start: DateValue | null
  end: DateValue | null
}
```

## 3) 공통 props (모든 mode)

```ts
interface CalendarBaseProps {
  id?: string
  className?: string

  minDate?: DateValue
  maxDate?: DateValue

  locale?: {
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
    weekdays?: string[]
    monthLabelFormat?: string
    dayLabelFormat?: string
  }

  keyboardNavigation?: boolean
  includeTime?: boolean
  minuteStep?: number

  onMonthChange?: (monthStart: MonthValue) => void
  onFocusedDateChange?: (date: DateValue | null) => void
}
```

```ts
/** single / multiple 전용 — range는 지원하지 않는다. */
interface CalendarDayDisablingProps {
  isDateDisabled?: (date: Temporal.PlainDate) => boolean
}
```

### 3-1) 선택 불가와 스크롤 범위

- **`minDate` / `maxDate`**: 허용 **달력 범위**를 정한다. 이 범위 밖의 날은 항상 선택할 수 없고, 무한 스크롤 그리드에서 **표시·스크롤 가능한 월**에도 영향을 준다.
- **`isDateDisabled`** (`CalendarDayDisablingProps`, **single/multiple만**): 위 범위 **안**에서 추가로 막을 날. **range**는 구간이 연속이라 “중간만 비활성”이 UX·모델 모두 어색하므로 이 prop을 받지 않는다.

전체 캘린더를 한꺼번에 끄는 `disabled` prop은 두지 않는다.

## 4) mode별 props 차이

### 4-1) single

```ts
interface CalendarSingleProps extends CalendarBaseProps, CalendarDayDisablingProps {
  mode: 'single'
  value?: DateValue | null
  defaultValue?: DateValue | null
  onSelect?: (next: DateValue | null) => void
}
```

핵심 규칙:

- 클릭 또는 Enter로 선택이 확정되면 `onSelect`를 호출한다.
- 이미 선택된 날짜를 다시 선택했을 때 해제할지 여부는 별도 옵션(`allowDeselect`) 후보로 열어 둔다.

### 4-2) multiple

```ts
interface CalendarMultipleProps extends CalendarBaseProps, CalendarDayDisablingProps {
  mode: 'multiple'
  value?: DateValue[]
  defaultValue?: DateValue[]
  onSelect?: (next: DateValue[]) => void
  maxSelections?: number
}
```

핵심 규칙:

- 동일 날짜 재선택 시 토글 제거한다.
- `maxSelections`가 있으면 상한 도달 시 신규 선택을 무시하거나 정책에 따라 가장 오래된 값을 대체한다.

### 4-3) range

```ts
interface CalendarRangeProps extends CalendarBaseProps {
  mode: 'range'
  value?: CalendarRangeValue
  defaultValue?: CalendarRangeValue

  // 범위 선택이 완전히 확정되었을 때만 호출 (start/end 모두 확정)
  onSelect?: (next: CalendarRangeValue) => void

  // 진행 중 프리뷰(첫 점만 잡힘, 호버로 끝 후보 이동 등). null이면 프리뷰 종료
  onRangePreview?: (next: CalendarRangeValue | null) => void

  // true면 선택 중 hover 등으로 프리뷰를 갱신한다
  allowRangePreview?: boolean
}
```

핵심 규칙:

- `onSelect`는 **범위가 완료된 시점**(두 번째 확정 입력 이후)에만 호출한다.
- 첫 클릭으로 시작점만 잡힌 상태, 호버로 끝 후보가 바뀌는 상태 등은 **`onRangePreview`로만** 알린다.
- `start > end`가 되는 입력은 내부에서 자동 정렬한 뒤 `onSelect`/`onRangePreview`에 전달한다.

## 5) 최종 공개 타입 (초안)

```ts
type CalendarProps = CalendarSingleProps | CalendarMultipleProps | CalendarRangeProps
```

## 6) 제어/비제어 규약

- `value`가 제공되면 controlled로 동작한다.
- `value`가 없고 `defaultValue`가 있으면 uncontrolled 초기값으로만 사용한다.
- controlled에서 내부 상태는 렌더링 편의를 위한 파생 상태만 유지한다.

## 7) Temporal 기준

- 공개 value 타입은 `Date`가 아니라 `Temporal.PlainDate | Temporal.PlainDateTime`를 사용한다.
- 월 단위 콜백(`onMonthChange`)은 `Temporal.PlainYearMonth`를 사용한다.
- `includeTime`이 `false`이거나 생략되면 `Temporal.PlainDate`를 기본으로 사용한다.
- `includeTime`이 `true`면 `Temporal.PlainDateTime`을 사용한다.
- 날짜 셀만 먼저 고르는 UX에서는 `PlainDateTime`으로 합성할 때 **`00:00` 고정**을 사용한다.
- 시간 정밀도는 Draft 0에서 분(minute) 단위로 고정하며, `timePrecision` props는 제공하지 않는다.
- `minuteStep` 기본값은 `1`이며, 시간 UI가 있을 때 minute 선택 간격에만 적용한다.
- 이 캘린더는 **IANA 타임존을 해석하지 않는다**. `PlainDate`/`PlainDateTime`은 wall 값이며, `Temporal.PlainDate#toZonedDateTime` 등은 **소비자가 호출**한다.
- 입력 포맷 문자열 파싱은 초기 릴리즈 범위에서 제외하고, 소비자가 `Temporal` 값으로 전달하는 것을 기본으로 한다.

## 8) 제외/보류 항목 (Draft 0)

- 가상 스크롤/레이아웃 props는 UI 구현 후 1차 안정화 시점에 공개 범위를 확정한다.
- Compound slot의 세부 props 계약은 `components.md`로 분리해 후속 정의한다.

## 9) 관련 문서

- Headless hook 계약: `docs/hooks.md`
