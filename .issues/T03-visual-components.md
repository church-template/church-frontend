# [T3] 공통 시각 컴포넌트 (Button · Card · Badge · Input)

**라벨:** `component`
**선행:** T2
**참조:** DESIGN.md `components:`(단일 진실)·§408~428, 가이드 15.1·15.4

---

## 목적
DESIGN.md 정의대로 시각 중심 컴포넌트를 **직접 구현**한다(shadcn 버전 도입 금지). 값은 전부 T2 토큰 참조.

---

## 1. Button (변형별 토큰)
| 변형 | 배경 | 텍스트 | 라운드 | 패딩 | 높이 |
|---|---|---|---|---|---|
| `button-primary` | primary | on-primary | pill | 12px 20px | 44 |
| (active) | primary-active | on-primary | pill | | |
| `button-secondary-light` | surface-strong | ink | pill | 12px 20px | 44 |
| `button-outline-on-dark` | transparent | on-dark | pill | 11px 19px | 44 |
| `button-tertiary-text` | transparent | primary | — | — | — |
| `button-pill-cta` | primary | on-primary | pill | 16px 32px | 56 |
- 타이포 `button`(16/600). **한 밴드(화면)에 primary 1개 원칙.** CTA 직각 모서리 금지.

## 2. Card (변형별 토큰)
| 변형 | 배경 | 라운드 | 패딩 | 보더 |
|---|---|---|---|---|
| `sermon-card` | canvas | xl(24) | 0 | 1px hairline |
| `notice-row` | transparent | — | 16px 0 | 하단 1px hairline |
| `schedule-card` | surface-soft | xl | 32px | — |
| `event-card` | canvas | xl | 32px | 1px hairline |
| `feature-card` | canvas | xl | 32px | — |
- **sermon-card**: 16:9 썸네일(상단, 카드와 함께 24px 라운드) + title(title-md) + preacher·date(datetime, muted). **hover: soft drop + 썸네일 1.03배 줌(0.3s ease).**
- **notice-row**: 제목 + 날짜 가로 행, 클릭 영역 = 행 전체.
- 모든 카드 `rounded.xl`(24px). 그림자는 hover soft drop 하나만.

## 3. Badge
| 변형 | 배경 | 텍스트 | 라운드 | 패딩 |
|---|---|---|---|---|
| `badge-pill` | surface-strong | ink | pill | 4px 12px |
| `badge-pill-primary` | primary-soft | primary | pill | 4px 12px |
- 타이포 caption-strong. `badge-pill-primary`는 "NEW"·"이번 주"·캘린더 칩(T12)에 사용.

## 4. Input
| 변형 | 배경 | 라운드 | 패딩 | 높이 | 보더 |
|---|---|---|---|---|---|
| `text-input` | canvas | md(12) | 14px 16px | 48 | 1px hairline |
| `search-input-pill` | surface-strong | pill | 12px 20px | 44 | — |
- **포커스 시 보더 2px `primary`.** 검증 메시지는 입력 아래 caption, 색은 semantic 토큰(텍스트만).

## 5. 완료 조건
- [ ] Button 6변형 · Card 5변형 · Badge 2변형 · Input 2변형 구현
- [ ] 전 값 T2 토큰 참조(hex·px 인라인 0)
- [ ] sermon-card hover(soft drop + 줌), text-input focus(2px primary)

## 6. 검수 기준 (15.4 — 직접 구현분)
- [ ] DESIGN.md `components:` 정의(크기·라운드·패딩·타이포 토큰)와 **픽셀 단위로 일치**한다.
- [ ] 모든 인터랙티브 요소에 포커스 표시(focus-visible 링)가 보인다 — 입력은 2px primary 보더.
- [ ] 키보드만으로 전 기능 조작이 가능하다.
