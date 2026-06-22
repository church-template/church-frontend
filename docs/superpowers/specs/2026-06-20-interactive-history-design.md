# 인터랙티브 연혁 페이지 설계 (2026-06-20, v2)

> 참조: Aramco "Shoot for the Future" 류의 scroll-driven 시네마틱 스토리텔링을 교회 연혁에 적용.
> 기존 단순 리스트 `/about/history`를 교체한다.
> v2: 6개 렌즈 적대적 검토(§18) 반영 — 점진적 향상 기본값 반전, 챕터별 자체측정 진행도,
> 명령형(ref.style) 갱신, z/스크림 토큰화, reduced 폴백 경로 명문화 등.

## 1. 배경 / 목표

현재 `/about/history`는 연도+제목의 평면 리스트다. 데이터(`HISTORY`)는 이미 시대별
`year·text·desc·details[]·significance`를 풍부하게 보유하나 화면이 이를 살리지 못한다.
배경 미디어가 sticky로 고정된 채 스크롤에 따라 시대별로 크로스페이드되고, 그 위로 텍스트가
단계적으로 떠오르는 **하이브리드 스크롤 스토리**로 재구성한다.

핵심 제약: 주 사용자층이 고령 교인이다. 스크롤을 가로채는(scroll-jacking) 풀 시네마틱은
배제하고, **자연 스크롤 + sticky 미디어 크로스페이드 + 점진 텍스트 노출**로 시네마틱 톤만 취한다.

## 2. 사용자 결정 (브레인스토밍 Q&A 요약)

| 항목 | 결정 |
|---|---|
| 배치/범위 | 기존 `/about/history` 교체. 메인 `HistoryBand`는 티저로 유지 + "전체 연혁 보기" 링크 추가 |
| 미디어 | 시대별 사진 준비 가능. 단 1차는 **placeholder 이미지**, 후일 사용자가 직접 교체 |
| 인터랙션 강도 | **하이브리드(스티키 미디어)** — 스크롤 비가로채기, clip-path/opacity/transform만 |
| 챕터 레이아웃 | **에디토리얼 좌하단** — 연도(displayMega)→헤드(displayLg)→설명, 하단 스크림 |
| 세부정보 노출 | **스크롤 점진 노출** — details 불릿·significance 풀쿼트가 단계 fade-in |
| 진행 표시 | **세로 연표 레일** — 현재 시대 primary-soft 활성, 클릭 점프 |

## 3. 범위 (Scope)

### In
- `/about/history` 페이지 인터랙티브 재구현 (상수 구동, 백엔드 무관 — 부서 인트로와 동일 격리)
- `HISTORY` 데이터에 `id`(필수)·`media`(선택) 추가 + 인트로 `intro` 1줄
- 메인 `HistoryBand`: "전체 연혁 보기" 링크 추가 + `key`를 `item.id`로 교체
- placeholder 미디어 에셋 경로 관례 + 스크림/z 토큰 등록
- 공유 훅 `useMediaFlag` 추출, 레일 라벨 도출 헬퍼

### Out (가정)
- 실제 사진/영상 — placeholder 사용, 후일 교체
- 어드민 편집 UI — 연혁은 상수 구동(부서 공개 인트로와 동일 정책)
- 백엔드 연동 — 없음
- 투명 헤더(14A/14B식) 합성 — 1차는 표준 라이트 셸 사용(§5). 후속 개선 여지

## 4. 페이지 구조

```
SiteShell (자동: top-nav-light 헤더 · 프리푸터 CtaBand · SiteFooter)
└─ HistoryPage (서버 컴포넌트)
   └─ <HistoryStory> (client)
      ├─ [세로 연표 레일]  DOM 순서상 본문보다 앞(목차 먼저) · 시각은 fixed 우측(§10)
      ├─ [인트로]   100vh — 키커 "연혁" + 교회명 + intro 한 줄 (Reveal 진입)
      └─ [스토리]   sticky 미디어 스테이지 + 7개 챕터
            2011.4 개척예배 / 2011.5 창립예배 / 2015 확장 / 2016 주방·쉼터
            / 2021 이전 / 2023 성장 / 2025 디지털
   (스토리 종료 후 SiteShell의 CtaBand → SiteFooter로 자연 연결)
```

