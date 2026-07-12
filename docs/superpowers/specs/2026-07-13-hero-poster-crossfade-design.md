# 히어로 포스터 크로스페이드 + 영상 페이로드 감축

- 날짜: 2026-07-13
- 대상: `src/hero/HeroReveal.tsx`, `src/hero/HeroReveal.module.css`, `public/hero.mp4`, `public/hero-poster.jpeg`
- 선행 스펙: `2026-07-03-hero-reveal-merge-design.md` (십자가 리빌 + 콜라주 단일 타임라인)

## 1. 배경

메인 히어로는 `HeroReveal` 하나가 십자가 열쇠구멍 → 카피 → 카드 축소 → 타일 콜라주를 단일
스크럽 타임라인으로 연출한다. 중앙 카드는 `/hero.mp4`를 재생한다.

두 가지 문제가 있다.

**연출** — 카드가 축소된 뒤에도 작은 카드 안에서 17초 루프가 계속 돈다. 콜라주는 정지 사진들의
구성인데 중앙만 움직여서 결이 어긋난다.

**페이로드** — `hero.mp4`는 1920×1080 / 17.2초 / H.264인데 **87.1MB(약 42Mbps)** 다. 웹 히어로
루프의 적정 비트레이트(2~4Mbps)의 10배 이상이다. 게다가 모바일에서도 그대로 다운로드된다:
`HeroReveal.module.css`의 모바일 분기는 십자가·스크럽 연출만 끄고 `<video autoPlay>` 자체는
남겨두기 때문이다.

## 2. 목표

1. 중앙 카드가 축소되는 동안 영상이 `hero-poster.jpeg`로 서서히 전환되어, 축소가 끝나는 시점에
   완전한 정지 사진이 된다. 스크롤을 되올리면 영상으로 복귀한다.
2. 모바일(<640px)과 `prefers-reduced-motion` 사용자는 영상 바이트를 **0** 받는다.
3. 데스크톱이 받는 영상 용량을 87MB → 약 6MB로 줄인다.

## 3. 렌더링 전략 (SSR/CSR/SSG) — 변경 없음

검토했고 **바꾸지 않는다.**

`hero.mp4`와 `hero-poster.jpeg`는 `/public` 정적 에셋이다. HTML에 인라인되는 게 아니라 URL로
참조될 뿐이라, 페이지를 SSR로 그리든 SSG로 미리 굽든 CSR로 넘기든 브라우저가 내려받는 미디어
바이트는 **완전히 동일하다.** 렌더 전략은 이 문제의 레버가 아니다.

레버는 세 개뿐이다: (a) 파일을 작게 만들기, (b) 안 필요한 클라이언트에 안 보내기, (c) 늦게 받기.
이 스펙은 (a)와 (b)를 한다.

메인 페이지는 현재 `await connection()` + `fetch(revalidate: 60)` 조합을 유지한다. CI가 백엔드
없이 빌드하므로 prerender를 요청 시점으로 미루되 데이터 캐시는 살리는 구조이며, 이 스펙과
무관하다.

## 4. 설계 A — 포스터 크로스페이드

### 4.1 마크업

`.center` 안, 영상 위에 포스터 `<img>`를 겹친다.

```tsx
<div ref={centerRef} className={styles.center}>
  <RevealMedia media={media} />
  {media.type === "video" && media.poster ? (
    <img ref={posterRef} className={styles.posterOverlay} src={media.poster} alt="" aria-hidden="true" />
  ) : null}
</div>
```

- 조건부는 삼항(CLAUDE.md 규칙).
- 장식 미디어라 `alt=""` + `aria-hidden`. `@next/next/no-img-element`는 기존 `RevealMedia`와 동일하게
  eslint-disable 주석으로 예외 처리한다(연출용 장식 미디어).
- `src`는 `<video poster>`와 같은 URL이라 **추가 네트워크 요청이 없다** — 이미 캐시에 있다.

### 4.2 스크럽

`update()`에 한 줄을 더한다. 축소 진행도 `tc`는 이미 계산되어 있다.

```ts
const tc = easeOut(segment(p, P.shrink[0], P.shrink[1]));  // 기존
// ... 기존 clip-path 합성 ...
if (posterEl) {
  posterEl.style.opacity = String(tc);   // 추가
}
```

