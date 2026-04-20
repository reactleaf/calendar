# Next Calendar Project Plan

## Goal

- 기존 `react-infinite-calendar`의 동작 가치를 유지하되, 구현/공개 API는 현대 React 패턴(variant + headless hook + compound 확장)으로 재설계한다.
  - 이 레퍼런스 프로젝트는 ../ 에 위치해있다.
- 현재 프로젝트는 레퍼런스 프로젝트 하위에 위치해있다.

## Decision Baseline

- 선택 모드 공개 API는 `mode` 기반 variant로 통일한다: `single | multiple | range`.
- 핵심 상태 로직은 headless hook으로 분리한다: `useCalendarState`, `useSingleSelection`, `useMultipleSelection`, `useRangeSelection`, `useCalendarKeyboard` (+ 모드별 런타임 hook `useCalendarSingleRuntime` / `useCalendarMultipleRuntime` / `useCalendarRangeRuntime`, 보조 뷰 상태 hook `useCalendarSecondaryView`).
- UI 확장 지점은 compound 컴포넌트로 제공한다: `Calendar.Root`, `Calendar.Header`, `Calendar.Weekdays`, `Calendar.SingleMode` / `Calendar.MultipleMode` / `Calendar.RangeMode`, `Calendar.MonthPicker`, `Calendar.TimeSelectView` (+ 편의 facade `Calendar`).
- 구 API(HOC)는 제공하지 않는다.
- 본문 영역 치수는 토큰으로 고정: `--calendar-body-height`, `--calendar-weekdays-height`, `--calendar-secondary-body-height`. days / month / time 뷰 간 전환 시 카드 외곽 높이가 변하지 않는다.

## Work Breakdown (Ordered)

범례: ✅ 완료 · 🚧 진행 중 · ⏳ 미착수

### Phase 0. Project Foundations ✅

1. ✅ 모노리포/단일패키지 구조 결정 (단일 패키지로 진행)
2. ✅ 코드 구조 생성
   - `src/core` (도메인 로직 + selection state machines)
   - `src/hooks` (headless + 모드별 runtime)
   - `src/components` (UI/compound)
   - `src/styles` (tokens + 도메인별 분할 CSS)
3. ✅ 개발 표준 설정 (eslint, prettier, strict TS, Vitest)
4. ⏳ CI 파이프라인 구성 (install/typecheck/lint/test/build 자동화) — 로컬 스크립트만 존재

### Phase 1. API & Domain Spec First ✅

1. ✅ 공개 API 문서 (`docs/api.md`)
2. ✅ 날짜 도메인 정책 확정 — `@js-temporal/polyfill` 기반 `PlainDate` / `PlainDateTime`, `includeTime` 옵션
3. ✅ 이벤트 모델 — `onSelect` / `onRangePreview` 계약, hover preview 모델
4. ⏳ 레거시 맵 작성 (이전 `react-infinite-calendar` props → 신규 props 대응표) — 착수 전

### Phase 2. Core Engine (UI 없이) ✅

1. ✅ month/week/day 계산 (`src/core/calendarDate.ts`, `src/core/monthGrid.ts`)
2. ✅ disabled/min/max 판정 (`src/core/constraints.ts`)
3. ✅ selection state machine (`src/core/selection/{single,multiple,rangePointer}.ts`)
4. ✅ 단위 테스트 (`calendarDate.test.ts`, `monthGrid.test.ts`, `constraints.test.ts`, `selection/*.test.ts`)

### Phase 3. Headless Hooks ✅

1. ✅ `useCalendarState` — visible month, focused date, scroll anchor
2. ✅ `useSingleSelection` (+ `allowDeselect`, `setSelectedTime` for time mode)
3. ✅ `useMultipleSelection` (+ `setLatestSelectedTime`, `maxSelections=ignore-new` 정책)
4. ✅ `useRangeSelection` (+ `preview` / `onRangePreview`, `setRangeTime(edge)`)
5. ✅ `useCalendarKeyboard` — 화살표 + `Enter`/`Space` 최소 집합 (`Home`/`End`/`PageUp`/`PageDown` 미지원으로 확정)
6. ✅ 모드별 runtime hook — `useCalendarSingleRuntime` / `useCalendarMultipleRuntime` / `useCalendarRangeRuntime` (compound가 소비)
7. ✅ hook 테스트 (`useSingleSelection.test.tsx`, `useMultipleSelection.test.tsx`, `useRangeSelection.test.tsx`)

### Phase 4. UI Layer (Compound) ✅

