# MediaCollage 설계 스펙 — 히어로 후속 미디어 콜라주 스크럽 섹션

> 2026-06-11 브레인스토밍 확정본. T08 메인 페이지(스펙 `2026-06-11-t08-main-page-design.md`)의 후속 연출.
> 참조: chinhung.co.kr 메인 인트로 — Playwright로 직접 관찰·분해(아래 §1).

## 1. 목적·참조 연출

CrossHero 카피("말씀과 삶이 만나는 곳…") 이후 스크롤을 더 내리면, 풀스크린 배경이
**가운데 라운드 카드로 축소**되고 주변에 교회 사진/영상 타일이 슬라이드 인하며
흰 캔버스 위 **콜라주**를 형성한다. 참조 사이트 관찰 결과(스크롤 단계 스크린샷 분해):

- 풀스크린 미디어가 `clip-path: inset(... round ...)`로 중앙 카드로 축소
- 주변 타일 4장이 가장자리에서 제각각 속도로 진입(패럴랙스 질감), 흰 배경 노출
- 이후 핀 해제 → 콜라주가 위로 스크롤되며 일반 섹션으로 연결
- 원본 구현은 GSAP ScrollTrigger + Swiper — **우리는 GSAP을 쓸 수 없으므로**(15.1 허용
  라이브러리 외 추가 금지) CrossHero와 동일한 scroll+rAF 패턴으로 자체 구현한다.

## 2. 확정 결정

| # | 결정 | 내용 · 근거 |
|---|---|---|
| C1 | **독립 섹션** (CrossHero 무변경) | 14A는 동결 코드(비율·구간 변경 금지). 새 섹션의 첫 프레임을 히어로 끝 프레임(풀스크린 동일 미디어)과 동일하게 만들어 핀 해제 핸드오프가 보이지 않게 한다. 카피는 히어로와 함께 자연스럽게 위로 빠져나감 |
| C2 | 미디어 = **상수 주입 + 플레이스홀더** | `COLLAGE_TILES: HeroMedia[]`(4개)를 `constants/church.ts`에 선언(HERO와 동일 패턴, 12장 원칙). 지금은 PIL 플레이스홀더 4장, 추후 실사진 파일 교체 |
| C3 | 중앙 카드 = **HERO 미디어 그대로(정적)** | 참조 사이트의 중앙 카드 순환(Swiper)은 채택 안 함(YAGNI). 이음새 보장 + 구현 단순 |
| C4 | 타일 = **주변 4장·라벨 없음** | "사진이 주인공, UI 크롬은 조용히"(DESIGN). 모바일은 2장 |
| C5 | 스크럽 방식 | 참조와 동일하게 스크롤 진행도에 비례(가역). 1회 재생 entrance는 기각 — 요청된 질감과 다름 |

## 3. 파일 구조

```
신규
├─ src/hero/MediaCollage.tsx          # (client) 스크럽 섹션
├─ src/hero/MediaCollage.module.css   # sticky·슬롯 기하·reduced-motion 폴백
├─ src/hero/scrub.ts                  # lerp·clamp01·segment·easeOut 순수 헬퍼
│                                     #   CrossHero 내부 헬퍼와 동일 산식이지만 동결 파일을
│                                     #   export 변경으로 건드리지 않기 위한 별도 모듈
├─ src/hero/MediaCollage.test.tsx · src/hero/scrub.test.ts
└─ public/collage-1.jpg ~ collage-4.jpg   # PIL 플레이스홀더(톤 변형)

변경
├─ src/constants/church.ts            # COLLAGE_TILES: HeroMedia[] 추가
├─ src/app/page.tsx                   # HeroHeaderSync children 맨 앞에 <MediaCollage />
├─ src/app/page.test.tsx              # 콜라주 존재 단언 추가
└─ .claude/rules/DESIGN.md            # components 블록에 media-collage 항목 추가(규칙 4)
```

## 4. 연출 명세 (확정 수치 — 14A.3과 같은 동결 수치로 취급)

- **구간**: 외부 section 높이 **220vh**, 내부 sticky `100vh` + `100dvh` 중복 선언.
  진행도 `p = clamp01((scrollY - offsetTop) / (offsetHeight - innerHeight))` — CrossHero와 동일 산식.
- **중앙 카드 축소** — p 0→0.55, `easeOut(t) = 1 - (1-t)³` (처음 빠르게 빠지고 끝에서 안착):
  - `clip-path: inset(V% H% round Rpx)` 스크럽 — V 0→16, H 0→30, R 0→24
  - R(라운드)은 하드코딩하지 않고 **`--radius-xl` 토큰을 `getComputedStyle`로 1회 읽어** 합성
  - 결과: 풀스크린 → 중앙 세로형 카드(약 40vw × 68vh). 카드 밖은 `bg-canvas`
