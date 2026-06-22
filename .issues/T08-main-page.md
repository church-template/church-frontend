# [T8] 메인 페이지 (13장 + 14A CrossHero)

**라벨:** `page`
**선행:** T7(앱 셸), T6(공통 유틸)
**참조:** 가이드 13장·14A 전체, DESIGN.md(레이아웃·밴드·타이포)

---

## 목적

공개 메인 화면을 구현한다. `GET /api/main` 한 번으로 받은 카드 메타(최신 설교 3·공지 3·다가오는 일정 5)를 **서버 컴포넌트**로 렌더하고, 최상단에 십자가 열쇠구멍 히어로(14A CrossHero)를 얹는다. 메인은 데이터 연동과 연출이 결합된 유일한 화면이다.

---

## 1. 데이터 연동

### 1.1 소스 — `GET /api/main` (공개, 인증 불필요)

응답 `MainResponse = { sermons, notices, upcomingEvents }` — 최신 설교 3 · 공지 3 · 다가오는 일정 5. **카드 메타만**(본문·version 없음, 3.2 원칙).

- **서버 컴포넌트에서 fetch + ISR.** TanStack Query 쓰지 않는다(토큰 불필요 + 서버 Redis 캐시 존재, 15.1 경계).
- **`next: { revalidate: 60 }`** — 백엔드 Redis TTL 60s와 동기(백엔드 답변 F). 콘텐츠 변경은 최대 60s 지연 노출. ETag 없음 → 조건부 요청 불가.

