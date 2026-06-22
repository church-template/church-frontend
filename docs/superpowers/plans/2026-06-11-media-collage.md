# MediaCollage 구현 플랜 — 히어로 후속 미디어 콜라주 스크럽

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CrossHero 카피 이후, 풀스크린 미디어가 중앙 라운드 카드로 축소되며 주변 4타일이 슬라이드 인하는 chinhung.co.kr 스타일 스크럽 콜라주 섹션을 추가한다.

**Architecture:** CrossHero(동결)는 건드리지 않고 바로 뒤에 독립 sticky 섹션(220vh)을 둔다. 첫 프레임이 히어로 끝 프레임과 동일(같은 HERO 미디어 풀스크린)이라 핀 해제 핸드오프가 보이지 않는다. 스크럽은 CrossHero와 같은 scroll+rAF 패턴(GSAP 금지), 중앙 축소는 `clip-path: inset(... round ...)`, 타일은 transform+opacity만.

**Tech Stack:** React 19 client component + CSS Module, `Intl` 없음/추가 의존성 없음, vitest + RTL(jsdom). 라디우스는 `--radius-xl` 토큰(24px, globals.css:43 확인됨)을 `getComputedStyle`로 읽어 합성.

**근거 스펙:** `docs/superpowers/specs/2026-06-11-media-collage-design.md` (결정 C1~C5, §4 연출 수치 동결)

**공통 규칙:** pnpm / 커밋 메시지 `<type> : <설명> #9` / JSX 조건부 삼항 / 주석 한국어 WHY / CrossHero·types.ts는 동결(수정 금지)

---

### Task 1: `scrub.ts` 순수 헬퍼

CrossHero 내부 헬퍼와 동일 산식이지만, 동결 파일의 export를 바꾸지 않기 위해 별도 모듈로 만든다(스펙 §3).

**Files:**

- Create: `src/hero/scrub.ts`
- Test: `src/hero/scrub.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/hero/scrub.test.ts
import { describe, it, expect } from "vitest";
import { lerp, clamp01, segment, easeOut } from "./scrub";

describe("scrub helpers", () => {
  it("lerp — 구간 보간", () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(30, 0, 0.5)).toBe(15);
  });

  it("clamp01 — 0~1 고정", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.3)).toBe(0.3);
    expect(clamp01(2)).toBe(1);
  });

  it("segment — 구간 진행도(범위 밖은 0/1)", () => {
    expect(segment(0.1, 0.2, 0.4)).toBe(0);
    expect(segment(0.3, 0.2, 0.4)).toBeCloseTo(0.5);
    expect(segment(0.5, 0.2, 0.4)).toBe(1);
  });

  it("easeOut — 처음 빠르고 끝에서 안착(1-(1-t)³)", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(0.5)).toBeCloseTo(0.875);
    expect(easeOut(1)).toBe(1);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/hero/scrub.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

```ts
// src/hero/scrub.ts
// 스크럽 연출 공용 수학 헬퍼 — CrossHero(동결) 내부 헬퍼와 동일 산식.
// 동결 파일의 export를 바꾸지 않기 위해 별도 모듈로 둔다(MediaCollage 스펙 §3).
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const segment = (p: number, s: number, e: number) =>
  clamp01((p - s) / (e - s));
/** 처음 빠르게 빠지고 끝에서 안착 — 중앙 카드 축소용(스펙 §4) */
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/hero/scrub.test.ts`
Expected: PASS (4건)

- [ ] **Step 5: Commit**

```bash
git add src/hero/scrub.ts src/hero/scrub.test.ts
git commit -m "feat : 스크럽 연출 수학 헬퍼 모듈 추가 #9"
```

---

### Task 2: 콜라주 플레이스홀더 4장 (C2)

PIL 가용 확인됨(hero-poster.jpeg와 동일 방식). 톤이 다른 그라데이션 4장 — 추후 실사진 파일 교체.

**Files:**

- Create: `public/collage-1.jpg` ~ `public/collage-4.jpg` (생성 산출물)

- [ ] **Step 1: 생성** — 프로젝트 루트에서:

```bash
python3 - <<'PY'
from PIL import Image

