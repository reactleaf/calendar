# Next Calendar Project Plan

## Goal

- 기존 `react-infinite-calendar`의 동작 가치를 유지하되, 구현/공개 API는 현대 React 패턴(variant + headless hook + compound 확장)으로 재설계한다.
- 신규 루트는 `next/` 독립 저장소를 기준으로 진행한다.

## Decision Baseline

- 선택 모드 공개 API는 `mode` 기반 variant로 통일한다: `single | multiple | range`.
- 핵심 상태 로직은 headless hook으로 분리한다: `useCalendarState`, `useSingleSelection`, `useMultipleSelection`, `useRangeSelection`, `useCalendarKeyboard`.
- UI 확장 지점은 compound 컴포넌트로 제공한다: `Calendar.Root`, `Calendar.Header`, `Calendar.Grid`, `Calendar.Day`, `Calendar.Years`.
- 구 API(HOC)는 제공하지 않는다.

## Work Breakdown (Ordered)

### Phase 0. Project Foundations

1. 모노리포/단일패키지 구조 결정 (현재는 단일 패키지 가정)
2. 코드 구조 초안 생성
   - `src/core` (도메인 로직)
   - `src/hooks` (headless)
   - `src/components` (UI/compound)
   - `src/styles` (theme tokens + base css)
3. 개발 표준 설정
   - lint/format 규칙 통일
   - strict TypeScript 옵션 검토
4. CI 최소 파이프라인 구성
   - install, typecheck, lint, test, build

### Phase 1. API & Domain Spec First

1. 공개 API RFC 문서 작성 (`docs/api.md`)
   - `Calendar` props
   - `mode`별 `value/onSelect` 타입
   - 접근성/키보드 동작 계약
2. 날짜 도메인 정책 확정
   - timezone/UTC 기준
   - 값 normalize 규칙(일 단위, startOfDay 등)
3. 이벤트 모델 정의
   - `onSelect` / `onRangePreview` 계약
   - range preview(hover) 모델
4. 레거시 맵 작성
   - 이전 props → 신규 props 대응표
   - 미지원 항목 명시

### Phase 2. Core Engine (UI 없이)

1. month/week/day 계산 유틸 구현
2. disabled/min/max 판정 유틸 구현
3. selection state machine 구현
   - single
   - multiple (toggle interpolation 포함)
   - range (start/hover/end)
4. 단위 테스트 작성
   - 경계값/윤년/월 경계/역순 range 선택

### Phase 3. Headless Hooks

1. `useCalendarState` 구현
   - visible month, focused date, scroll anchor
2. `useSingleSelection` 구현
3. `useMultipleSelection` 구현
4. `useRangeSelection` 구현
5. `useCalendarKeyboard` 구현
   - 화살표/엔터/Home/End/PageUp/PageDown 규칙
6. hook 테스트 작성

### Phase 4. UI Layer (Compound)

1. 기본 compound 뼈대 구현
   - `Calendar.Root`
   - `Calendar.Header`
   - `Calendar.Grid`
   - `Calendar.Day`
   - `Calendar.Years`
2. mode variant 연결
   - 내부적으로 해당 hook 조합
3. 스타일 토큰/테마 시스템 구현
   - CSS variables 기반
4. 가상 스크롤 도입
   - 월 단위 virtualizer
   - overscan 옵션

### Phase 5. Accessibility & Interaction Hardening

1. WAI-ARIA calendar grid 패턴 반영
2. focus 관리/roving tabindex 정교화
3. 스크린리더 라벨링 점검
4. pointer + keyboard + touch 상호작용 동등성 보장

### Phase 6. Docs & Developer Experience

1. Storybook(또는 문서 사이트) 세팅
2. mode별 예제 추가
   - single
   - multiple
   - range
   - custom day/header
3. 마이그레이션 가이드 작성
4. 성능 가이드 작성
   - 큰 기간 범위에서의 권장 설정

### Phase 7. Release Preparation

1. 번들 산출물 정책 확정 (ESM 우선)
2. 타입 배포 검증
3. semver/changeset 전략 결정
4. `v0` 프리릴리즈 및 피드백 수집

## Immediate Next Tasks (This Week)

1. `docs/api.md` 초안 작성
2. 타입 모델 작성 (`CalendarValue`, `CalendarMode`, `RangeValue`)
3. core date utils + 테스트부터 착수
4. `useRangeSelection` 프로토타입 구현
5. minimal `Calendar.Root + Grid + Day` 렌더 MVP 완성

## Risks & Mitigations

- 날짜/타임존 버그: 도메인 normalize 규칙을 초기에 고정하고 테스트를 먼저 작성
- 과도한 커스터마이징으로 API 복잡화: 1차 릴리즈 범위 제한, compound 확장은 점진 도입
- 성능 저하: 가상 스크롤/메모이제이션 기준을 문서화하고 회귀 테스트 추가

## Definition of Done (MVP)

- `mode="single|multiple|range"`가 모두 동작
- 키보드 내비게이션/선택 동작 정상
- min/max/disabled 규칙 정상
- 접근성 기본 규칙 충족
- 문서 예제와 테스트가 동기화됨
