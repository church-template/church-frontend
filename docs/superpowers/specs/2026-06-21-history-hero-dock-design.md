# 연혁 히어로(중앙 축소) 설계 (2026-06-21, v2 — MediaCollage 방식)

> v1(좌측 도킹)은 5렌즈 검토에서 critical 다수(풀스크린 미디어가 우측 카드 덮음·crop 점프·2 sticky 충돌·measure 깨짐) → 폐기.
> v2: **자기완결형 중앙 축소** — 풀스크린 첫-시대 사진이 스크롤 시 `clip-path`로 **중앙 카드**로 축소(기존 MediaCollage 패턴 그대로), 그 아래로 현재 에디토리얼 타임라인이 이어진다. 좌측 도킹/핸드오프 없음 → 검토 critical 회피.

## 1. 동작 (데스크톱)
1. 맨 위: 첫 시대(items[0]) 사진이 **풀스크린**(sticky 100vh). 위에 "연혁"(displayLg) + intro(displaySm) 오버레이(on-dark + 스크림).
2. 스크롤(히어로 ~200vh): 사진이 `clip-path: inset(v% h% round r)`로 **중앙 카드**로 축소(MediaCollage center 산식 재사용). 동시에 오버레이 타이틀 페이드아웃.
3. 히어로 종료 후: 그 아래 **현재 타임라인**(좌 sticky 사진 / 우 카드) 그대로. 히어로는 자기완결(타임라인과 형제, 위에 안 겹침).

## 2. 기법 (MediaCollage 그대로)
- `scrub.ts`(lerp/clamp01/segment/easeOut) 재사용. `transform`·`clip-path`·`opacity`만(리플로우 0).
- `p = clamp01((scrollY - root.offsetTop) / Math.max(1, root.offsetHeight - innerHeight))`.
- `tc = easeOut(segment(p, 0, 0.6))`; center `clipPath = inset(lerp(0,14,tc)% lerp(0,34,tc)% round lerp(0,radiusXl,tc)px)` (풀 → 중앙 카드).
- 오버레이: `opacity = 1 - segment(p, 0, 0.4)`(+살짝 translateY). **CSS 기본 opacity 1**(무JS·hydration 전에도 가시). JS 스크럽 활성일 때만 페이드.
- 단일 rAF·passive·언마운트 해제·인라인 정리(MediaCollage 선례).

## 3. 모바일 / reduced / 무JS (MediaCollage 폴백 그대로)
- **모바일(<640px) 또는 reduced-motion**: 스크럽 미등록. CSS 기본값 = sticky 해제·미디어 정적(16:9 등) + 타이틀 정적 가시. 그 아래 타임라인. (`useMediaFlag(REDUCED_MQ/MOBILE_MQ)`, useSyncExternalStore.)
- **무JS**: CSS 기본값이 곧 정적 히어로(풀스크린 sticky가 아니라 일반 흐름 16:9) → 전 콘텐츠 가시. h1은 어떤 경우에도 `display:none` 금지(SEO/SR).
- 브레이크포인트는 MediaCollage와 동일(`MOBILE_MQ = max-width:639px`).

## 4. 풀블리드 / 헤더
- 히어로는 **Container 밖**(풀블리드 100%). SiteShell `<main>`은 폭 제약 없음 → main 직하 풀블리드. 타임라인만 Container(1200) 유지.
- 라이트 헤더(80px, in-flow)는 스크롤 시 사라짐. 히어로 sticky `top:0`은 헤더가 사라진 뒤 풀뷰포트(MediaCollage·메인과 동일 거동).

## 5. 폴백 데이터
- `items[0].media` 없으면 히어로 스크럽 생략, 곧장 정적 타임라인(현행 디자인) — 빈 풀스크린 방지.

## 6. 제약
- `transform`·`clip-path`·`opacity`만. 히어로 sticky 조상에 `transform/filter/will-change:transform` 금지. 토큰·`typo.*`·삼항·이모지 없음.
- 접근성: 히어로 미디어 `aria-hidden`(장식), 타이틀 `<h1>`(가시 보장), intro. 타임라인 카드가 의미 담당.

## 7. 컴포넌트
- `HistoryHero.tsx`(신규): MediaCollage 축약(중앙 1장, 타일 없음) + 오버레이 타이틀. props `{ media; title; intro }`.
- `HistoryHero.module.css`: `.hero`(height 200vh)·`.heroSticky`(sticky 100vh)·`.heroMedia`(clip 스크럽)·`.heroOverlay`(on-dark 타이틀+스크림). 모바일/reduced @media 정적 폴백(MediaCollage.module.css 동형).
- `HistoryStory.tsx`: 기존 **텍스트 히어로 섹션 제거** → `<HistoryHero/>`(풀블리드) + 타임라인. 타임라인 좌 aside/우 카드는 현행 유지.
- 재사용: `scrub.ts`·`HistoryMedia`·`useMediaFlag`.

## 8. 인수 기준
1. 데스크톱: 풀스크린 첫 사진 + "연혁" 오버레이 → 스크롤 시 중앙 카드로 매끄럽게 축소 → 아래 타임라인.
2. 모바일/reduced/무JS: 스크럽 없이 정적 히어로(16:9)+타이틀 → 타임라인. 전 콘텐츠 가시(h1 포함).
3. 우측 카드 덮음·crop 점프 없음(자기완결 — 풀스크린은 히어로 구간만 점유).
4. transform/clip-path/opacity만, 토큰·typo·접근성. tsc·lint·test 통과.