마지막 챕터(2025)가 "현재→미래" 톤으로 닫고, 그 뒤 레이아웃의 CtaBand("처음 오셨나요?")가
자연스럽게 이어진다. 별도 아웃트로 밴드는 만들지 않는다(중복 방지).
레일은 **스토리 구간에서만** 표시(인트로·CtaBand·Footer 구간에서는 숨김, §10).

## 5. 라우팅 & 셸 통합

- 페이지는 `(site)` route group 하위 → `SiteShell`이 **light 헤더 + CtaBand + Footer 자동 제공**.
  따라서 페이지 본문은 레일 + 인트로 + 스토리만 책임진다.
- `top-nav-light`(80px)는 in-flow → 스크롤 시 자연 사라짐. sticky 미디어는 `top:0; height:100vh`로
  뷰포트 상단에 고정되어 헤더가 사라진 뒤 풀뷰포트를 채운다. 1차는 이 표준 동작을 사용한다.
- 페이지(`page.tsx`)는 **서버 컴포넌트**로 유지(상수만 주입, fetch 없음 → `connection()` 불필요).
- **포커스/탭 순서**: 레일(`<nav>`)을 DOM 순서상 콘텐츠보다 **앞**에 둔다(SR/키보드 "목차→본문").
  시각 위치는 `fixed`로 우측 중앙(§10) — DOM 순서 ≠ 시각 순서. 레일 점프 링크는 `<a href="#id">`라
  무JS에서도 앵커 스크롤로 동작(점진적 향상의 일부).

## 6. 데이터 모델 (최소 변경)

`src/constants/content.ts`의 `HISTORY`에 명시 타입을 부여하고 필드 추가. **기존 7개 항목 전부에
`id`를 필수로 부여**(media는 선택). 타입은 `satisfies`로 적용해 리터럴 추론을 유지하며 tsc 통과를 확인한다.

```ts
import type { HeroMedia } from "@/hero/types";

export interface HistoryItem {
  id: string;            // 레일 앵커(#id)/React key 전용 — 표시에 쓰지 않음. 예: "2011-04"
  year: string;          // 표시 연월 (예: "2011년 4월")
  text: string;          // 헤드라인
  desc: string;          // 한 줄 설명
  details: string[];     // 세부 항목
  significance: string;  // 의의 풀쿼트
  media?: HeroMedia;     // 배경 미디어(placeholder). 미설정 시 토큰 톤 배경 폴백(§9)
}

export interface HistoryContent {
  title: string;
  intro: string;         // 인트로 한 줄(카피 placeholder, 후일 수정 — §17)
  items: HistoryItem[];
}

export const HISTORY = { title: "연혁", intro: "…", items: [ /* 7개 */ ] } satisfies HistoryContent;
```

- `id` 예: `"2011-04"`, `"2011-05"`, `"2015"`, `"2016"`, `"2021"`, `"2023"`, `"2025"`.
- placeholder 경로 관례: `/public/history/{id}.jpg` → `media: { type:"image", src:"/history/2011-04.jpg", alt:"" }`.
  (장식 미디어라 alt 기본 `""`; 실제 사진 교체 시 alt도 채움 — MediaCollage 선례)
- **레일 라벨 도출 규칙**(단일 출처): 작은 헬퍼 `historyRailLabel(year)` — `"YYYY년 M월"→"YYYY.M"`,
  `"YYYY년"→"YYYY"`. `id`는 앵커/key 전용, 라벨 도출에 쓰지 않는다.
- `media` 미설정 챕터는 §9의 톤 페어(배경↔텍스트 토큰)로 폴백. 기존 데이터(연·제목·설명·details·significance)는 유지.

## 7. 애니메이션 모델 (이 문단이 수치·산식 단일 진실)

기존 `src/hero/scrub.ts`의 `lerp · clamp01 · segment · easeOut`를 **그대로 재사용**(새 수학 없음).
`reflow` 금지 — `opacity · transform(translateY) · 미디어 opacity`만 변경. 갱신은 **명령형**(매 프레임
React 재렌더 없이 ref로 잡은 노드에 직접 style 기록 — MediaCollage `update()` 선례).