- **타일 슬라이드 인** — transform+opacity만, 타일별 구간을 어긋나게(패럴랙스 질감):

| 슬롯 | 위치·크기 (데스크톱) | 진입 방향 | 구간 |
|---|---|---|---|
| T1 좌상 | left 6% · top 8% · w 17vw · 3:4 | 위에서 ↓ (translateY -40vh→0) | p 0.15~0.70 |
| T2 좌하 | left 9% · bottom 10% · w 20vw · 4:3 | 왼쪽에서 → (translateX -50vw→0) | p 0.25~0.80 |
| T3 우상 | right 7% · top 16% · w 19vw · 16:10 | 오른쪽에서 ← (translateX 50vw→0) | p 0.20~0.75 |
| T4 우하 | right 10% · bottom 8% · w 16vw · 3:4 | 아래에서 ↑ (translateY 40vh→0) | p 0.30~0.85 |

- 각 타일 opacity 0→1을 같은 구간에서 함께 스크럽. 타일은 `rounded-xl`(24px, 중첩 라디우스
  원칙) + hairline 보더. **중앙 카드는 라운드만**(clip-path로 잘리는 구조라 보더가 함께
  잘려 hairline 불가 — 사진 카드라 보더 없이도 캔버스와 분리됨).
- **p ≥ 0.85**: 완성 콜라주 유지 → 핀 해제 → 일반 흐름으로 위로 스크롤, 예배시간 섹션 진입.
- 슬롯 %·이동거리(vw/vh)·inset 비율은 **연출 수치**로서 이 표가 단일 진실이다(토큰 대상 아님 —
  색·라디우스 등 디자인 값만 토큰 참조).

## 5. 배치·헤더 상호작용

- 13.4 순서에서 **히어로와 예배시간 사이**. `page.tsx`의 `HeroHeaderSync` children 맨 앞 —
  `<main>` 랜드마크 안 유지.
- 헤더는 기존 동작 그대로(CrossHero 이탈 시 라이트 스킨 전환). 콜라주는 **첫 프레임부터 inset이
  자라기 시작**하므로 "풀스크린 어두운 미디어 + 흰 헤더" 겹침은 한 프레임 수준.
- 핸드오프: CrossHero 끝 프레임(풀스크린 미디어 + 카피)이 위로 스크롤되며 그 아래 동일한
  풀스크린 미디어(콜라주 p=0)가 드러남 — 동일 에셋이라 이음새 비가시. HERO가 video인 경우
  두 video 엘리먼트가 잠시 공존(동일 파일 — 브라우저 캐시로 부하 미미, 알려진 트레이드오프).

## 6. 반응형·접근성·성능

- **모바일(<640px)**: T3·T4 숨김(2타일), 중앙 카드 H-inset 30→12%로 완화(카드가 화면을 더 차지).
  남는 타일은 크기를 키운다 — T1 w 36vw(top 6%·left 4%), T2 w 42vw(bottom 6%·left 6%).
  진입 방향·구간은 데스크톱과 동일.
- **reduced-motion**: 스크럽 JS 미등록 + CSS 폴백 — 핀 없이(height auto) **완성 상태 콜라주를
  정적 표시**(CrossHero와 동일 접근).
- **성능**: clip-path·transform·opacity만(레이아웃 불변·reflow 0), scroll은 rAF 스로틀,
  resize 시 재측정. 14A.6 원칙(width/height 확대 금지·rAF 없는 갱신 금지) 동일 적용.
- 타일은 장식 미디어 — `alt=""` 기본, 상수에서 의미 있는 alt 제공 가능. 영상 타일은 CrossHero와
  동일한 muted·playsInline·onError→poster 폴백.

## 7. 테스트

| 대상 | 검증 |
|---|---|
| `scrub.ts` | lerp·clamp01·segment·easeOut 경계값 단위 테스트 |
| `MediaCollage` | 중앙 미디어 + 타일 4개 렌더 / scroll·resize 리스너 등록·해제 / reduced-motion 시 미등록 / video 타일 onError→poster 폴백 / svg·장식 alt 처리 |
| `page.test.tsx` | 콜라주 섹션 존재 단언 추가 |
| 수동 검수 | 이음새(히어로 끝↔콜라주 첫 프레임 동일) · 스크럽 가역(올리면 되감김) · 모바일 2타일 · reduced-motion 정적 · DevTools Performance에서 reflow 없음 |

## 8. 범위 밖

- 중앙 카드 미디어 순환(C3에서 기각) / 타일 라벨·링크(C4) / 실사진·실영상 제작(교회 제공) /
  콜라주 이후 추가 연출(선언문 워드 하이라이트 등 참조 사이트의 후속 섹션).