SPECS = [
    ("collage-1.jpg", 900, 1200, (10, 15, 31), (0, 82, 255)),     # 3:4 세로 — cover-dark→primary
    ("collage-2.jpg", 1200, 900, (22, 24, 28), (90, 110, 160)),   # 4:3 가로
    ("collage-3.jpg", 1216, 760, (10, 15, 31), (120, 140, 180)),  # 16:10
    ("collage-4.jpg", 900, 1200, (16, 20, 40), (60, 80, 130)),    # 3:4 세로
]
for name, w, h, top, bottom in SPECS:
    grad = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / (h - 1)
        grad.putpixel((0, y), tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    grad.resize((w, h)).save(f"public/{name}", quality=85)
    print("saved", name)
PY
```

- [ ] **Step 2: 확인**

Run: `file public/collage-*.jpg`
Expected: JPEG 4장, 각 명시된 해상도

- [ ] **Step 3: Commit**

```bash
git add public/collage-1.jpg public/collage-2.jpg public/collage-3.jpg public/collage-4.jpg
git commit -m "chore : 콜라주 개발용 플레이스홀더 4장 추가 #9"
```

---

### Task 3: `COLLAGE_TILES` 상수 + DESIGN.md 항목 (규칙 4)

**Files:**

- Modify: `src/constants/church.ts` (HERO_CAPTION 아래에 추가)
- Modify: `.claude/rules/DESIGN.md` (Components 절 마지막, "### 폼" 섹션 앞 또는 뒤에 "### 연출" 추가)

- [ ] **Step 1: 상수 추가** — `src/constants/church.ts`의 `HERO_CAPTION` 선언 아래에:

```ts
// 콜라주 타일(MediaCollage 스펙 C2·C4) — 데스크톱 4장, 모바일은 앞 2장만 노출(컴포넌트가 처리).
// 장식 미디어라 alt 기본 "". 의미 있는 사진으로 교체 시 alt도 채운다.
export const COLLAGE_TILES: HeroMedia[] = [
  { type: "image", src: "/collage-1.jpg", alt: "" },
  { type: "image", src: "/collage-2.jpg", alt: "" },
  { type: "image", src: "/collage-3.jpg", alt: "" },
  { type: "image", src: "/collage-4.jpg", alt: "" },
];
```

- [ ] **Step 2: DESIGN.md에 컴포넌트 항목 추가** — `## 컴포넌트 (Components)` 절의 `### 폼` 앞에:

```markdown
### 연출

- **`media-collage`**: 메인 히어로(14A) 직후의 스크럽 섹션. 풀스크린 미디어(히어로와 동일)가
  `clip-path: inset(... round {rounded.xl})`로 중앙 카드로 축소되고, 주변 타일(데스크톱 4·
  모바일 2, `{rounded.xl}` + hairline)이 가장자리에서 슬라이드 인해 캔버스 위 콜라주를 만든다.
  transform/clip-path/opacity만 사용(reflow 금지), reduced-motion은 완성 콜라주 정적 표시.
  슬롯 기하·구간 수치는 스펙(2026-06-11-media-collage-design.md §4)이 단일 진실.
```

- [ ] **Step 3: 타입 체크**

Run: `pnpm exec tsc --noEmit`
Expected: 에러 0

- [ ] **Step 4: Commit**

```bash
git add src/constants/church.ts .claude/rules/DESIGN.md
git commit -m "feat : 콜라주 타일 상수·DESIGN.md media-collage 항목 추가 #9"
```

---

### Task 4: `MediaCollage` 컴포넌트 (TDD)

**Files:**

- Create: `src/hero/MediaCollage.tsx`
- Create: `src/hero/MediaCollage.module.css`
- Test: `src/hero/MediaCollage.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// src/hero/MediaCollage.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import type { HeroMedia } from "./types";
import { MediaCollage } from "./MediaCollage";

// jsdom에는 matchMedia가 없다 — reduced-motion 분기 제어용 스텁(matches만 읽음).
function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: reduced })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const center: HeroMedia = { type: "image", src: "/hero-poster.jpeg" };
const tiles: HeroMedia[] = [
  { type: "image", src: "/collage-1.jpg", alt: "" },
  { type: "image", src: "/collage-2.jpg", alt: "" },
  { type: "image", src: "/collage-3.jpg", alt: "" },
  { type: "image", src: "/collage-4.jpg", alt: "" },
];

describe("MediaCollage", () => {
  it("중앙 미디어 1 + 타일 4를 렌더한다(장식 alt)", () => {
    stubMatchMedia(true);
    const { container } = render(
      <MediaCollage center={center} tiles={tiles} />,
    );
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBe(5);
    imgs.forEach((img) => expect(img.getAttribute("alt")).toBe(""));
    expect(container.querySelector('img[src="/collage-3.jpg"]')).not.toBeNull();
  });

  it("기본 모드에서는 scroll·resize 리스너를 등록한다", () => {
    stubMatchMedia(false);
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<MediaCollage center={center} tiles={tiles} />);
    expect(addSpy.mock.calls.some(([t]) => t === "scroll")).toBe(true);
    expect(addSpy.mock.calls.some(([t]) => t === "resize")).toBe(true);
    addSpy.mockRestore();
  });

  it("reduced-motion이면 리스너를 등록하지 않는다(CSS 정적 폴백)", () => {
    stubMatchMedia(true);
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<MediaCollage center={center} tiles={tiles} />);
    expect(addSpy.mock.calls.some(([t]) => t === "scroll")).toBe(false);
    expect(addSpy.mock.calls.some(([t]) => t === "resize")).toBe(false);
    addSpy.mockRestore();
  });

  it("언마운트 시 리스너를 해제한다", () => {
    stubMatchMedia(false);
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<MediaCollage center={center} tiles={tiles} />);
    unmount();
    expect(removeSpy.mock.calls.some(([t]) => t === "scroll")).toBe(true);
    expect(removeSpy.mock.calls.some(([t]) => t === "resize")).toBe(true);
    removeSpy.mockRestore();
  });

  it("video 타일이 실패하면 poster 이미지로 폴백한다", () => {
    stubMatchMedia(true);
    const videoTiles: HeroMedia[] = [
      { type: "video", src: "/x.mp4", poster: "/collage-1.jpg" },
      ...tiles.slice(1),
    ];
    const { container } = render(
      <MediaCollage center={center} tiles={videoTiles} />,
    );
    const video = container.querySelector("video")!;
    fireEvent.error(video);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector('img[src="/collage-1.jpg"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/hero/MediaCollage.test.tsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 컴포넌트 구현**

```tsx
// src/hero/MediaCollage.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./MediaCollage.module.css";
import { lerp, clamp01, segment, easeOut } from "./scrub";
import type { HeroMedia } from "./types";

export interface MediaCollageProps {
  /** 중앙 카드 — 히어로와 동일 미디어를 넘겨 핸드오프 이음새를 없앤다(스펙 C1·C3) */
  center: HeroMedia;
  /** 주변 타일 — 데스크톱 4장, 모바일은 CSS가 앞 2장만 노출(스펙 C4) */
  tiles: HeroMedia[];
}

// 연출 수치(스펙 §4 동결) — 중앙 inset 목표(%)·타일 진입 구간/거리(vw·vh)
const CENTER = { vEnd: 16, hEnd: 30, hEndMobile: 12, seg: [0, 0.55] } as const;
const MOBILE_MAX = 639; // CSS 모듈의 모바일 분기(max-width: 639px)와 동기
const TILES = [
  { seg: [0.15, 0.7], from: { x: 0, y: -40 } }, // T1 좌상 — 위에서
  { seg: [0.25, 0.8], from: { x: -50, y: 0 } }, // T2 좌하 — 왼쪽에서
  { seg: [0.2, 0.75], from: { x: 50, y: 0 } }, // T3 우상 — 오른쪽에서
  { seg: [0.3, 0.85], from: { x: 0, y: 40 } }, // T4 우하 — 아래에서
] as const;

// 영상/이미지 공용 렌더 — CrossHero와 동일한 onError→poster 폴백(14A.5 패턴).
function CollageMedia({ media }: { media: HeroMedia }) {
  const [videoFailed, setVideoFailed] = useState(false);
  if (media.type === "video" && !videoFailed) {
    return (
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
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 연출용 장식 미디어; 콘텐츠 이미지는 T10에서 next/image
    <img
      src={media.type === "video" ? (media.poster ?? "") : media.src}
      alt={media.type === "image" ? (media.alt ?? "") : ""}
    />
  );
}

export function MediaCollage({ center, tiles }: MediaCollageProps) {
  const rootRef = useRef<HTMLElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // reduced-motion: 스크럽 미등록 — CSS가 완성 콜라주를 정적 표시한다(스펙 §6).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const root = rootRef.current!;
    const centerEl = centerRef.current!;
    // 라디우스는 토큰을 1회 읽어 합성 — 하드코딩 금지(스펙 §4).
    const radius =
      parseFloat(getComputedStyle(root).getPropertyValue("--radius-xl")) || 0;

    let ticking = false;

    const update = () => {
      const total = root.offsetHeight - window.innerHeight;
      const p = clamp01((window.scrollY - root.offsetTop) / total);

      const tc = easeOut(segment(p, CENTER.seg[0], CENTER.seg[1]));
      const hEnd =
        window.innerWidth <= MOBILE_MAX ? CENTER.hEndMobile : CENTER.hEnd;
      const v = lerp(0, CENTER.vEnd, tc);
      const h = lerp(0, hEnd, tc);
      const r = lerp(0, radius, tc);
      centerEl.style.clipPath = `inset(${v}% ${h}% round ${r}px)`;

      tileRefs.current.forEach((el, i) => {
        if (!el) return;
        const conf = TILES[i];
        const tt = segment(p, conf.seg[0], conf.seg[1]);
        el.style.opacity = String(tt);
        el.style.transform = `translate(${lerp(conf.from.x, 0, tt)}vw, ${lerp(conf.from.y, 0, tt)}vh)`;
      });

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <section ref={rootRef} className={styles.collage}>
      <div className={styles.sticky}>
        <div ref={centerRef} className={styles.center}>
          <CollageMedia media={center} />
        </div>
        {tiles.slice(0, TILES.length).map((m, i) => (
          <div
            key={m.src}
            ref={(el) => {
              tileRefs.current[i] = el;
            }}
            className={`${styles.tile} ${styles[`tile${i + 1}`]}`}
          >
            <CollageMedia media={m} />
          </div>
        ))}
      </div>
    </section>
  );
}
```

CSS Module:

```css
/* src/hero/MediaCollage.module.css */
/* 슬롯 %·vw 수치는 스펙 §4 표(연출 수치, 동결)가 단일 진실. 색·라디우스는 토큰 참조. */
.collage {
  position: relative;
  height: 220vh;
  background: var(--color-canvas);
}
.sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.center {
  position: absolute;
  inset: 0;
}
.center video,
.center img,
.tile video,
.tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tile {
  position: absolute;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-xl);
  overflow: hidden;
  opacity: 0; /* 스크럽(JS)이 채운다 — reduced-motion에선 아래 블록이 복원 */
  will-change: transform, opacity;
}

/* 슬롯 기하(스펙 §4) */
.tile1 {
  left: 6%;
  top: 8%;
  width: 17vw;
  aspect-ratio: 3 / 4;
}
.tile2 {
  left: 9%;
  bottom: 10%;
  width: 20vw;
  aspect-ratio: 4 / 3;
}
.tile3 {
  right: 7%;
  top: 16%;
  width: 19vw;
  aspect-ratio: 16 / 10;
}
.tile4 {
  right: 10%;
  bottom: 8%;
  width: 16vw;
  aspect-ratio: 3 / 4;
}

@media (max-width: 639px) {
  .tile3,
  .tile4 {
    display: none;
  }
  .tile1 {
    left: 4%;
    top: 6%;
    width: 36vw;
  }
  .tile2 {
    left: 6%;
    bottom: 6%;
    width: 42vw;
  }
}

@media (prefers-reduced-motion: reduce) {
  /* JS 미등록 — 완성 상태 콜라주를 정적 표시(스펙 §6). 핀 없이 한 화면. */
  .collage {
    height: auto;
  }
  .sticky {
    position: static;
  }
  .center {
    clip-path: inset(16% 30% round var(--radius-xl));
  }
  .tile {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) and (max-width: 639px) {
  .center {
    clip-path: inset(16% 12% round var(--radius-xl));
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/hero/MediaCollage.test.tsx`
Expected: PASS (5건)

- [ ] **Step 5: Commit**

```bash
git add src/hero/MediaCollage.tsx src/hero/MediaCollage.module.css src/hero/MediaCollage.test.tsx
git commit -m "feat : 미디어 콜라주 스크럽 섹션 추가 #9"
```

---

### Task 5: 페이지 통합

**Files:**

- Modify: `src/app/page.tsx` (import 2줄 + JSX 1줄)
- Modify: `src/app/page.test.tsx` (단언 추가)

- [ ] **Step 1: 실패하는 단언 추가** — `src/app/page.test.tsx`의 첫 번째 it("예배·설교·공지·일정 섹션과 CTA·푸터를 합성한다")에서, `render(await Home())`를 `const { container } = render(await Home());`로 받고 마지막에 추가:

```tsx
// 콜라주 타일이 히어로와 예배시간 사이에 합성된다(MediaCollage 스펙 §5)
expect(container.querySelector('img[src="/collage-1.jpg"]')).not.toBeNull();
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/app/page.test.tsx`
Expected: FAIL — collage-1.jpg 이미지 없음

- [ ] **Step 3: page.tsx 수정** — import 블록에 추가:

```tsx
import { MediaCollage } from "@/hero/MediaCollage";
```

`HERO, HERO_CAPTION` import를 다음으로 확장:

```tsx
import { HERO, HERO_CAPTION, COLLAGE_TILES } from "@/constants/church";
```

`<HeroHeaderSync ...>` children 맨 앞(WorshipSection 위)에 삽입:

```tsx
<MediaCollage center={HERO} tiles={COLLAGE_TILES} />
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/app/page.test.tsx`
Expected: PASS (2건)

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/page.test.tsx
git commit -m "feat : 메인에 미디어 콜라주 섹션 합성 #9"
```

---

### Task 6: 전체 게이트 + 시각 검증

- [ ] **Step 1: 전체 테스트·타입·린트**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: 전체 PASS / 에러 0 (coverage 산출물 경고 1건은 알려진 노이즈)

- [ ] **Step 2: 빌드**

Run: `pnpm build`
Expected: 성공, `/` = ƒ Dynamic 유지

- [ ] **Step 3: 브라우저 시각 검증** (dev 서버 + Playwright 또는 수동)

`pnpm dev` 상태에서 http://localhost:3000 을 열어 스크롤 단계별 확인:

1. [ ] CrossHero 카피까지 기존 연출 그대로(회귀 없음)
2. [ ] 히어로 핀 해제 → 콜라주 첫 프레임이 동일 미디어 풀스크린 — **이음새 비가시**
3. [ ] 스크럽 진행: 중앙이 라운드 카드로 축소(easeOut), 캔버스 흰 배경 노출
4. [ ] 타일 4장이 각자 방향·구간으로 슬라이드 인(T1 위→, T2 좌→, T3 우→, T4 아래→)
5. [ ] 스크롤 되감기 시 역재생(가역)
6. [ ] p≥0.85 완성 콜라주 유지 후 핀 해제 → 예배시간 섹션 자연 진입
7. [ ] 모바일 뷰포트(<640): 타일 2장 + 중앙 카드 확대(inset 12%)
8. [ ] reduced-motion: 핀 없이 완성 콜라주 정적
9. [ ] DevTools Performance: 스크럽 중 reflow 없음(clip-path/transform/opacity만)
10. [ ] 헤더: 히어로 이탈 시 라이트 스킨 — 콜라주 위에서 가독성 정상

- [ ] **Step 4: 잔여 변경 확인**

Run: `git status`
Expected: 의도된 파일 외 변경 없음

---

## 스펙 커버리지 매핑

| 스펙 항목                     | 태스크                                       |
| ----------------------------- | -------------------------------------------- |
| C1 독립 섹션·이음새           | Task 4(첫 프레임 inset 0) + Task 6(검증 2)   |
| C2 상수+플레이스홀더          | Task 2, 3                                    |
| C3 중앙 = HERO 정적           | Task 5 (center={HERO})                       |
| C4 4타일·라벨 없음·모바일 2   | Task 4 (CSS 슬롯·media query)                |
| C5 스크럽(가역)               | Task 4 + Task 6(검증 5)                      |
| §4 연출 수치·토큰 라디우스    | Task 4 (CENTER·TILES 상수, getComputedStyle) |
| §5 배치·헤더                  | Task 5 + Task 6(검증 10)                     |
| §6 반응형·reduced-motion·성능 | Task 4 + Task 6(검증 7~9)                    |
| §7 테스트                     | Task 1, 4, 5                                 |
| §3 DESIGN.md 항목             | Task 3                                       |