```ts
// app/page.tsx (서버 컴포넌트)
const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/main`, {
  next: { revalidate: 60 },
});
const main: MainResponse = await res.json();
```

- 정렬은 서버가 보장한다(설교 `preachedAt desc`, 공지 고정글 우선, 일정 `startAt asc`) — **프론트 재정렬 금지.**

### 1.2 섹션별 카드 매핑 (13.2)

| 섹션            | 출처               | 카드 표시                                                                           | 클릭 이동                             |
| --------------- | ------------------ | ----------------------------------------------------------------------------------- | ------------------------------------- |
| 최신 설교 3     | `sermons[]`        | title · preacher · preachedAt(datetime 토큰) · series/scripture(있으면 보조) · tags | `/sermons/{id}`                       |
| 공지 3          | `notices[]`        | title · createdAt · isPinned이면 고정 배지                                          | `/notices/{id}`                       |
| 다가오는 일정 5 | `upcomingEvents[]` | title · startAt~endAt · location · allDay면 시간 생략                               | `/events`(캘린더) 또는 `/events/{id}` |

- **일정 표기 엣지**: `endAt=null`=점(단일 시점) 이벤트 → 시작 시각만. `allDay=true`=날짜만.
- datetime은 `parseServerDate`(+09:00 부착, T6)로 파싱. `preachedAt`은 `date`(시간 없음).
- `viewCount`·`author`는 메인 카드에서 생략 권장.
- **빈 배열**: 섹션을 숨기지 말고 EmptyState("등록된 ○○가 없습니다") — 레이아웃 점프 방지. 세 배열 동시 빈 경우는 초기 구축 상태뿐.

---

## 2. 페이지 구성 (13.4 권장 순서)

1. **CrossHero** (14A) — 아래 §3
2. **예배 시간 안내** — 빌드 주입 상수, `schedule-card` 그리드 (API 없음, 13.3/12장)
3. **최신 설교 3** — `sermons[]`
4. **공지 3** — `notices[]`
5. **다가오는 일정 5** — `upcomingEvents[]`
6. **새가족 CTA 밴드** — `cta-band-dark` "처음 오셨나요?" + 오시는 길/새가족 안내 링크
7. **푸터** (T7)

모든 섹션·히어로가 컨테이너 하나(최대 1200px, 좌우 24px = DESIGN.md `layout.container-*`)를 공유한다(14.3). 섹션 상하 패딩 96px(모바일 64px).

---

## 3. 14A CrossHero — 십자가 열쇠구멍 히어로

풀스크린 배경 미디어 위에 어두운 덮개가 깔리고, 덮개에 뚫린 십자가 구멍이 스크롤에 따라 커지며 배경이 화면을 가득 채운다. 풀스크린 후 오버레이 카피가 페이드인.

### 3.1 미디어 주입 (13.3 env)

히어로 타이틀/카피/미디어는 API에 없음 → 빌드 주입. **영상은 정적 에셋(a안)** — 백엔드 미디어 서빙은 Range(206) 미지원이라 seek/스트리밍 부적합(백엔드 답변 E).

```env
NEXT_PUBLIC_HERO_MEDIA_TYPE=video         # video | image
NEXT_PUBLIC_HERO_MEDIA_SRC=/hero.mp4      # 정적 에셋(권장). /api/media/{id}도 동작은 함
NEXT_PUBLIC_HERO_POSTER=/hero-poster.jpeg  # video일 때 강력 권장(폴백)
NEXT_PUBLIC_HERO_CAPTION=말씀과 삶이 만나는 곳\n우리 동네의 교회
```

- env 리터럴 `\n`은 React에서 자동 줄바꿈 안 됨 → 분할 렌더 처리.
- 에셋 스펙: 영상 1920×1080·10~20초 루프·h264 mp4·10MB 이하. 포스터 webp/jpg.
- `HeroMedia` 판별유니온은 **T9 DeptHero와 공유** → `hero/types.ts`로 단일 정의:
  ```ts
  export type HeroMedia =
    | { type: "video"; src: string; poster?: string }
    | { type: "image"; src: string; alt?: string };
  ```

### 3.2 확정 비율 (14A.3 — 변경 시 디자인 재검토)

세로 기둥 폭 16 · 가로 팔 길이 64 · 팔 두께 16 · 교차점 높이 32% · 시작 크기 38% · 덮개 어둡기 0.85.
확정 path: `M -8 -50 H 8 V -26 H 32 V -10 H 8 V 50 H -8 V -10 H -32 V -26 H -8 Z`

### 3.3 참조 구현 (14A.4 — 검증된 코드, 로직 변경 금지)

스크롤·SVG 마스크·transform scale·ease-in(t³) 로직은 그대로 사용한다. (원본 데모의 `import type { HeroMedia } from './DeptHero'`는 위 §3.1 공유 모듈 `./hero/types`로 교체.)

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./CrossHero.module.css";
import type { HeroMedia } from "./hero/types";

interface CrossHeroProps {
  caption: React.ReactNode; // 풀스크린 후 등장 카피
  media: HeroMedia; // 배경(십자가 너머의 세계)
}

// 확정 비율 (14A.3)
const CROSS = { vbw: 16, haw: 64, hbh: 16, cp: 32 };
const START_PCT = 38; // 시작 크기 %
const DIM = 0.85; // 덮개 어둡기

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const segment = (p: number, s: number, e: number) => clamp01((p - s) / (e - s));
const easeIn = (t: number) => t * t * t;

function buildCrossPath() {
  const v = CROSS.vbw / 2,
    h = CROSS.haw / 2;
  const cY = -50 + CROSS.cp;
  const t1 = cY - CROSS.hbh / 2,
    t2 = cY + CROSS.hbh / 2;
  return `M ${-v} -50 H ${v} V ${t1} H ${h} V ${t2} H ${v} V 50 H ${-v} V ${t2} H ${-h} V ${t1} H ${-v} Z`;
}

export default function CrossHero({ caption, media }: CrossHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const holeRef = useRef<SVGPathElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;

    const hero = heroRef.current!,
      sticky = stickyRef.current!;
    const hole = holeRef.current!,
      captionEl = captionRef.current!;

    let startScale = 1,
      targetScale = 10,
      cx = 0,
      cy = 0,
      ticking = false;

    const measure = () => {
      const vw = sticky.clientWidth,
        vh = sticky.clientHeight;
      cx = vw / 2;
      cy = vh / 2;
      startScale = (Math.min(vw, vh) * (START_PCT / 100)) / 100;
      targetScale = Math.max(vw / CROSS.vbw, vh / 100) * 1.1;
      update();
    };

    const update = () => {
      const total = hero.offsetHeight - window.innerHeight;
      const p = clamp01((window.scrollY - hero.offsetTop) / total);

      const pe = easeIn(segment(p, 0, 0.72));
      const s = lerp(startScale, targetScale, pe);
      hole.setAttribute("transform", `translate(${cx} ${cy}) scale(${s})`);

      const pc = segment(p, 0.78, 0.95);
      captionEl.style.opacity = String(pc);
      captionEl.style.transform = `translateY(calc(-50% + ${lerp(30, 0, pc)}px))`;

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    measure();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section ref={heroRef} className={styles.hero}>
      <div ref={stickyRef} className={styles.sticky}>
        <div className={styles.bg}>
          {media.type === "video" && !videoFailed ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              src={media.src}
              poster={media.poster}
              onError={() => setVideoFailed(true)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.type === "video" ? (media.poster ?? "") : media.src}
              alt={media.type === "image" ? (media.alt ?? "") : ""}
            />
          )}
        </div>

        <svg className={styles.cover} aria-hidden="true">
          <defs>
            <mask id="crossMask">
              <rect width="100%" height="100%" fill="white" />
              <path ref={holeRef} d={buildCrossPath()} fill="black" />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill={`rgba(10,15,31,${DIM})`}
            mask="url(#crossMask)"
          />
        </svg>

        <p ref={captionRef} className={styles.caption}>
          {caption}
        </p>
      </div>
    </section>
  );
}
```