### 7.0 점진적 향상 = 기본값 반전 (★ 핵심 원칙)
- **베이스 CSS(무JS·reduced-motion)**: 전 텍스트 `opacity:1 · translate:0`(완전 가시), `.mediaStage`
  비-sticky, `.foreground` `margin-top:0`, `.chapterInner` 비-sticky → 챕터가 **자연 세로 흐름**으로
  쌓여 전부 읽힌다. 미디어는 시대별 정지 이미지로 스택 표시.
- **인터랙티브 활성**: JS가 마운트되고 reduced-motion이 **아닐 때만** `.story`에 `.storyInteractive`
  클래스를 부여(ref에 className 추가 — effect 내 setState 아님). 이 클래스 스코프 하위에서만
  sticky·`margin-top:-100vh` 겹침·텍스트 초기 `opacity:0`을 적용한다.
- 결과: Reveal.module.css(장식이라 `opacity:0` 기본)와 **반대**다 — 연혁은 콘텐츠이므로 가시가 기본.
  AC5(무JS 전 텍스트 가시) 검증은 "`.storyInteractive` 미적용 시 computed opacity가 1"로 구체화(§16).

### 7.1 레이아웃 골격 (미디어는 챕터 내부 / `.storyInteractive` 스코프에서만 sticky)
미디어를 별도 stage로 분리하지 않고 **각 챕터 안**에 둔다 — base/무JS에서 미디어가 챕터별로 자연 흐름에
정적 노출되어 읽히고(별도 stage는 겹침 스택이라 정적 폴백이 깨짐), 인터랙티브에서만 sticky 크로스페이드한다.
```
.story.storyInteractive            position: relative; (각 .chapter = CHAPTER_VH)
  .chapter                         height: CHAPTER_VH; position: relative
    .chapterMedia[data-history-media]  position: sticky; top:0; height:100vh   ← 미디어(크로스페이드), DOM 먼저=뒤
    .chapterCopy                   position: sticky; top:0; min-height:100vh; margin-top:-100vh; flex; items-end  ← 텍스트 핀(미디어 위)
      [data-history-el]            연도/헤드/설명/details/significance (data 속성으로 엔진이 조회)
```
- **z-index 없음**: `.chapterMedia`(먼저)→`.chapterCopy`(나중)는 같은 stacking context 내 DOM 순서로 copy가 위(인라인 z 금지 준수).
- base/무JS/모바일(개정): `.chapterMedia`를 `position:absolute; inset:0`(챕터 배경)으로 깔고 `.chapterCopy`를
  `position:relative; min-height:100svh; justify-content:flex-end`로 그 위에 **오버레이**(미디어가 DOM 먼저=뒤).
  → 텍스트가 항상 미디어/다크 폴백 위에 놓여 흰 텍스트 대비 보장(텍스트를 미디어 '아래'에 흰 캔버스로 두면 흰-on-흰으로 묻힘 — 구현 검증으로 발견·수정). 챕터당 풀스크린 카드 세로 스택.
- **sticky/fixed 깨짐 방지 제약**: `.story·.chapter·.chapterMedia·.chapterCopy`에 `transform·filter·
  perspective·will-change:transform·contain` 금지(있으면 sticky/fixed가 컨테이닝 블록을 바꿔 깨짐).
  `will-change`는 **`[data-history-el]` 텍스트 노드에만**, `overflow`는 위 체인 모두 `visible`만 허용.
- 레일(`fixed`)은 `.chapter` **바깥**(스토리 형제)에 두어 transform 조상을 갖지 않게 한다.

### 7.2 진행도 = 챕터별 자체 측정 (전역 p 폐기)
v1의 전역 `p∈[0,N]`는 `.story` 스크롤 가능 범위가 `N`에 도달 못 해 마지막 챕터의 후반 노출이
누락됐다(검토 critical). v2는 **각 챕터가 자기 핀 구간 기준으로 t를 0→1 완주**한다.
- `CHAPTER_VH = 160` (튜닝값). 핀 구간 `pinVh = CHAPTER_VH − 100 = 60`(챕터가 sticky로 고정된 채
  스크롤되는 거리). `pinPx = pinVh/100 × innerHeight`.