축소(`P.shrink = [0.54, 0.84]`)와 **동일 구간·동일 이징**을 쓴다. 카드가 줄어드는 동작과 영상이
사진으로 굳는 동작이 하나로 읽힌다. 스크럽은 스크롤 위치의 순수 함수라 되감기는 별도 코드 없이
동작한다.

cleanup에서 `posterEl.style.opacity = ""`로 인라인 스타일을 지운다(기존 패턴과 동일 — 브레이크포인트
전환 시 스테일 인라인이 CSS를 덮지 않게).

### 4.3 CSS

```css
.posterOverlay {
  position: absolute;
  inset: 0;
  opacity: 0;           /* 데스크톱: 스크럽(JS)이 채운다 */
  will-change: opacity;
}
```

`z-index`는 필요 없다 — 절대배치된 요소는 같은 부모 안의 비배치 콘텐츠(`<video>`) 위에 그려진다.
`width/height/object-fit: cover`는 기존 `.center img` 규칙이 이미 적용한다.

**모바일에서는 `display: none`.** 단순한 미관 문제가 아니라 필수다 — 모바일에서 `.center`는
`position: static`이 되므로, 절대배치된 오버레이가 `.center` 밖으로 탈출해 엉뚱한 곳에 뜬다.
모바일은 어차피 스크럽이 없고 `<video>`가 poster를 직접 표시하므로(§5) 오버레이가 필요 없다.

```css
@media (max-width: 639px) {
  .posterOverlay { display: none; }
}
```

`prefers-reduced-motion`에는 별도 규칙이 **필요 없다.** reduced에서는 `<source>`가 매칭되지 않아
`<video>`가 poster를 직접 표시하고(§5), 오버레이는 opacity 0인 같은 이미지라 결과 픽셀이 동일하다.

### 4.4 채택하지 않은 것

**축소 완료 시 `video.pause()`** — 하지 않는다. 영상이 완전히 가려지는 구간은 `p` 0.84~1.0
(400vh 중 약 64vh)로 짧고, `.sticky`가 뷰포트를 벗어나면 브라우저가 오프스크린 디코딩을 알아서
중단한다. 상태 플래그 + autoplay 정책 `catch` + 되돌릴 때 `play()` 재개까지 붙는 값에 비해 이득이
작다. 배터리 이슈가 실제로 보고되면 그때 추가한다.

## 5. 설계 B — 안 필요한 클라이언트에 영상을 안 보내기

### 5.1 문제: JS로는 막을 수 없다

`useMediaFlag`는 `useSyncExternalStore`의 SSR 스냅샷이 `false`라 서버에서 항상 "모바일 아님"으로
렌더한다. 즉 SSR HTML에 `<video src="/hero.mp4" autoplay>`가 그대로 실린다. 브라우저 preload
scanner는 하이드레이션을 기다리지 않고 즉시 요청을 시작하므로, 하이드레이션 후 `<video>`를
언마운트해도 이미 받기 시작한 뒤다.

CSS `display: none`도 안 된다 — 숨겨진 `<video preload="metadata">`가 여전히 range 요청으로
파일을 받아간다는 것이 실측으로 확인됐다.

### 5.2 해법: `<source media>`

`<video>`의 `src` 속성을 없애고 `<source>` 자식에 미디어쿼리를 건다.

```tsx
<video autoPlay muted loop playsInline preload="metadata" poster={media.poster}>
  <source src={media.src} media={VIDEO_MQ} />
</video>
```

```ts
// 영상을 실제로 재생할 환경 — 이 쿼리가 안 맞으면 브라우저는 source를 건너뛰고 poster만 띄운다.
// MOBILE_MQ("(max-width: 639px)")의 여집합 + reduced-motion 제외.
const VIDEO_MQ = "(min-width: 640px) and (prefers-reduced-motion: no-preference)";
```

`<video>`에 `src` 속성이 남아 있으면 `<source>` 자식이 무시되므로 **반드시 제거**한다.

### 5.3 근거 (검증됨)

WHATWG HTML 스펙 [4.8.2 The source element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element):

> If present, the value must contain a valid media query list. The user agent will skip to the next
> `source` element if the value does not match the environment.

