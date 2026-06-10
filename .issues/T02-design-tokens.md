# [T2] 디자인 토큰 + 폰트

**라벨:** `design`
**선행:** T1
**참조:** DESIGN.md(전반·구현노트 §460~468), 가이드 14A.3

---

## 목적
DESIGN.md의 디자인 토큰을 `app/globals.css`의 CSS 변수로 1차 노출하고 Tailwind `theme.extend`에서 참조하게 연결한다. Pretendard를 self-host한다. 모든 시각 컴포넌트(T3~)의 토대.

---

## 1. 토큰 노출 (CSS 변수 → Tailwind)
DESIGN.md frontmatter의 토큰을 그대로 옮긴다. **값은 globals.css에서 한 번만 정의**, Tailwind는 변수를 참조(값 중복 금지, 구현노트 1).

### 1.1 colors (DESIGN.md 그대로)
```
primary #0052ff · primary-active #003ecc · primary-disabled #a8b8cc · primary-soft #e8efff
ink #0a0b0d · body #5b616e · muted #7c828a · muted-soft #a8acb3
hairline #dee1e6 · hairline-soft #eef0f3
canvas #ffffff · surface-soft #f7f7f7 · surface-strong #eef0f3
surface-dark #0a0b0d · surface-dark-elevated #16181c
on-primary #ffffff · on-dark #ffffff · on-dark-soft #a8acb3
semantic-success #05b169 · semantic-error #cf202f   (폼 메시지 텍스트 색으로만)
```
- [ ] **추가: `cover-dark: #0a0f1f`** (가이드 14A.3 메인 덮개색). **DESIGN.md `colors:` 블록에도 항목을 추가**(구현노트 4: 문서에 없는 토큰을 임의로 쓰지 않는다 → 문서 보강 후 사용).

### 1.2 typography
Pretendard 단일 패밀리. display=500(700+ 금지), 본문 행간 1.7, 자간 em.
주요 스텝: display-mega 72/500 · display-xl 56/500 · display-lg 44/500 · display-md 36/500 · title-lg 26/600 · title-md 18/600 · body-md 16/400(lh 1.7) · body-sm 14/400 · **datetime 14/500(tnum)** · caption 13/400 · button 16/600 · nav-link 15/500.
- 모바일 디스플레이 clamp: 예 `clamp(36px, 6vw, 72px)`.

### 1.3 rounded / spacing / layout
```
rounded: xs 4 · sm 8 · md 12 · lg 16 · xl 24(카드 표준) · pill 100 · full 9999
spacing: xxs 4 · xs 8 · sm 12 · base 16 · md 20 · lg 24 · xl 32 · xxl 48 · section 96
layout: container-max 1200 · container-padding 24 · nav-height 64
```

## 2. 폰트 (Pretendard self-host)
- [ ] **next/font/local + woff2 self-host** (`Pretendard Variable`). **CDN import 금지**(구현노트 2, DESIGN.md 프로젝트규칙 2).
- [ ] 라틴 전용 폰트 추가 금지.
- [ ] `font-feature-settings: "tnum"`은 **datetime 토큰에만** 적용(날짜·시간 자릿수 안정, 1.2.3).

## 3. 규칙
- [ ] **arbitrary value 금지**: `bg-[#0052ff]`·`p-[13px]` 같은 토큰 우회 금지(15.1). 항상 토큰 유틸.
- [ ] hex·px 인라인 금지 → 토큰 참조(DESIGN.md Don't). **예외:** CrossHero/DeptHero 검증 로직 내부 수치(T8/T9).
- [ ] 깊이는 그림자 단계 추가 없이 hairline + 단일 soft drop(`0 4px 12px rgba(0,0,0,0.04)`)만.

## 4. 완료 조건
- [ ] globals.css에 위 토큰 전부 CSS 변수로 노출
- [ ] `cover-dark` 토큰 추가 + DESIGN.md 보강
- [ ] tailwind.config의 `theme.extend`가 변수 참조(값 중복 없음)
- [ ] Pretendard Variable self-host 적용, tnum은 datetime만

## 5. 검수
- [ ] 임의 hex/px 유틸이 코드에 없다(grep로 `[#`·`[1` 확인).
- [ ] datetime 외 텍스트에 tnum 미적용.
- [ ] primary 4토큰만 바꾸면 브랜드 색이 전부 바뀐다(교회별 재사용, DESIGN.md 프로젝트규칙 1).
- [ ] 디스플레이가 500을 넘지 않는다.