- 챕터 i: `t_i = clamp01(-chapterRect.top / pinPx)` — 챕터 top이 뷰포트 top에 닿을 때 0, `pinPx`만큼
  더 스크롤되면 1. **모든 챕터(마지막 포함)가 t=1을 완주**(산술 보장).
- `useHistoryScrollEngine`: 단일 `rAF`(passive 스크롤·resize가 rAF 1회 예약) 안에서 챕터 ref들을 순회,
  각 `t_i` 산출 → 해당 챕터의 `[data-el]` 노드에 직접 style 기록. **매 프레임 React 재렌더 없음.**

### 7.3 미디어 크로스페이드 (챕터 미디어) — 중심 정렬
- 챕터 `i`의 `.chapterMedia` opacity `= clamp01(1 - |c_i| / FADE_PX)`, `c_i = (chapter_i_center − viewportCenter)`,
  `FADE_PX = FADE_VH/100 × innerHeight`, `FADE_VH = 90`(튜닝값). 챕터가 **뷰포트 중앙에 올 때 피크**
  → §7.4 텍스트 노출(챕터 중후반)과 정합. DOM 순서상 다음 챕터 미디어가 위로 그려져 자연 크로스페이드.
- **양끝 공백 방지**: 첫 챕터는 자기 중심보다 위(스크롤 이전) 구간 opacity 1로 유지, 마지막 챕터는
  자기 중심보다 아래 구간 opacity 1로 유지(인트로→첫 챕터, 마지막 챕터→CtaBand 공백 제거).
- 미디어 없는 챕터는 §9 톤 색면을 미디어 자리(`.chapterMedia`)에 불투명으로 둔다(반투명 비침 금지).

### 7.4 챕터 내 텍스트 점진 노출 (`t` → segment+easeOut, `.storyInteractive`에서만)
| 요소 | segment(t, s, e) | 비고 |
|---|---|---|
| 연도 | (0.00, 0.18) | displayMega |
| 헤드라인 | (0.12, 0.32) | displayLg |
| 설명 | (0.26, 0.46) | bodyMd |
| details (스태거) | (0.40, 0.70) | 항목별 +0.05 오프셋 |
| significance | (0.66, 0.88) | 풀쿼트 |
각 요소: `e = easeOut(segment(...))`, `opacity = e`, `transform: translateY(lerp(16, 0, e))px`.
챕터 텍스트는 `chapterInner` sticky로 챕터 구간 동안만 뷰포트 점유 → 인접 챕터 텍스트 겹침 없음.

### 7.5 활성 인덱스(레일용)
- 엔진이 챕터 중심성(viewport 중앙 최근접)으로 `active` 산출, **값이 바뀔 때만** `setActive`(state) →
  레일만 드물게 리렌더(aria-current·강조). 챕터 텍스트/미디어는 명령형이라 state 불요.

## 8. 컴포넌트 분해 (작은 파일 원칙)

> 디렉토리는 기존 관례(`main/`, `departments/`)에 맞춰 **`src/components/history/`**(중간 `about/` 없음).

| 파일 | 책임 | 인터페이스 |
|---|---|---|
| `src/app/(site)/about/history/page.tsx` | 서버 컴포넌트. `HISTORY` 주입, `<HistoryStory>` 렌더, metadata | — |
| `src/components/history/HistoryStory.tsx` | client 오케스트레이터. 엔진 구동, `interactive` 클래스·`active` state, 합성 | `{ content: HistoryContent }` |
| `…/HistoryIntro.tsx` | 인트로 100vh 타이틀(키커·교회명·intro, Reveal) | `{ title; intro }` |
| `…/HistoryChapter.tsx` | 챕터 1개 = `.chapterMedia`(HistoryMedia, `[data-history-media]`) + `.chapterCopy`(`[data-history-el]`). `forwardRef` 루트 노출. base 정적·인터랙티브 sticky는 CSS가 분기 | `{ item; index }` + ref |
| `…/HistoryYearRail.tsx` | 세로 연표 레일. 활성·점프. `<a href="#id">`(무JS 동작) | `{ items; active; onJump(i, e) }` |
| `…/useHistoryScrollEngine.ts` | rAF 엔진. 챕터/미디어 ref 순회 → 명령형 style. reduced면 미구동 | `(refs) => { active }` |
| `…/HistoryMedia.tsx` | 미디어 렌더 — 표준 `<img>`(next/image 아님), `alt=""` 장식, 첫 챕터 외 `loading="lazy"` | `{ media; priority? }` |
| `…/HistoryStory.module.css` | 베이스 폴백 + `.storyInteractive` sticky/스크림/레일/모바일 CSS | — |
| `src/lib/hooks/useMediaFlag.ts` | `useSyncExternalStore` 매체쿼리 구독(공유). `getServerSnapshot=()=>false` | `(query) => boolean` |

