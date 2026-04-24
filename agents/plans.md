# Next Calendar Project Plan

## Goal

- 기존 `react-infinite-calendar`의 동작 가치를 유지하되, 공개 API는 mode 기반 facade 로 단순화하고 내부 구현은 현대 React 패턴(variant + headless hook + compound-style composition)으로 재설계한다.
  - 이 레퍼런스 프로젝트는 ../ 에 위치해있다.
- 현재 프로젝트는 레퍼런스 프로젝트 하위에 위치해있다.

## Decision Baseline

- **npm 패키지명**: `@reactleaf/calendar` (저장소 루트 `package.json` 과 동일).
- 공개 API에서 **`minuteStep` prop 제거** (2026-04): 분 스텝은 시간 보조 뷰 UI(예: 5분 단위 표시 토글)로만 다루고, 캘린더 루트 props에는 두지 않는다.
- 선택 모드 공개 API는 `mode` 기반 variant로 통일한다: `single | multiple | range`.
- 핵심 상태 로직은 headless hook으로 분리한다: `useCalendarState`, `useSingleSelection`, `useMultipleSelection`, `useRangeSelection`, `useCalendarKeyboard` (+ 모드별 런타임 hook `useCalendarSingleRuntime` / `useCalendarMultipleRuntime` / `useCalendarRangeRuntime`, 보조 뷰 상태 hook `useCalendarSecondaryView`).
- runtime snapshot 은 raw `DateValue` 외에 읽기 전용 `PlainDate` 파생 필드(`selectionSnapshot.plain`)를 함께 제공한다. 렌더 계층은 가능하면 이 plain 필드를 소비한다.
- UI 조합은 내부 compound-style 패턴으로 유지하되, 공개 export 는 `Calendar` facade + 타입 중심으로 제한한다. 내부 `Root` / `Header` / mode body / picker 계층은 public composition API 로 보장하지 않는다.
- 구 API(HOC)는 제공하지 않는다.
- 본문 영역 치수는 토큰으로 고정: `--calendar-body-height`, `--calendar-weekdays-height`, `--calendar-secondary-body-height`. days / month / time 뷰 간 전환 시 카드 외곽 높이가 변하지 않는다.

## Work Breakdown (Ordered)

범례: ✅ 완료 · 🚧 진행 중 · ⏳ 미착수

### Phase 0. Project Foundations ✅

1. ✅ 모노리포/단일패키지 구조 결정 (단일 패키지로 진행)
2. ✅ 코드 구조 생성
   - `src/core` (도메인 로직 + selection state machines)
   - `src/hooks` (headless + 모드별 runtime)
   - `src/components` (UI + internal composition)
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
2. ✅ min/max + `isDateDisabled` 판정 (`src/core/constraints.ts`)
3. ✅ selection state machine (`src/core/selection/{single,multiple,rangePointer}.ts`)
4. ✅ 단위 테스트 (`calendarDate.test.ts`, `monthGrid.test.ts`, `constraints.test.ts`, `selection/*.test.ts`)

### Phase 3. Headless Hooks ✅

1. ✅ `useCalendarState` — visible month, focused date, scroll anchor
2. ✅ `useSingleSelection` (+ `allowDeselect`, `setSelectedTime` for time mode)
3. ✅ `useMultipleSelection` (+ `setLatestSelectedTime`, `maxSelections=ignore-new` 정책)
4. ✅ `useRangeSelection` (+ `preview` / `onRangePreview`, `setRangeTime(edge)`)
5. ✅ `useCalendarKeyboard` — 화살표 + `Enter`/`Space` 최소 집합 (`Home`/`End`/`PageUp`/`PageDown` 미지원으로 확정)
6. ✅ 모드별 runtime hook — `useCalendarSingleRuntime` / `useCalendarMultipleRuntime` / `useCalendarRangeRuntime` (내부 composition 계층이 소비)
   - `selectionSnapshot.plain` 을 함께 채워 render 계층의 `toPlainDate()` 의존을 줄임
7. ✅ hook 테스트 (`useSingleSelection.test.tsx`, `useMultipleSelection.test.tsx`, `useRangeSelection.test.tsx`)