리소스 선택 알고리즘 단계에서 skip되므로 **fetch가 시작되지 않는다.** Playwright Chromium
네트워크 탭 실측으로 확인: 뷰포트 400px에서 `media="(min-width:640px)"`가 걸린 mp4는 HTML에 URL이
박혀 있어도 요청이 0건이었다.

매칭되는 source가 하나도 없을 때의 동작 — [Loading the media resource](https://html.spec.whatwg.org/multipage/media.html#loading-the-media-resource):

> Set the element's `networkState` attribute to the `NETWORK_NO_SOURCE` value.
> **Set the element's show poster flag to true.**

즉 **poster가 계속 표시된다.** 실측에서도 `video.error`는 `null`이었고(`MEDIA_ERR_SRC_NOT_SUPPORTED`
아님), error 이벤트는 `<video>`가 아니라 `<source>`에 발생했다.

`object-fit: cover`는 `<video>`의 poster 표시에도 적용되므로 기존 `.center video` 규칙이 그대로
작동한다.

### 5.4 함께 삭제되는 코드

`<video>`의 error 이벤트가 발생하지 않으므로 `RevealMedia`의 `onError → videoFailed → <img>` 폴백은
**영원히 발화하지 않는 죽은 코드**가 된다. 삭제한다.

기능 손실이 아니다. 이 폴백의 목적(영상을 못 틀면 포스터를 보여준다)을 네이티브 "show poster
flag"가 정확히 같은 결과로 수행한다 — 영상 404든, 코덱 미지원이든, 미디어쿼리 미매칭이든
`<video poster>`가 포스터를 띄운다. JS 상태 기계를 플랫폼 동작으로 대체하는 것이다.

결과적으로 `RevealMedia`에서 `useState`가 사라진다(import도 정리).

### 5.5 감수하는 것

- **레거시 브라우저**: Chrome/Edge <120, Firefox <120은 `media`를 무시하고 "첫 번째 재생 가능한
  source"를 고른다. 즉 구형 모바일 브라우저는 영상을 받는다. 재인코딩 후엔 6MB이고 2026년 기준
  점유율이 미미해 수용한다. (Safari는 제거된 적 없이 계속 지원. Chrome/FF는 2014년 스펙에서
  빠졌다가 2023년 말 M120/FF120에서 복귀.)
- **리사이즈 재평가 없음**: `<picture>`와 달리 `<video>`의 `media`는 리소스 선택 시 **1회만**
  평가된다. 데스크톱 창을 모바일 폭으로 줄여도 영상이 계속 재생되고, 그 반대도 영상이 시작되지
  않는다. `video.load()`를 명시 호출해야 전환되는데, 재생 상태·`currentTime`이 리셋되고 파일을
  통째로 다시 받는다. 히어로 자동재생 영상에서 실사용자가 뷰포트 폭을 넘나드는 일은 드물어
  대응하지 않는다.

## 6. 설계 C — 에셋 재인코딩

실측 결과(확정):

| 파일 | 전 | 후 | 감축 |
|---|---|---|---|
| `hero.mp4` | 87.1MB (1920×1080, 17.2s, 약 42Mbps) | **7.1MB** | 92% |
| `hero-poster.jpeg` | 1.3MB (2832×2148) | **406KB** (1920×1456) | 69% |

```bash
ffmpeg -i public/hero.mp4 \
  -c:v libx264 -crf 28 -preset slow \
  -an -movflags +faststart -pix_fmt yuv420p \
  hero-new.mp4

ffmpeg -i public/hero-poster.jpeg -vf scale=1920:-2 -q:v 4 hero-poster-new.jpeg
```

- `-crf 28 -preset slow` — 1080p 유지. CRF 26은 9.6MB, 28은 7.1MB였고 정지 프레임 육안 비교에서
  아티팩트가 보이지 않아 28로 확정했다.
- `-an` — 오디오 트랙 제거. `muted`라 무용지물이다.
- `-movflags +faststart` — moov atom을 파일 앞으로. 전체 다운로드를 기다리지 않고 즉시 재생 시작.
  (교체 후 파일 앞 2KB 내에 `moov`가 있음을 확인했다.)
- `-pix_fmt yuv420p` — 브라우저 호환 픽셀 포맷.

포스터는 **1920px로 축소 후** 재압축한다(코드 변경 0). 원본 2832px는 과하다 — 포스터가 불투명하게
표시되는 최대 크기는 축소된 카드(약 614 CSS px)이고, 풀스크린으로 보이는 순간은 영상 로드 전
찰나뿐이다. 모바일·reduced-motion에서 포스터가 히어로의 **전부**가 되므로 1.3MB 감축은 실질적인
이득이다.

**원본 백업**: 사용자가 이미 별도 백업을 보유하고 있음을 확인했다. 저장소 내 추가 백업은 두지
않는다.

**git**: `hero.mp4`는 현재 untracked라 저장소에 없다(87MB는 커밋이 무리였다). 6MB로 줄어든 뒤
커밋한다 — 그러지 않으면 배포처에 파일이 없다. `hero-poster.jpeg`는 이미 tracked이므로 재압축본이
diff로 잡힌다.

## 7. 검증

UI/UX 변경이라 단위 테스트는 작성하지 않는다. "영상을 안 받는다"는 단위 테스트로 증명할 수 없고
(jsdom에는 리소스 선택 알고리즘이 없다), 크로스페이드는 눈으로 봐야 한다. 브라우저가 게이트다.

Playwright(Chromium)로 실행한 결과 — **전부 통과**:

| 검증 | 기대 | 실측 |
|---|---|---|
| 모바일 400px — 영상 요청 | 0건 | **0건** (poster만 요청) |
| 모바일 400px — `<video>` 상태 | poster 표시 | `networkState: 3`(NETWORK_NO_SOURCE), `error: null`, poster 표시 |
| `<video>`의 `src` 속성 | 없음 | `hasAttribute("src") === false` |
| `<source media>` | `VIDEO_MQ` | `(min-width: 640px) and (prefers-reduced-motion: no-preference)` |
| 데스크톱 1440px — 영상 요청 | 1건 | **1건** (206 Partial Content) |
| 크로스페이드 (p 0.54→0.84) | 0 → 1 | 0.00 → 0.61 → 0.88 → 0.98 → **1.00** |
| 되감기 (축소 완료 → 홀드) | 포스터 사라지고 영상 복귀 | `posterOpacity: 0`, `videoPlaying: true` |
| reduced-motion — 영상 요청 | 0건 | **0건** (`networkState: 3`, `error: null`) |
| faststart | moov가 파일 앞쪽 | 앞 2KB 내 확인 |

`pnpm lint` 통과. `npx tsc --noEmit`은 에러 1건이지만 `HeroHeaderSync.test.tsx(38,6)`의 **기존
문제**로, 변경 전 HEAD에서도 동일하게 재현됨을 확인했다(이 스펙과 무관).

## 7.1 알려진 사항 (이 스펙 범위 밖)

**포스터는 영상의 프레임이 아니다.** 영상은 드론으로 내려다본 교회 간판 클로즈업이고,
`hero-poster.jpeg`는 지상에서 올려다본 교회 전경(십자가·꽃·하늘)이다. 따라서 크로스페이드는
"영상이 정지 사진으로 굳는" 게 아니라 **두 다른 컷 사이의 디졸브**이며, 전환 중간 구간에서
이중노출처럼 겹쳐 보인다. 요청 시 `hero-poster.jpeg`가 명시적으로 지목되었으므로 의도로 간주하고
그대로 둔다. 원치 않으면 포스터 이미지만 영상 프레임으로 교체하면 된다(코드 변경 불필요).

**모바일 히어로 카피가 헤더에 가려진다.** 모바일에서 카피 `<p>`는 `order: -1`로 스택 최상단에
오지만 `getBoundingClientRect().top === 0`이라 80px 고정 헤더 뒤로 들어간다. 이 스펙 이전부터
있던 레이아웃 문제이며 카피·패딩을 건드리지 않았으므로 그대로 둔다.

## 8. 범위 밖 (언급만)

`src/hero/MediaCollage.tsx`와 `src/hero/CrossHero.tsx`는 `HeroReveal`로 병합된 뒤 각자의 테스트
파일에서만 참조되는 죽은 코드다(`page.tsx`는 `HeroHeaderSync` → `HeroReveal`만 사용). 이 스펙에서는
건드리지 않는다. 정리는 별도 요청 시 진행한다.