재사용: `scrub.ts` · `Container`(shell) · `Badge`(ui) · `typo`(constants) · `HeroMedia`(hero/types) ·
`Reveal`(`@/components/main/Reveal`, 크로스 도메인 재사용 허용).
공유 훅 `useMediaFlag`는 신규 추출(동결 성격 `MediaCollage` 내부 로컬 함수를 건드리지 않기 위해 — scrub.ts
분리와 동일 판단). `MediaCollage`는 이번에 수정하지 않는다(후속 정리 여지). 복붙·`effect+setState` 금지.

## 9. 챕터 레이아웃 & 토큰 (배경 톤별 텍스트 페어링)

- 좌하단 정렬: `Container` 내 `flex flex-col` 하단 정렬. 연도 `typo.displayMega` → 헤드 `typo.displayLg`
  → 설명 `typo.bodyMd` → details 불릿 `typo.bodySm` → significance `typo.bodyMd`(풀쿼트).
- **배경 톤별 텍스트 토큰 페어**(HistoryBand `BAND_TONES` 패턴 재사용 — 대비 깨짐 방지):
  - 사진 미디어 / `surface-dark` 폴백 → 텍스트 `on-dark`/`on-dark-soft` + **하단 스크림**. **사진 챕터의 `tone.layerBg`는 `bg-surface-dark`**(빈 문자열 아님) — placeholder 404·로드 전에도 흰 텍스트가 다크 위에 읽히게 다크 폴백을 깐다(사진 로드 시 덮임). 구현 검증 반영.
  - `primary-soft`/`surface-soft`(밝은) 폴백 → 텍스트 `ink`/`body`, **스크림 미적용**(밝은 배경엔 불필요).
- **스크림 토큰화**: `globals.css`에 `@utility scrim-bottom` 추가 —
  `background: linear-gradient(to top, color-mix(in srgb, var(--color-cover-dark) 70%, transparent), transparent)`
  처럼 **토큰 변수만 참조**(rgba 리터럴/인라인 hex 금지). 컴포넌트는 이 유틸 클래스만 사용. (CrossHero/DeptHero의
  검증용 rgba 예외와 달리 스크림은 일반 장식이라 예외 대상 아님.)
- **신규 텍스트 위계 도입 금지**(기존 `typo`만 사용). 부득이 추가 시 DESIGN.md → globals.css `@theme --text-*`
  → `src/lib/utils.ts` `extendTailwindMerge` font-size 목록까지 등록해야 `cn()`이 안 깨진다(utils.test.ts 회귀 감시).
- **세로 점유 상한**: 최장 케이스(2025: details 4개 + 47자 significance, 모바일 clamp 래핑) 기준으로 텍스트
  컨테이너에 안전 `max-height`를 두고, 초과 시 `chapterInner` 자연 흐름(sticky 효과 양보)로 잘림 없이 노출.

## 10. 세로 연표 레일

- `fixed` 우측 중앙. `<nav aria-label="연혁 연표">` + `<a href="#{id}">` 리스트. DOM 순서는 본문보다 앞(§5).
- 라벨 = `historyRailLabel(year)`(예 "2011.4"/"2015"). **라벨 typo는 `typo.datetime`(tnum)**, 텍스트 색은
  다크 미디어 위라 `on-dark`/`on-dark-soft`, **활성은 `primary-soft` 채움**(+도트 확대).