### Phase 4. UI Layer (Compound) ✅

1. ✅ 내부 compound-style 뼈대 — `Root` / `Header` / mode body / picker 계층 + public facade `Calendar`
2. ✅ mode variant ↔ runtime hook 결합 (내부 `Root` 가 `runtime` 을 context 로 주입, `.calendar--mode-<mode>` 클래스 부여)
3. ✅ 스타일 토큰/CSS 분할 — `src/styles/calendar.{base,header,time,day,range,overlay,monthPicker,timeSelect}.css`, `src/Calendar.css` 는 barrel 역할. selection / focused / hover / today / 월 피커 선택 / 시·분 active pip 까지 모두 `--calendar-range-pip` 반경의 원형 표현으로 통일
4. ✅ 월 단위 가상 스크롤 — `useInfiniteMonthScroll` + 커스텀 virtualizer, overscan 지원
5. ✅ 공통 헤더 톤 — 모든 모드가 accent 배경 + 흰 텍스트. 연도 라벨은 내부 month picker 로 **단방향** 전환, 날짜 라벨은 다시 days 그리드로 **단방향** 전환 (토글 아님)
6. ✅ 보조 뷰 시스템 — `useCalendarSecondaryView` (`displayMode: 'days' | 'months' | 'time'` + `timeEditTarget: 'primary' | 'rangeStart' | 'rangeEnd'`) 로 상태 일원화. 각 Mode 컴포넌트가 `displayMode` 로 분기 렌더
7. ✅ 내부 month picker — 6×2 월 그리드, 연도 헤더 단축 표기, 선택된 월(없으면 현재 viewport 월) 을 스크롤 중앙 정렬, 원형 accent pip
8. ✅ 내부 time input — 과거의 wheel/scroll/rAF commit 로직을 걷어내고 **두 경로만**: 클릭 시 숫자 직접 타이핑(input 치환 + focus/select) + 동시에 `openTimeView(target)` 로 time 보조 뷰 전환. hover/active/focus-within 스타일은 part 단위 scope + accent 배경 대비를 살린 반투명 토큰으로 정리
9. ✅ 내부 time picker + scroll picker — 세로 스크롤 + 무한 loop (REPEAT×N 복제 + silent jump) + **클릭 commit** 분리. active pip 은 아이템 자체에 붙어 스크롤과 함께 이동 (중앙 고정 pip 은 의도적으로 사용 안 함). scroll-snap 없이 자유 스크롤 + 관성. 뷰포트 중앙 오프셋은 런타임 계산이라 프레임 높이가 유연하게 남는 세로 공간 전체로 확장됨
10. ✅ Minute granularity 는 **뷰 필터** — 체크박스 레이블은 "5분 단위로 보기"(기본 체크). 진입 시 선택된 minute 이 5의 배수가 아니면 자동 해제해 현재 값이 가려지지 않게 한다. 체크 시 `values` 목록에 현재 값이 없으면 active pip 표시는 사라지되 내부 값은 유지 (= 커밋 아님)
11. ✅ `includeTime` 은 single/multiple/range 모두에서 동작. range 는 start/end 두 쌍의 H/M 피커를 좌우로 배치
12. ✅ `Header` / `DatePicker` / `MonthPicker` / `TimePicker` 는 가능한 범위에서 `selectionSnapshot.plain` 기반으로 렌더

### Phase 5. Accessibility & Interaction Hardening 🚧

