# HeroReveal — 십자가 리빌 + 콜라주 단일 타임라인 통합 설계

- 날짜: 2026-07-03
- 상태: 승인됨 (모바일/reduced 처리 = Option A, 사용자 부재로 권장안 채택)
- 관련 이슈: `.issues/20260703_기능개선_메인_히어로_스크롤_이음새_개선.md` (#82 계열)
- 관련 스펙(개정 대상): `docs/superpowers/specs/2026-06-11-media-collage-design.md`

## Context (왜 하는가)

메인 홈 데스크톱에서 스크롤 연출이 두 개의 독립 sticky 섹션으로 나뉘어 있다.

1. `CrossHero` (`src/hero/CrossHero.tsx`, 320vh) — 풀스크린 **영상**(`/hero.mp4`)이 십자가 열쇠구멍 SVG 마스크가 확대되며 선명하게 드러난다.
2. `MediaCollage` (`src/hero/MediaCollage.tsx`, 220vh) — **같은 영상**이 다시 풀스크린으로 시작해 `clip-path`로 중앙 카드로 축소되고 주변 타일 4장이 슬라이드 인한다.

두 섹션이 문서 흐름상 순차 배치라, 히어로의 마지막 풀스크린 프레임이 위로 밀려나는 동안 아래에서 콜라주의 (동일 영상) 풀스크린 프레임이 올라오는 **약 100vh의 이음새 구간**이 생긴다. 사용자 눈에는 "같은 사진이 하나 더 나오는" 중복으로 보인다. 게다가 두 `<video>`가 별개 요소라 재생 시점이 어긋나 **프레임 점프** 위험도 있다.

목표: 십자가로 드러난 **그 영상 한 장**이 그대로 축소되도록, 두 연출을 **단일 타임라인·단일 영상 요소**로 통합해 이음새·중복·프레임 점프를 구조적으로 제거한다.

## Goals / Non-Goals

- Goal: 데스크톱에서 단일 sticky 섹션·단일 `<video>`로 "십자가 리빌 → 홀드 → 카드 축소 → 타일 진입" 연속 타임라인 구현.
- Goal: 4-타일 콜라주 유지(사용자 승인).
- Goal: 헤더 투명↔솔리드 전환을 축소 시작 시점(흰 캔버스 노출)에 정확히 맞춤.
- Non-Goal: 새 테스트 작성(UI 스크럽이라 사용자가 생략 지시). 기존 테스트는 회귀 범위만 점검.
- Non-Goal: 십자가·콜라주의 확정 수치(비율·시작크기·clip 목표) 재설계 — 그대로 계승.

## 결정: 모바일 / reduced-motion 처리 (Option A)

현재는 **모든 모드**에서 영상이 두 번 렌더된다(십자가 풀스크린 + 콜라주 카드). 영상을 1개로 합치면 그 중복이 사라지므로 "모바일 완전 동일"은 구조적으로 불가능하다. 채택안:

- **모바일(<640):** 십자가 열쇠구멍 인트로 생략. 영상을 카드로 바로 보여주고 타일 4장 슬라이드 인(현 `MediaCollage` 모바일 스택 그대로). 카피는 스택 상단 정적 제목(`--color-ink`)으로 이동.
- **reduced-motion 데스크톱:** 80vh 풀스크린 인트로 생략, 완성된 콜라주(중앙 카드 + 타일) 표시. 카피는 카드 위 중앙 유지(텍스트 손실 없음).
- 근거: reduced-motion은 이미 커버(십자가)를 숨긴다 → 모바일도 이에 정렬. 영상 1개 일관. 카피 텍스트는 전 모드 보존(SEO·가독성).

`MediaCollage`가 모바일/reduced에서 하던 동작은 그대로 보존되고, `CrossHero`의 **인트로 부분만** 두 모드에서 빠진다.

## 컴포넌트: `src/hero/HeroReveal.tsx` (신규)

두 컴포넌트의 sticky 레이어(`CrossHero.sticky` + `MediaCollage.frame`)를 **하나의 sticky 레이어**로 병합한다. 내부 `RevealMedia` 헬퍼 = 두 원본이 공유하던 `onError→poster` 폴백 1벌(center·tiles 공용).

Props: `{ media: HeroMedia; caption: ReactNode; tiles: HeroMedia[]; onSolid?: (solid: boolean) => void }`

모드 플래그: 공유 훅 `useMediaFlag`(`src/lib/hooks/useMediaFlag.ts`)로 `REDUCED_MQ`·`MOBILE_MQ` 구독(로컬 재구현 금지). JSX 조건부는 삼항만 사용.

### DOM 트리

```
<section ref={rootRef} className={styles.hero}>          // relative; height ~400vh; bg canvas; overflow-x clip
  <div ref={stickyRef} className={styles.sticky}>        // sticky top:0; height:100dvh; overflow hidden
    <div ref={centerRef} className={styles.center}>      // z1 absolute inset:0; will-change:clip-path
      <RevealMedia media={media} />                      //    ONE <video>(또는 img 폴백)
    </div>
    <svg className={styles.cover} aria-hidden="true">    // z2 absolute inset:0 — 십자가 커버
      <defs><mask id="crossMask">
        <rect width="100%" height="100%" fill="white" />
        <path ref={holeRef} d={buildCrossPath()} fill="black" />
      </mask></defs>
      <rect width="100%" height="100%" fill="rgba(10,15,31,0.85)" mask="url(#crossMask)" />
    </svg>
    {tiles.slice(0, TILES.length).map((m, i) => (        // z3 타일 4장 (.tile .tileN)
      <div key={`${m.src}-${i}`} ref={(el)=>{tileRefs.current[i]=el;}}
           className={`${styles.tile} ${styles[`tile${i+1}`]}`}>
        <RevealMedia media={m} />
      </div>
    ))}
    <p ref={captionRef} className={styles.caption}>{caption}</p>  // z4 opacity 0 (JS 구동)
  </div>
</section>
```

### 스크롤 드라이버 `update()`

효과 게이팅은 원본 그대로: `if (reduced) return;` → `if (isMobile) { …타일 IO 1회… return; }` → 데스크톱 비-reduced 브랜치만 scroll/rAF/resize 등록. deps `[reduced, isMobile]`.

셋업(데스크톱): 라디우스 1회 읽기 `parseFloat(getComputedStyle(root).getPropertyValue("--radius-xl")) || 0`. `measure()`는 `stickyRef`로 십자가 기하 산출(`cx,cy,startScale,targetScale` — CrossHero 산식 그대로). `tileEls = tileRefs.current.slice()` 스냅샷. `lastSolid` 히스테리시스.

`p = clamp01((scrollY - root.offsetTop) / (root.offsetHeight - innerHeight))`. 각 페이즈는 기존 수학 재사용, 구간창만 통합 타임라인으로 이동:

| 페이즈 | 처리 | 출처 |
|---|---|---|
| 1 십자가 확대 | `pe=easeIn(segment(p,P.crossIn[0],P.crossIn[1]))` → `hole.setAttribute("transform", translate(cx cy) scale(lerp(startScale,targetScale,pe)))` | CrossHero + inline easeIn |
| 2·3 카피 인→홀드 | `capIn=segment(p,P.capIn[0],P.capIn[1])` | CrossHero |
| 5a 카피 아웃 | `caption.style.opacity=String(capIn*(1-capOut))`, `capOut=segment(p,P.capOut...)`; `transform=translateY(calc(-50% + lerp(30,0,capIn)px))` | CrossHero + 곱셈 퇴장 |
| 4 축소 | `tc=easeOut(segment(p,P.shrink...))` → `center.style.clipPath=inset(lerp(0,CENTER.vEnd,tc)% lerp(0,CENTER.hEnd,tc)% round lerp(0,radius,tc)px)` | MediaCollage clip-path |
| 5b 타일 | 각 타일 `tt=segment(p,TILES[i].seg...)`; `opacity=tt`; `transform=translate(lerp(from.x,0,tt)vw, lerp(from.y,0,tt)vh)` | MediaCollage 타일 |
| 헤더 | `const solid=p>=P.solid; if(solid!==lastSolid){lastSolid=solid; onSolid?.(solid);}` | 신규 |

`ticking`/`requestAnimationFrame(update)` on scroll, `measure` on resize, mount 시 `measure()`. cleanup은 리스너 제거 + 인라인 스타일 클리어(`center.style.clipPath=""`, 타일 opacity/transform `""`, caption `""`, hole transform 리셋) — 브레이크포인트 전환 시 스테일 인라인이 모바일/reduced CSS를 덮지 않게. `easeIn`은 HeroReveal 내부 inline 유지(CrossHero 예외 계승), `lerp/clamp01/segment/easeOut`은 `./scrub` import.

### 계승 상수 (재설계 금지)

`CROSS={vbw:16,haw:64,hbh:16,cp:32}`, `START_PCT=38`, `DIM=0.85`, `CENTER={vEnd:14,hEnd:34}`, 타일 `from`·슬롯 기하, 카피 clamp 폰트, 라디우스=`--radius-xl`. `buildCrossPath()`도 그대로 이식.

### 신규 통합 타임라인 상수 `P` (튜닝 가능)

```
crossIn: [0.00, 0.34]   // easeIn 열쇠구멍
capIn:   [0.36, 0.46]   // 카피 페이드/슬라이드 인
// 홀드 0.46–0.54 (선명한 풀스크린 영상 + 카피)
solid:    0.50          // onSolid(true) 임계 — 흰 캔버스 상단 노출 직전
shrink:  [0.54, 0.84]   // easeOut clip-path 축소
capOut:  [0.54, 0.62]   // 카피 페이드 아웃
// 타일 스태거(축소~꼬리):
// T1 [0.62,0.86] {x:0,y:-40}  T3 [0.64,0.88] {x:50,y:0}
// T2 [0.66,0.90] {x:-50,y:0}  T4 [0.70,0.96] {x:0,y:40}
section height: .hero { height: 400vh }
```

400vh → 300vh 스크롤. 십자가 리빌 `0.34×300≈102vh`(현 CrossHero easeIn ~158vh보다 약간 빠름). 리뷰 시 급하면 `.hero`를 440~460vh로 올림(구간 비율 유지·전 페이즈 균등 확대). `solid=0.50`은 홀드 안(shrink 0.54 직전) — 헤더가 조금 이르면 0.52~0.54로.

## CSS: `src/hero/HeroReveal.module.css` (신규)

- **데스크톱(기본):** 두 원본 병합. `.hero`(relative·400vh·canvas·overflow-x clip), `.sticky`(sticky top0·100dvh·overflow hidden), `.center`(absolute inset0·z1·will-change clip-path), `.cover`(absolute inset0·z2), `.tile`(absolute·z3·hairline 보더·radius-xl·opacity0·will-change), `.caption`(absolute·z4·clamp 폰트·on-dark·opacity0), `.tile1..4` 슬롯 기하(MediaCollage 그대로), 미디어 `object-fit:cover`.
- **모바일 `@media (max-width:639px)`:** MediaCollage 모바일 리플로우를 `.sticky`에 적용. `.hero{height:auto;padding}`, `.sticky{static·flex column·gap}`, `.cover{display:none}`, `.center{static·aspect 4/5·radius-xl}`, `.tile{static·76vw·transition}`, `.tile1,3`/`.tile2,4` 좌우 대기 위치·`.tileShown` 복원. `.caption{static·opacity1·order:-1·--color-ink·no shadow·clamp(22px,6vw,32px)}`.
- **reduced-motion `@media (prefers-reduced-motion:reduce)`:** `.hero{height:auto}`,`.sticky{static}`,`.cover{display:none}`, 타일 정적. `and (min-width:640px)`: `.sticky{100dvh}`, `.center{clip-path:inset(14% 34% round var(--radius-xl))}`(완성 콜라주), `.caption{opacity1·translateY(-50%)}`.

## 헤더 배선: `src/components/main/HeroHeaderSync.tsx` (수정)

`onSolid(boolean)` 콜백 방식 채택(센티넬/IO 아님) — 드라이버가 매 프레임 `p`를 알아 `p>=0.5`에서 정확히 통지, DOM 추가 없음. 기존 IO(전체 400vh 이탈 시 발화 = 타이밍 반대)는 제거.

- Props에 `tiles: HeroMedia[]` 추가.
- `CrossHero`→`HeroReveal` 교체, `heroWrapRef`·IO effect 삭제.
- `useReducedMotion()` 유지 + `const isMobile = useMediaFlag(MOBILE_MQ)` 추가.
- `const [solid,setSolid]=useState(false)`.
- 렌더: `<SiteHeader variant="transparent" solid={reduced || isMobile || solid} />` + `<main><HeroReveal media caption tiles onSolid={setSolid}/>{children}</main>`.
- 근거: 모바일/reduced는 흰 캔버스 정적 스택이라 on-dark 투명 헤더가 안 보임 → 처음부터 solid(현 reduced 논리와 동일). `onSolid`는 임계 교차라 양방향(스크롤 업 시 데스크톱 투명 복귀).

## 페이지: `src/app/page.tsx` (수정)

- `import { MediaCollage }` 제거, `<MediaCollage>` 자식 삭제.
- `COLLAGE_TILES`를 래퍼로 전달: `<HeroHeaderSync media={HERO} caption={caption} tiles={COLLAGE_TILES}>` + 나머지 섹션(HistoryBand 등)은 children 유지.
- `HERO`·`HERO_CAPTION`·`COLLAGE_TILES` import 유지.

## 정리 / 회귀 (커밋·삭제는 별도 승인)

- **병합 후 미참조(삭제는 사용자 허락 필요):** `CrossHero.tsx`/`.module.css`/`.test.tsx`, `MediaCollage.tsx`/`.module.css`/`.test.tsx`. 이번 작업에선 **삭제하지 않고** 방치(참조 없음). 승인 시 별도 제거.
- **유지 필수:** `scrub.ts`(+`scrub.test.ts`) — HeroReveal이 재사용, `types.ts`(constants·DeptHero 전역), `useMediaFlag.ts`, `DeptHero.*`(독립).
- **회귀 주의:**
  - `src/app/page.test.tsx:97`은 `img[src="/collage-1.jpg"]`가 History 밴드보다 앞에 있는지 검증. HeroReveal이 reduced-motion에서도 타일 이미지를 마크업에 렌더하므로(page.test는 reduced matchMedia 스텁) **수정 없이 통과** 예상 — 구현 후 실측.
  - `src/components/main/HeroHeaderSync.test.tsx`는 제거되는 IO 투명→솔리드 흐름을 검증 → **깨질 수 있음**. 새 테스트 미작성 방침이라 구현 후 실패 범위만 보고, 재작성 여부는 사용자 결정.
  - `CrossHero.test.tsx`/`MediaCollage.test.tsx`는 파일을 삭제하지 않으므로 계속 통과(죽은 코드 테스트).

## 제약 (프로젝트 규칙 준수)

- hex/px 인라인 금지 — 토큰 참조. 예외 계승: 십자가 SVG 좌표·`rgba` 커버·`START_PCT` 등 검증 수치 inline 허용.
- 애니는 transform/clip-path/opacity만(reflow 금지), `will-change`는 원본 수준 유지.
- reduced-motion 데스크톱 스크럽 경로는 scroll/IO 미등록(CSS가 정적 상태 표시).
- 삼항 조건부 렌더링, 라디우스 토큰 1회 읽기, 카피는 CrossHero 인라인 clamp 패리티 유지.

## 검증 (구현 후)

1. `pnpm build` 통과(타입·프리렌더). CI는 백엔드 없이 빌드하므로 `await connection()` 경로 영향 없음 확인.
2. `pnpm lint`(effect 내 setState 규칙, 삼항 규칙) 통과.
3. `pnpm test` 실행 — 위 회귀 주의 항목 실측(page.test 통과 여부, HeroHeaderSync.test 실패 범위).
4. `pnpm dev` 육안: 데스크톱에서 십자가 리빌 → 홀드 → **동일 영상** 카드 축소 → 타일 진입이 이음새/중복/프레임점프 없이 이어지는지, 헤더가 축소 시작에 solid 전환하는지, 스크롤 업 복귀 시 투명 복귀하는지. 모바일/reduced에서 정적 스택·카피 제목 표시 확인.

## 리스크 / 오픈

1. 모바일/reduced에서 십자가 인트로 생략(Option A) — 사용자 부재로 권장안 채택, 추후 되돌림 가능.
2. 커버(스케일 SVG) + clip-path 영상이 같은 sticky 레이어 공존 → 저사양 GPU 합성 잰크 육안 확인(원본은 각각은 정상).
3. `capIn*(1-capOut)` 카피 인→홀드→아웃이 "선명 홀드" 비트로 읽히는지 튜닝.
4. HeroHeaderSync.test 회귀(위).