- 활성 버튼 `aria-current="step"`(연표 단계 의미). 클릭 → 해당 챕터로 점프 + **헤딩에 `tabindex={-1}`
  부여 후 `focus()`**(SR 포커스 점프). 점프 모션은 **공유 reduced 플래그** 단일 출처로
  `behavior: reduced ? "auto" : "smooth"`(즉석 matchMedia 조회 금지).
- **z 레이어**: 레일은 sticky 미디어 위·헤더(`z-nav`=10) 아래. globals.css `@theme`에 `--z-rail`(예 5) +
  `@utility z-rail` 추가 후 `z-rail` 참조(인라인 z 금지). 미디어/전경은 z 불요(§7.1).
- **가시 범위**: 스토리 IntersectionObserver로 스토리 구간에서만 표시(인트로·CtaBand·Footer에서 fade/hidden),
  인트로 구간(스토리 진입 전)에서는 활성 미표시.
- <640px: 우측 세로 레일 → **상단 얇은 진행바 + 컴팩트 도트**(동일 토큰·터치 타깃 48px 유지).

## 11. 접근성 & reduced-motion (필수)

- **무JS/SSR 안전**: 베이스가 완전 가시(§7.0)라 마크업의 전 텍스트가 시각적으로도 노출. JS는 향상만.
- 챕터: `<section aria-labelledby={headingId}>`, 헤딩(연도+제목)에 `tabindex={-1}`(점프 포커스 타깃).
  레일 버튼 `aria-current="step"`.
- `prefers-reduced-motion: reduce` 또는 **무JS**: `.storyInteractive` 미부여 → sticky/겹침/숨김 전부 비활성,
  자연 세로 흐름·전 텍스트 가시. 스크롤 엔진(rAF) **미구동**.
- **reduced에서 JS 파생값 처리**(progress=0 고정 함정 차단):
  - 챕터 미디어: CSS가 `.chapterMedia`를 비-sticky 정적(16:9 등)으로 두어 시대별 사진이 자연 흐름에 표시(progress 미사용).
  - `HistoryYearRail` 활성: rAF 대신 **IntersectionObserver**로 현재 가시 챕터 판정(또는 정적 모드에서
    강조 비활성·동등). `active=round(0)=0` 고정 금지.
- 매체쿼리는 `useMediaFlag`(`useSyncExternalStore`, `getServerSnapshot=()=>false`)로 구독 —
  effect 내 동기 setState 금지(set-state-in-effect는 이 코드베이스에서 lint 에러). SSR에서 reduced=false →
  "정적-가시 기본"과 일관(첫 페인트 깜빡임 없음).

## 12. 모바일 / 반응형 (개정 2 — 모바일도 동일 인터랙션)