1. ✅ WAI-ARIA calendar grid 패턴 (하이브리드) — `Calendar.DatePicker` 의 scroll container 에 `role="grid"` + `aria-activedescendant`, 주별 `<ul>` 에 `role="row"` + 월·주차 `aria-label`, `<li>` 에 `role="gridcell"`, `<button>` 에 stable `id` + `aria-selected`(← 기존 `aria-pressed` 교체). roving tabindex 는 의도적으로 채택하지 않음 — 가상화와 포커스 보유 셀 언마운트 충돌을 피하기 위함. 레퍼런스 `react-infinite-calendar` 의 "virtual highlight" 패턴을 ARIA grid 위에 올려 스크린리더가 가상 커서 이동을 인지하도록 한다. (`Calendar.a11y.test.tsx` 로 회귀 보호)
2. 🚧 보조 뷰 접근성 — 내부 month picker(12월 그리드) 와 time scroll picker(시/분 loop scroll) 의 ARIA 역할·키보드 탐색 정리. 후자는 현재 "스크롤=탐색, 클릭=커밋" 모델이라 키보드 등가 경로(화살표 이동 + Enter 커밋 등) 가 부재
3. ⏳ 스크린리더 라벨링 점검 (월/년 전환, 선택 상태 변경 안내, time 뷰 진입/이탈)
4. ⏳ pointer + keyboard + touch 상호작용 동등성 회귀 테스트

### Phase 6. Docs & Developer Experience 🚧

1. 🚧 문서 사이트 (`docs/`) — 소개·전체 props 페이지 우선 (`content/docs/index.mdx`, `props.mdx`), 홈 데모 유지
2. ⏳ mode별 예제 추가 (single / multiple / range / custom day/header)
3. ⏳ 마이그레이션 가이드 작성
4. ⏳ 성능 가이드 (큰 기간 범위 / overscan 튜닝 / 메모이제이션)
5. ✅ **compound export 범위** 재검토 — public surface 는 `Calendar` facade + types 로 제한

### Phase 7. Release Preparation ⏳

1. ⏳ 번들 산출물 정책 (ESM 우선, `package.json` `exports` 맵)
2. ⏳ 타입 배포 검증 (`.d.ts` 분리 빌드)
3. ⏳ semver/changeset 전략
4. ⏳ `v0` 프리릴리즈

## Immediate Next Tasks

1. Phase 5-2: 보조 뷰(`MonthPicker` / `TimeScrollPicker`) 에 ARIA 역할(listbox/option) + 키보드 등가 동작 추가. 특히 TimeScrollPicker 는 화살표/Home/End/Enter 경로 설계가 필요 (현재는 포인터 전용)
2. Phase 5-3/5-4: 스크린리더 라이브 안내 (월 변경, 선택, time 뷰 진입/이탈) + 포인터·키보드·터치 동등성 통합 테스트
3. `docs/api.md` 와 `docs/hooks.md` 에 `useCalendarSecondaryView` · `openTimeView` · time 보조 뷰 계약 + 새 ARIA 계약(`role="grid"` / `aria-activedescendant` / `aria-selected`) 반영
4. CI 파이프라인(typecheck + lint + test) GitHub Actions 등으로 자동화 (Phase 0-4)
5. 레거시 `react-infinite-calendar` props 대응표 초안 (Phase 1-4)

## Risks & Mitigations

- 날짜/타임존 버그: 도메인 normalize 규칙을 초기에 고정하고 테스트를 먼저 작성
- 과도한 커스터마이징으로 API 복잡화: 1차 릴리즈는 facade + props 중심으로 제한하고, 확장점은 slot/render prop 형태로 별도 설계 후 도입
- 성능 저하: 가상 스크롤/메모이제이션 기준을 문서화하고 회귀 테스트 추가

## Definition of Done (MVP)

- ✅ `mode="single|multiple|range"`가 모두 동작
- ✅ 키보드 내비게이션/선택 동작 정상 (화살표 + `Enter`/`Space`)
- ✅ min/max + `isDateDisabled` 규칙 정상
- ✅ `includeTime` 전 모드 지원, 시/분 직접 입력 + time 보조 뷰(스크롤 피커) 의 두 경로가 일관
- ✅ 뷰 간(days / month / time) 전환 시 카드 외곽 높이 고정 유지
- 🚧 접근성 기본 규칙 충족 (grid 본문 ARIA 완료, 보조 뷰 MonthPicker/TimeScrollPicker 및 라이브 안내는 남음 — Phase 5-2 이후)
- 🚧 문서 예제와 테스트가 동기화됨 (api/hooks 문서와 실 코드는 일치, 예제 사이트/Storybook 미도입)