```css
/* CrossHero.module.css */
.hero {
  position: relative;
  height: 320vh;
}
.sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.bg {
  position: absolute;
  inset: 0;
  z-index: 1;
}
.bg video,
.bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover {
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
}

.caption {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  z-index: 3;
  text-align: center;
  transform: translateY(calc(-50% + 30px));
  color: #fff;
  font-size: clamp(26px, 4vw, 48px);
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.02em; /* DESIGN.md display 계열 */
  margin: 0;
  opacity: 0;
  will-change: transform, opacity;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.4);
}

@media (prefers-reduced-motion: reduce) {
  .hero {
    height: auto;
  }
  .sticky {
    position: static;
    height: 80vh;
  }
  .cover {
    display: none;
  } /* 덮개 제거 → 배경 그대로 노출 */
  .caption {
    position: absolute;
    opacity: 1;
    bottom: 10%;
    top: auto;
    transform: none;
  }
}
```

### 3.4 토큰 처리 (Q3)

덮개색은 `cover-dark`(#0a0f1f) 토큰으로 노출(T2). **단, 위 검증 로직 내부의 `rgba(10,15,31,0.85)`·SVG 좌표·CSS Module 내 `#fff`는 예외로 인라인 유지**(검증된 데모 코드 변경 금지). 카피 타이포는 DESIGN.md display 계열 토큰과 정합.

### 3.5 미디어·폴백·접근성 (14A.5)

- 영상 onError → poster 폴백. 모바일 자동재생은 `muted`+`playsInline`.
- 투명 네비(T7 `top-nav-transparent`)는 `mix-blend-mode: difference` 또는 흰색 고정으로 가독성 확보.
- prefers-reduced-motion: 덮개 제거, 배경+카피 정적(JS 미등록).
- iOS 주소창: `100vh` 뒤 `100dvh` 중복 선언. 카피는 opacity 0이어도 DOM 존재(SEO). 십자가는 `aria-hidden`.

### 3.6 구현 금지 (14A.6)

- 십자가 구멍을 width/height로 키우기 금지 — transform: scale만(reflow 방지).
- 시작/목표 배율 상수 px 하드코딩 금지 — `measure()`에서 뷰포트 기준 계산.
- scroll에서 rAF 스로틀 없이 DOM 갱신 금지.
- 중앙 헤드라인/스크롤 힌트 추가 금지. 14A.3 비율 임의 변경 금지.

---

## 4. 완료 조건

- [ ] `app/page.tsx` 서버 컴포넌트에서 `/api/main` fetch + `revalidate: 60`
- [ ] 6개 섹션 + 푸터, 단일 컨테이너(1200/24) 공유
- [ ] 카드 매핑(13.2) + 클릭 이동, 일정 엣지(endAt=null·allDay) 표기
- [ ] 빈 배열 EmptyState(섹션 유지)
- [ ] 예배 시간 안내는 빌드 주입 상수(schedule-card 그리드)
- [ ] CrossHero 참조 구현(14A.4) 적용, `HeroMedia`는 `hero/types.ts` 공유
- [ ] 히어로 env 주입, 영상은 정적 에셋(a안), poster 폴백
- [ ] reduced-motion 폴백 동작

## 5. 검수 기준 (14A.7)

- [ ] 첫 화면: 어두운 덮개 + 화면 중앙의 십자가 구멍으로 배경이 비친다(중앙 텍스트·스크롤 힌트 없음).
- [ ] 스크롤 시 십자가가 ease-in 가속으로 커지고, 끝에서 배경이 화면을 100% 덮는다(덮개 완전 소멸).
- [ ] 풀스크린 후에야 카피가 페이드인된다.
- [ ] **모바일(세로)에서 십자가 비례가 데스크톱과 동일하게 유지된다**(교차점이 처지지 않음).
- [ ] 창 비율을 바꿔도 끝에서 항상 배경이 완전히 덮인다(목표 배율 재계산).
- [ ] 영상 URL을 깨뜨리면 poster로 폴백되고 효과는 정상 동작.
- [ ] `/api/media/{id}` 소스로도 정적 에셋과 동일하게 동작.
- [ ] prefers-reduced-motion에서 덮개 없이 배경+카피로 폴백.
- [ ] 스크롤 중 reflow 없이 부드럽다(DevTools Performance).

## 6. 의존 / 후속

- **선행:** T7(레이아웃·네비·푸터·CTA밴드), T6(EmptyState·parseServerDate), T2(cover-dark 토큰)
- **연관:** 카드 클릭 이동 대상 T10(설교)·T11(공지)·T12(일정) — 라우트만 맞으면 독립 진행 가능