| 구간 | 처리 |
|---|---|
| 전 구간(비-reduced) | **데스크톱과 동일한 sticky 스크럽 인터랙션**: 시대별 미디어 풀블리드 sticky + 좌하단 카피 점진 노출 + 크로스페이드. 디스플레이는 `clamp()`로 단계 축소. |
| 모바일(<640px) | 인터랙션 동일. 단 **세로 레일은 숨김**(`display:none`) — 좁은 화면에서 고정 우측 레일이 텍스트와 겹치고 터치타깃이 작아짐. 점프 앵커(#id)는 마크업에 존재. |
| reduced-motion(전 구간) | 정적 스택 폴백(§7.0/§7.1) — 풀블리드 카드 세로 흐름, 전부 가시. |
- **게이트**: `interactive = hydrated && !reduced`(너비 무관). 우리 효과는 scroll-jacking이 아니라 터치 자연 스크롤로 구동되므로 모바일에서도 동작한다(세로 transform/opacity만). MediaCollage가 모바일에서 스크럽을 끈 건 가로 타일 슬라이드가 좁은 화면에 안 맞아서지만, 본 연혁은 세로 스크럽이라 모바일에 적합 — 그래서 분기 정책이 다르다.
- 접근성 레버는 너비가 아니라 `prefers-reduced-motion`(정적 폴백). 다크 배경 폴백(§9)으로 사진 미로드 시에도 흰 텍스트 가독성 보장.

## 13. 성능

- 단일 `rAF` 코얼레싱 + `passive:true` 스크롤/resize 리스너. 언마운트 시 해제. **명령형 갱신이라
  매 프레임 React 재렌더 없음**(state는 `active` 변경 시에만).
- `will-change`: **`.chapterText` 자식에만** opacity/transform(§7.1 제약). sticky/fixed 컨테이너엔 금지.
  잦은 토글이 비용이면 활성 근방만 부여(측정 후 적용).
- placeholder 이미지 `loading="lazy"`(첫 챕터 `priority`/eager). 미디어 레이어 opacity 외 레이아웃 변경 0(리플로우 없음).

## 14. 메인 HistoryBand 연결

- `src/components/main/HistoryBand.tsx`: (1) 하단에 "전체 연혁 보기" 링크(`/about/history`) 추가
  (`tertiary-text`/링크 토큰, 카드 밖 배치 — 중첩 `<a>` 금지). (2) `key={item.year}` → `key={item.id}`로 교체
  (§6 id 도입 일관성). 그 외 메인 티저는 유지. 데이터 변경은 기존 필드 보존이라 안전.

## 15. 테스트 계획

코드베이스 관례: vitest `globals:false` 명시 import, jest-dom 미사용(`getAttribute`/`toBeDefined`),
`next/link` mock, `matchMedia` mock(add/removeEventListener 포함), 장식 img `alt=""`+`container.querySelector`.

- `HistoryStory.test.tsx`: 전 챕터 텍스트(연·헤드·설명·details·significance) DOM 존재 + **`.storyInteractive`
  미적용 시 가시(베이스 fallback)** 검증(무JS 안전 = 노드 존재 AND 가시).
- reduced-motion(matchMedia reduce) → 정적 표시·스크롤 엔진 미구동·미디어 정적 스택·레일 active가 0 고정 아님.
- `HistoryYearRail.test.tsx`: 전 연도 라벨(`historyRailLabel`) 렌더 / 클릭 점프(`scrollTo` mock) / `aria-current="step"`.
- `HistoryChapter.test.tsx`: 미디어(`[data-history-media]` placeholder src·`alt=""`) + 텍스트(연·헤드·설명·details·significance) 렌더, 톤 페어 클래스, 헤딩 `tabindex=-1`·`aria-labelledby`.
- 순수 함수 단위 테스트: 미디어 opacity 산식(`p=center에서 1`, `FADE 경계에서 0`), `t` 노출 단조성, `historyRailLabel`.
  `CHAPTER_VH`·`FADE_VH`는 모듈 상수 export → 테스트가 직접 참조(스펙 §7이 단일 진실임을 코드로 강제).
- `src/app/(site)/about/history/page.test.tsx` 갱신: mock 목록 명시 —
  `vi.stubGlobal("matchMedia", …)`(MediaCollage.test 패턴) · `vi.stubGlobal("scrollTo", vi.fn())` ·
  `requestAnimationFrame` stub. (또는 page는 서버 마크업만 검증하고 HistoryStory 테스트로 분리.)
- 회귀: 기존 `HistoryBand.test.tsx`가 새 데이터 형태(`intro` 추가·`id` 부착·`key` 교체)로 깨지지 않는지 확인.
  `desc` 직접 조회는 `item.desc ?` 가드로 보호.
- 커버리지 80%+ 목표(가이드 테스트 정책).

## 16. 인수 기준 (Acceptance Criteria)

1. `/about/history`가 sticky 미디어 + 7개 챕터 + 세로 연표 레일로 렌더된다.
2. 스크롤 시 미디어가 시대별 **중심정렬 크로스페이드**되고, 텍스트가 연→헤드→설명→details→significance 순 노출.
   **마지막 챕터(2025)의 significance까지 t=1을 완주**한다(§7.2 산술).
3. 레일에서 시대 클릭 시 해당 챕터로 점프 + 헤딩 포커스 이동, `aria-current="step"` 갱신.
4. `prefers-reduced-motion`/무JS에서 모든 콘텐츠가 **정적으로 전부 보이고**(computed opacity=1) 스크롤 엔진이 없으며,
   미디어/레일 활성이 progress=0에 고정되지 않는다.
5. `.storyInteractive` 미적용 상태에서 전 텍스트 computed opacity가 1(점진적 향상 검증).
6. 토큰만 사용(인라인 hex·px·z-index 없음), `typo.*` 적용, 신규 텍스트 위계 미도입, 이모지 없음, 삼항 렌더링 준수.
7. `pnpm lint` + `npx tsc --noEmit` + `pnpm test` 통과, 커버리지 80%+.

## 17. 미해결 / 추후

- 인트로 1줄과 `significance` 카피는 placeholder 성격 — 사용자가 후일 다듬는다. **`significance`는 풀쿼트
  연출 전제**라 일부 단편 요약형 문장(예 2021·2016)은 인용문체로 다듬어야 톤이 맞는다(데이터-연출 의존성).
- 실제 사진·영상 교체(경로 관례 `/public/history/{id}.jpg` 고정).
- (후속) 투명 헤더 합성으로 첫 챕터 풀블리드 강화 검토.

## 18. 검토 반영 (adversarial review changelog, 6 lens)

| # | 심각도 | 발견 | 반영 |
|---|---|---|---|
| 1 | critical | opacity:0 베이스 → 무JS·일반모션 텍스트 비가시 | §7.0 기본값 반전(베이스 가시, `.storyInteractive`만 숨김) |
| 2 | critical | 전역 p가 N 미도달 → 마지막 챕터 후반 누락 | §7.2 챕터별 자체측정 t(핀 구간 완주) |
| 3 | high | 매 프레임 React 재렌더(인터페이스↔성능 모순) | §7/§8 명령형 ref.style, state는 active만 |
| 4 | high | 미디어 크로스페이드 피크가 챕터 시작·끝 공백 | §7.3 중심정렬 + 첫/끝 레이어 유지 |
| 5 | high | z-index 인라인·레일 z 미정 | §7.1 미디어/전경 z 제거, §10 `--z-rail` 토큰 |
| 6 | high | reduced에서 미디어/레일 progress=0 고정 | §11 정지 스택·IO 활성 경로 |
| 7 | high | 레일 점프 포커스 실패(tabindex)·aria-current 값 | §10 `tabindex=-1`+focus, `aria-current="step"` |
| 8 | high | 디렉토리 `about/history` 관례 불일치 | §8 `src/components/history/` |
| 9 | high | HistoryBand key=year, page.test mock 누락 | §14 key=id, §15 mock 목록 명시 |
| 10 | med | 스크림 토큰화 메커니즘 미정 | §9 `@utility scrim-bottom`(color-mix on cover-dark) |
| 11 | med | `useMediaFlag` 출처/공유 미정(동결파일 위험) | §8 `src/lib/hooks/useMediaFlag.ts` 추출 |
| 12 | med | 레일 포커스/탭 순서 | §5 DOM 순서 본문보다 앞 |
| 13 | med | sticky/fixed가 transform·overflow 조상에 깨짐 | §7.1 제약 명문화 |
| 14 | med | 폴백 밝은 배경 + on-dark 대비 깨짐 | §9 배경 톤별 텍스트 페어 |
| 15 | med | 레일 가시 범위·인트로 경계 미정 | §10 스토리 구간만 표시 |
| 16 | med | satisfies/타입 도입 시 tsc 깨짐 | §6 전 항목 id 필수 + satisfies |
| 17 | low | 레일 라벨 도출 규칙·typo·색 미정 | §6 `historyRailLabel`, §10 datetime/on-dark |
| 18 | low | 세로 점유 오버플로(긴 significance) | §9 max-height + 자연흐름 양보 |
| 19 | low | 점프 behavior reduced 단일출처 | §10 공유 플래그 단일 출처 |
| 20 | low | 상수 회귀 가드 부재 | §15 순수함수 단위테스트 + 상수 export |
| 21 | (정제) | 분리 mediaStage는 base/무JS 정적 폴백이 깨짐 | §7.1 미디어를 챕터 내부로 이동(자연 흐름 폴백) |