1. ✅ compound 뼈대 — `Calendar.Root` / `Calendar.Header` / `Calendar.Weekdays` / `Calendar.{Single,Multiple,Range}Mode` + facade `Calendar`
2. ✅ mode variant ↔ runtime hook 결합 (`Calendar.Root` 가 `runtime` 을 context 로 주입, `.calendar--mode-<mode>` 클래스 부여)
3. ✅ 스타일 토큰/CSS 분할 — `src/styles/calendar.{base,header,time,day,range,overlay,monthPicker,timeSelect}.css`, `src/Calendar.css` 는 barrel 역할. selection / focused / hover / today / 월 피커 선택 / 시·분 active pip 까지 모두 `--calendar-range-pip` 반경의 원형 표현으로 통일
4. ✅ 월 단위 가상 스크롤 — `useInfiniteMonthScroll` + `@tanstack/react-virtual`, overscan 지원
5. ✅ 공통 헤더 톤 — 모든 모드가 accent 배경 + 흰 텍스트. 연도 라벨은 `Calendar.MonthPicker` 로 **단방향** 전환, 날짜 라벨은 다시 days 그리드로 **단방향** 전환 (토글 아님)
6. ✅ 보조 뷰 시스템 — `useCalendarSecondaryView` (`displayMode: 'days' | 'months' | 'time'` + `timeEditTarget: 'primary' | 'rangeStart' | 'rangeEnd'`) 로 상태 일원화. 각 Mode 컴포넌트가 `displayMode` 로 분기 렌더
7. ✅ `Calendar.MonthPicker` — 6×2 월 그리드, 연도 헤더 단축 표기, 선택된 월(없으면 현재 viewport 월) 을 스크롤 중앙 정렬, 원형 accent pip
8. ✅ `Calendar.TimeInput` — 과거의 wheel/scroll/rAF commit 로직을 걷어내고 **두 경로만**: 클릭 시 숫자 직접 타이핑(input 치환 + focus/select) + 동시에 `openTimeView(target)` 로 time 보조 뷰 전환. hover/active/focus-within 스타일은 part 단위 scope + accent 배경 대비를 살린 반투명 토큰으로 정리
9. ✅ `Calendar.TimeSelectView` + `Calendar.TimeScrollPicker` — 세로 스크롤 + 무한 loop (REPEAT×N 복제 + silent jump) + **클릭 commit** 분리. active pip 은 아이템 자체에 붙어 스크롤과 함께 이동 (중앙 고정 pip 은 의도적으로 사용 안 함). scroll-snap 없이 자유 스크롤 + 관성. 뷰포트 중앙 오프셋은 런타임 계산이라 프레임 높이가 유연하게 남는 세로 공간 전체로 확장됨
10. ✅ Minute granularity 는 **뷰 필터** — 체크박스 레이블은 "5분 단위로 보기"(기본 체크). 진입 시 선택된 minute 이 5의 배수가 아니면 자동 해제해 현재 값이 가려지지 않게 한다. 체크 시 `values` 목록에 현재 값이 없으면 active pip 표시는 사라지되 내부 값은 유지 (= 커밋 아님)
11. ✅ `includeTime` 은 single/multiple/range 모두에서 동작. range 는 start/end 두 쌍의 H/M 피커를 좌우로 배치

### Phase 5. Accessibility & Interaction Hardening 🚧

1. 🚧 WAI-ARIA calendar grid 패턴 반영 — `role="button"` / `aria-pressed` 기반, grid/row 역할 보강 필요
2. 🚧 focus 관리 / roving tabindex — keyboard로 focusedDate는 움직이지만, tab 진입/이탈 시 focus 이동 규칙 재점검 필요
3. ⏳ 스크린리더 라벨링 점검 (월/년 전환, 선택 상태 변경 안내)
4. ⏳ pointer + keyboard + touch 상호작용 동등성 회귀 테스트

### Phase 6. Docs & Developer Experience ⏳

1. ⏳ Storybook(또는 문서 사이트) 세팅 — 현재는 `src/App.tsx` 내 mode playground 만 존재
2. ⏳ mode별 예제 추가 (single / multiple / range / custom day/header)
3. ⏳ 마이그레이션 가이드 작성
4. ⏳ 성능 가이드 (큰 기간 범위 / overscan 튜닝 / 메모이제이션)

### Phase 7. Release Preparation ⏳

1. ⏳ 번들 산출물 정책 (ESM 우선, `package.json` `exports` 맵)
2. ⏳ 타입 배포 검증 (`.d.ts` 분리 빌드)
3. ⏳ semver/changeset 전략
4. ⏳ `v0` 프리릴리즈

## Immediate Next Tasks

1. Phase 5-1/5-2 착수: calendar grid ARIA 역할/roving tabindex 정리 (`Calendar.ModeBody` / `Calendar.DayCell`). 보조 뷰(`MonthPicker` / `TimeSelectView`) 도 listbox/grid 역할·키보드 탐색 검토
2. Phase 5 검증용 키보드·포인터 상호작용 통합 테스트 추가 (time view 의 클릭/키보드 동등성 포함)
3. `docs/api.md` 와 `docs/hooks.md` 에 `useCalendarSecondaryView` · `openTimeView` · time 보조 뷰 관련 계약 반영 및 상호 참조 정리
4. CI 파이프라인(typecheck + lint + test) GitHub Actions 등으로 자동화 (Phase 0-4)
5. 레거시 `react-infinite-calendar` props 대응표 초안 (Phase 1-4)

## Risks & Mitigations

- 날짜/타임존 버그: 도메인 normalize 규칙을 초기에 고정하고 테스트를 먼저 작성
- 과도한 커스터마이징으로 API 복잡화: 1차 릴리즈 범위 제한, compound 확장은 점진 도입
- 성능 저하: 가상 스크롤/메모이제이션 기준을 문서화하고 회귀 테스트 추가

## Definition of Done (MVP)

- ✅ `mode="single|multiple|range"`가 모두 동작
- ✅ 키보드 내비게이션/선택 동작 정상 (화살표 + `Enter`/`Space`)
- ✅ min/max/disabled/disabledDates/disabledDays 규칙 정상
- ✅ `includeTime` 전 모드 지원, 시/분 직접 입력 + time 보조 뷰(스크롤 피커) 의 두 경로가 일관
- ✅ 뷰 간(days / month / time) 전환 시 카드 외곽 높이 고정 유지
- 🚧 접근성 기본 규칙 충족 (ARIA 역할/roving tabindex 점검 필요 — Phase 5, 보조 뷰 포함)
- 🚧 문서 예제와 테스트가 동기화됨 (api/hooks 문서와 실 코드는 일치, 예제 사이트/Storybook 미도입)
