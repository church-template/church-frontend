# 인터랙티브 연혁 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 단순 리스트 `/about/history`를 배경 미디어가 sticky로 크로스페이드되고 텍스트가 스크롤에 따라 점진 노출되는 인터랙티브 연혁 스토리로 교체한다.

**Architecture:** 미디어는 각 챕터 내부에 두고(별도 stage 없음), 베이스 CSS는 전부 가시(무JS·reduced 안전)·`.storyInteractive` 클래스에서만 sticky 크로스페이드를 켠다. 진행도는 챕터별 자체측정 `t`(핀 구간 기준)로 산출하고, 갱신은 명령형(ref.style, 매 프레임 리렌더 없음)·React state는 레일 `active`만. 데이터는 상수(`HISTORY`) 구동(백엔드 무관).

**Tech Stack:** Next.js 16 App Router(서버 페이지 + client 스토리) · TypeScript · Tailwind v4 토큰 · CSS Module · vitest(jsdom, globals:false) · 기존 `scrub.ts` 수학 재사용.

## Global Constraints

- 패키지 매니저 **pnpm**. 테스트 `pnpm exec vitest run <path>`, 타입체크 `pnpm exec tsc --noEmit`, 린트 `pnpm lint`.
- **토큰만**: 인라인 hex·px·z-index 금지(globals.css `@theme` → Tailwind 유틸). arbitrary value(`bg-[#...]`) 금지. 폭은 `max-w-[var(--container-max)]` 식 var() 참조만.
- **타이포는 `typo.*`**(`src/constants/typography.ts`)만. **신규 텍스트 위계 도입 금지**(기존 토큰만). 부득이 추가 시 globals.css `@theme --text-*` + `src/lib/utils.ts` `extendTailwindMerge` font-size 목록까지 등록(utils.test.ts 회귀 감시).
- **이모지 금지**, 아이콘은 `lucide-react`만(이 기능은 아이콘 미사용).
- **JSX 조건부는 삼항** `{cond ? <X/> : null}` (`{cond && <X/>}` 금지). 단 `cn(...)` 내부 className 조합의 `&&`/삼항은 허용.
- **불변 패턴**(기존 객체 변형 금지). 파일 200~400줄 권장.
- 테스트는 vitest **globals:false** — `import { describe, it, expect, vi, afterEach } from "vitest"` 명시. jest-dom 미사용(`getAttribute`/`toBeDefined`). `next/link`·`matchMedia`·`IntersectionObserver`는 테스트에서 stub/mock. 셋업 `vitest.setup.ts`가 `scrollIntoView`·`ResizeObserver`를 이미 스텁함.
- **커밋**: 메시지 형식 `<type> : <설명> #<issue>` — 실행 전 이 기능의 GitHub 이슈를 발급해 모든 `#<issue>`를 그 번호로 치환. **Co-Authored-By 태그 금지.** 프로젝트 규칙상 실제 `git commit`은 사용자 명시 요청 시에만 수행(미요청 시 스테이징까지만, 각 태스크 끝 커밋 단계는 그 시점에 일괄).
- 공개 페이지 경계: 페이지(`page.tsx`)는 **서버 컴포넌트**(상수 주입, fetch 없음 → `connection()` 불필요), 스토리는 client.

---

## Task 1: 데이터 모델 + 레일 라벨 헬퍼

**Files:**
- Modify: `src/constants/content.ts` (HISTORY 블록 + 상단 import + 헬퍼)
- Test: `src/constants/content.test.ts` (create)

**Interfaces:**
- Produces:
  - `export interface HistoryItem { id: string; year: string; text: string; desc: string; details: string[]; significance: string; media?: HeroMedia }`
  - `export interface HistoryContent { title: string; intro: string; items: HistoryItem[] }`
  - `export const HISTORY` (타입 `satisfies HistoryContent`)
  - `export function historyRailLabel(year: string): string`

- [ ] **Step 1: Write the failing test** — `src/constants/content.test.ts`

```tsx
import { describe, it, expect } from "vitest";
import { HISTORY, historyRailLabel } from "./content";

describe("HISTORY 데이터", () => {
  it("7개 항목 모두 고유 id를 가진다", () => {
    const ids = HISTORY.items.map((i) => i.id);
    expect(ids.length).toBe(7);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("모든 항목이 필수 필드를 가진다", () => {
    for (const item of HISTORY.items) {
      expect(item.year).toBeTruthy();
      expect(item.text).toBeTruthy();
      expect(item.desc).toBeTruthy();
      expect(item.details.length).toBeGreaterThan(0);
      expect(item.significance).toBeTruthy();
    }
  });

  it("intro 한 줄을 가진다", () => {
    expect(HISTORY.intro).toBeTruthy();
  });
});

describe("historyRailLabel", () => {
  it("연월을 'YYYY.M'으로 축약한다", () => {
    expect(historyRailLabel("2011년 4월")).toBe("2011.4");
  });
  it("연도만이면 'YYYY'를 반환한다", () => {
    expect(historyRailLabel("2015년")).toBe("2015");
  });
  it("형식이 다르면 원문을 반환한다", () => {
    expect(historyRailLabel("미정")).toBe("미정");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/constants/content.test.ts`
Expected: FAIL — `historyRailLabel` is not exported / `id` 없음.

- [ ] **Step 3: Modify `src/constants/content.ts`**

상단 import에 추가(다른 import 아래):
```ts
import type { HeroMedia } from "@/hero/types";
```

기존 `export const HISTORY = { ... }` 블록 전체를 아래로 교체(인터페이스 추가 + 7개 항목에 `id`·`media` 부여 + `intro` 추가 + `satisfies`):
```ts
export interface HistoryItem {
  id: string; // 레일 앵커(#id)/React key 전용 — 표시엔 쓰지 않는다
  year: string; // 표시 연월 (예: "2011년 4월")
  text: string; // 헤드라인
  desc: string; // 한 줄 설명
  details: string[]; // 세부 항목
  significance: string; // 의의 풀쿼트
  media?: HeroMedia; // 배경 미디어(placeholder, /public/history/{id}.jpg). 후일 교체
}

export interface HistoryContent {
  title: string;
  intro: string; // 인트로 한 줄(placeholder 카피 — 후일 수정)
  items: HistoryItem[];
}

// 레일/티저 표시 라벨 — "2011년 4월"→"2011.4", "2015년"→"2015". id는 앵커 전용이라 라벨 도출에 쓰지 않는다.
export function historyRailLabel(year: string): string {
  const m = year.match(/(\d+)\s*년(?:\s*(\d+)\s*월)?/);
  if (!m) return year;
  return m[2] ? `${m[1]}.${m[2]}` : m[1];
}

export const HISTORY = {
  title: "연혁",
  intro: "2011년 봄, 사택의 작은 예배에서 시작된 은샘교회의 발자취입니다.",
  items: [
    {
      id: "2011-04",
      year: "2011년 4월",
      text: "개척예배",
      desc: "개척예배가 사택(태산아파트)에서 진행되었습니다.",
      details: [
        "홍성균 목사가 은샘교회를 개척·창립",
        "사택에서 첫 예배 진행",
        "소수의 성도들과 함께 교회의 기초를 세움",
        "기독교한국침례회 소속으로 시작",
      ],
      significance: "은샘교회 역사의 출발점이자 하나님의 부르심에 순종한 신앙의 시작",
      media: { type: "image", src: "/history/2011-04.jpg", alt: "" },
    },
    {
      id: "2011-05",
      year: "2011년 5월",
      text: "창립예배",
      desc: "태산아파트 옆 상가에서 예배가 진행되었습니다.",
      details: [
        "정식 창립예배 및 교회 설립",
        "태산아파트 상가 건물로 예배 장소 이전",
        "체계적인 교회 운영 시스템 구축",
        "지역 주민들에게 교회 존재 알림",
      ],
      significance: "공식적인 교회 공동체로서의 첫걸음을 내딛은 중요한 순간",
      media: { type: "image", src: "/history/2011-05.jpg", alt: "" },
    },
    {
      id: "2015",
      year: "2015년",
      text: "교회 확장",
      desc: "주방을 허물고 교회를 확장시켰습니다.",
      details: [
        "기존 주방 공간을 허물어 예배 공간 확대",
        "더 많은 성도들을 수용할 수 있는 공간 마련",
        "교회 성장에 따른 필요한 시설 개선",
        "예배와 교제 공간의 효율적 활용",
      ],
      significance: "교회 성장에 발맞춘 공간 확대로 많은 성도들을 품을 수 있게 됨",
      media: { type: "image", src: "/history/2015.jpg", alt: "" },
    },
    {
      id: "2016",
      year: "2016년",
      text: "1층 주방·쉼터 조성",
      desc: "1층 공간을 새로운 주방과 쉼터 공간으로 조성했습니다.",
      details: [
        "1층에 새로운 주방 시설 설치",
        "성도들을 위한 쉼터 공간 조성",
        "교제와 식사를 위한 편의시설 완비",
        "다양한 교회 행사를 위한 공간 활용",
      ],
      significance: "교제와 섬김을 위한 공간 마련으로 공동체 활성화",
      media: { type: "image", src: "/history/2016.jpg", alt: "" },
    },
    {
      id: "2021",
      year: "2021년",
      text: "현재 위치로 이전",
      desc: "교회를 이전하여 새로운 출발을 하였습니다.",
      details: [
        "충청남도 예산군 삽교읍 수암산로 260으로 교회 이전",
        "더 넓고 쾌적한 예배 공간 확보",
        "주차 시설 및 편의 시설 개선",
        "지역 접근성 향상으로 더 많은 성도들 섬김",
      ],
      significance: "교회 성장과 발전을 위한 새로운 터전 마련",
      media: { type: "image", src: "/history/2021.jpg", alt: "" },
    },
    {
      id: "2023",
      year: "2023년",
      text: "교회 성장",
      desc: "다양한 연령층의 성도들이 함께하는 건강한 교회.",
      details: [
        "다양한 연령층의 성도들이 함께하는 공동체 형성",
        "체계적인 사역 부서 운영(학생부·청년부·예배부·남선교회·여선교회)",
        "건강한 교회, 건강한 성도",
        "지속적인 신앙 성장과 교제 프로그램 운영",
      ],
      significance:
        "하나님의 은혜 가운데 성숙한 교회 공동체로 발전, 모든 세대가 함께하는 축복의 공간",
      media: { type: "image", src: "/history/2023.jpg", alt: "" },
    },
    {
      id: "2025",
      year: "2025년",
      text: "디지털 사역 확장",
      desc: "온라인과 오프라인을 연결하는 새로운 시작.",
      details: [
        "교회 웹사이트 개설로 온라인 소통 강화",
        "실시간 예배 유튜브 주소 공유",
        "디지털 주보 및 온라인 공지사항 서비스",
        "소셜 미디어를 통한 젊은 세대와의 소통",
      ],
      significance:
        "디지털 시대에 맞는 새로운 소통 방식으로 더 많은 사람들에게 복음을 전할 수 있게 됨",
      media: { type: "image", src: "/history/2025.jpg", alt: "" },
    },
  ],
} satisfies HistoryContent;
```

> 주의: 기존 HISTORY에 `details`/`significance`가 이미 있었다(주석 "상세 UI 추후용"). 그대로 유지하며 `id`/`media`/`intro`만 더한다. `VISION` 등 다른 export는 건드리지 않는다.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/constants/content.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: 통과(`satisfies`로 7개 항목 형 검사 OK).

- [ ] **Step 6: Commit**

```bash
git add src/constants/content.ts src/constants/content.test.ts
git commit -m "feat : 연혁 데이터에 id·media·intro 추가 및 레일 라벨 헬퍼 #<issue>"
```

---

## Task 2: 공유 훅 — useMediaFlag · useHasHydrated

**Files:**
- Create: `src/lib/hooks/useMediaFlag.ts`
- Create: `src/lib/hooks/useHasHydrated.ts`
- Test: `src/lib/hooks/useMediaFlag.test.tsx`

**Interfaces:**
- Produces:
  - `export const REDUCED_MQ = "(prefers-reduced-motion: reduce)"`, `export const MOBILE_MQ = "(max-width: 639px)"`
  - `export function useMediaFlag(query: string): boolean`
  - `export function useHasHydrated(): boolean`

- [ ] **Step 1: Write the failing test** — `src/lib/hooks/useMediaFlag.test.tsx`

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { useMediaFlag, REDUCED_MQ } from "./useMediaFlag";
import { useHasHydrated } from "./useHasHydrated";

afterEach(() => vi.unstubAllGlobals());

function FlagProbe({ query }: { query: string }) {
  return <span data-testid="flag">{String(useMediaFlag(query))}</span>;
}
function HydrateProbe() {
  return <span data-testid="hyd">{String(useHasHydrated())}</span>;
}

describe("useMediaFlag", () => {
  it("matchMedia의 matches를 반환한다", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })),
    );
    const { getByTestId } = render(<FlagProbe query={REDUCED_MQ} />);
    expect(getByTestId("flag").textContent).toBe("true");
  });
});

describe("useHasHydrated", () => {
  it("클라이언트 렌더에서 true를 반환한다", () => {
    const { getByTestId } = render(<HydrateProbe />);
    expect(getByTestId("hyd").textContent).toBe("true");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/hooks/useMediaFlag.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: Create `src/lib/hooks/useMediaFlag.ts`**

```ts
"use client";

import { useSyncExternalStore } from "react";

export const REDUCED_MQ = "(prefers-reduced-motion: reduce)";
export const MOBILE_MQ = "(max-width: 639px)";

// 매체쿼리 구독 — MediaCollage 내부 로컬 훅의 공유 추출(동결 파일 미수정).
// effect 내 동기 setState 없이(set-state-in-effect lint 회피), SSR=false·회전/모션설정 변경에 반응.
export function useMediaFlag(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
```

- [ ] **Step 4: Create `src/lib/hooks/useHasHydrated.ts`**

```ts
"use client";

import { useSyncExternalStore } from "react";

// 클라이언트 하이드레이션 완료 여부 — 서버/첫 렌더 false, 하이드레이트 후 true.
// 점진적 향상 게이트: 무JS/SSR 마크업은 비-인터랙티브(전부 가시) 상태로 직렬화된다.
const subscribe = () => () => {};

export function useHasHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/hooks/useMediaFlag.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/hooks/useMediaFlag.ts src/lib/hooks/useHasHydrated.ts src/lib/hooks/useMediaFlag.test.tsx
git commit -m "feat : 공유 훅 useMediaFlag·useHasHydrated 추가 #<issue>"
```

---

## Task 3: globals.css 토큰 — `--z-rail` · `z-rail` · `scrim-bottom`

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: 유틸 클래스 `z-rail`(레일 레이어), `scrim-bottom`(하단 스크림 그라데이션). CSS 토큰이라 단위 테스트 없음 — 게이트는 lint + presence + 후속 태스크 소비.

- [ ] **Step 1: `@theme` z 스케일에 토큰 추가**

`src/app/globals.css`의 `--z-nav: 10;` 블록(현재 nav/popover/overlay/toast)에 한 줄 추가:
```css
  --z-rail: 5;                          /* 연혁 레일 — 헤더(z-nav) 아래·sticky 미디어 위 */
```
(위치: `--z-nav: 10;` 바로 위 또는 `--z-toast: 60;` 아래, 같은 주석 블록 내)

- [ ] **Step 2: z 유틸 추가**

`@utility z-nav { ... }` … `@utility z-toast { ... }` 줄들 뒤에 추가:
```css
@utility z-rail { z-index: var(--z-rail); }
```

- [ ] **Step 3: 스크림 유틸 추가**

파일 하단(예: `.prose-church` 블록 위 또는 아래, 컴포넌트 유틸 구역)에 추가:
```css
/* 연혁 스토리(history) 하단 스크림 — 다크 미디어 위 on-dark 텍스트 대비 확보.
 * 토큰 변수만 참조(rgba/hex 인라인 금지). 일반 장식이라 CrossHero/DeptHero의 검증용 rgba 예외 대상 아님. */
@utility scrim-bottom {
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--color-cover-dark) 72%, transparent),
    color-mix(in srgb, var(--color-cover-dark) 24%, transparent) 38%,
    transparent 64%
  );
}
```

- [ ] **Step 4: Verify**

Run: `rg -n "z-rail|scrim-bottom|--z-rail" src/app/globals.css`
Expected: 3개 항목(토큰 1 + 유틸 2) 출력.
Run: `pnpm lint`
Expected: 통과.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat : 연혁용 z-rail·scrim-bottom 토큰 유틸 추가 #<issue>"
```

---

## Task 4: 스크럽 수학 — historyScrub.ts

**Files:**
- Create: `src/components/history/historyScrub.ts`
- Test: `src/components/history/historyScrub.test.ts`

**Interfaces:**
- Consumes: `@/hero/scrub` (`clamp01`, `easeOut`, `lerp`, `segment`)
- Produces:
  - `export const CHAPTER_VH = 160`, `export const PIN_VH = 60`, `export const FADE_VH = 90`
  - `export function chapterT(rectTop: number, pinPx: number): number`
  - `export function mediaOpacity(centerOffsetPx: number, fadePx: number): number`
  - `export const TEXT_SEGMENTS` (year/head/desc/details/significance → `[number, number]`)
  - `export function reveal(t: number, start: number, end: number): { opacity: number; ty: number }`

- [ ] **Step 1: Write the failing test** — `src/components/history/historyScrub.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { chapterT, mediaOpacity, reveal, CHAPTER_VH, PIN_VH, FADE_VH } from "./historyScrub";

describe("상수(스펙 §7 단일 진실)", () => {
  it("PIN_VH = CHAPTER_VH - 100", () => {
    expect(PIN_VH).toBe(CHAPTER_VH - 100);
    expect(FADE_VH).toBeGreaterThan(0);
  });
});

describe("chapterT", () => {
  it("챕터 top이 0이면 0", () => expect(chapterT(0, 60)).toBe(0));
  it("pinPx만큼 지나면 1", () => expect(chapterT(-60, 60)).toBe(1));
  it("중간이면 0.5", () => expect(chapterT(-30, 60)).toBeCloseTo(0.5));
  it("범위를 벗어나면 클램프", () => {
    expect(chapterT(60, 60)).toBe(0);
    expect(chapterT(-120, 60)).toBe(1);
  });
});

describe("mediaOpacity", () => {
  it("중심이면 1", () => expect(mediaOpacity(0, 90)).toBe(1));
  it("FADE 경계에서 0", () => expect(mediaOpacity(90, 90)).toBe(0));
  it("부호 무관(절대값)", () => expect(mediaOpacity(-45, 90)).toBeCloseTo(0.5));
});

describe("reveal", () => {
  it("구간 이전이면 opacity 0", () => expect(reveal(0, 0.4, 0.7).opacity).toBe(0));
  it("구간 이후면 opacity 1·ty 0", () => {
    const r = reveal(1, 0.4, 0.7);
    expect(r.opacity).toBe(1);
    expect(r.ty).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/history/historyScrub.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: Create `src/components/history/historyScrub.ts`**

```ts
import { clamp01, easeOut, lerp, segment } from "@/hero/scrub";

// 연출 수치 단일 진실(스펙 §7). 테스트가 이 export를 직접 참조해 회귀 감시.
export const CHAPTER_VH = 160; // 챕터 1개 스크롤 높이(vh)
export const PIN_VH = CHAPTER_VH - 100; // sticky 핀 구간(=텍스트 t가 0→1 도는 스크롤 거리)
export const FADE_VH = 90; // 미디어 크로스페이드 폭(vh)

// 챕터 내 진행도: 챕터 top이 뷰포트 top에 닿을 때 0, pinPx만큼 더 스크롤되면 1.
export function chapterT(rectTop: number, pinPx: number): number {
  if (pinPx <= 0) return 0;
  return clamp01(-rectTop / pinPx);
}

// 미디어 opacity: 챕터 중심이 뷰포트 중심에 올 때 1, |offset|=fadePx에서 0(중심 정렬 크로스페이드).
export function mediaOpacity(centerOffsetPx: number, fadePx: number): number {
  if (fadePx <= 0) return 0;
  return clamp01(1 - Math.abs(centerOffsetPx) / fadePx);
}

// 텍스트 점진 노출 구간(스펙 §7.4). details는 엔진에서 항목별 +0.05 스태거.
export const TEXT_SEGMENTS = {
  year: [0.0, 0.18],
  head: [0.12, 0.32],
  desc: [0.26, 0.46],
  details: [0.4, 0.7],
  significance: [0.66, 0.88],
} as const;

// 구간 진행도 → {opacity, translateY(px)}.
export function reveal(t: number, start: number, end: number): { opacity: number; ty: number } {
  const e = easeOut(segment(t, start, end));
  return { opacity: e, ty: lerp(16, 0, e) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/history/historyScrub.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/history/historyScrub.ts src/components/history/historyScrub.test.ts
git commit -m "feat : 연혁 스크럽 수학(historyScrub) 추가 #<issue>"
```

---

## Task 5: 배경 톤 페어 — tone.ts

**Files:**
- Create: `src/components/history/tone.ts`
- Test: `src/components/history/tone.test.ts`

**Interfaces:**
- Produces:
  - `export interface Tone { layerBg: string; head: string; body: string; scrim: boolean }`
  - `export function chapterTone(hasMedia: boolean, index: number): Tone`

- [ ] **Step 1: Write the failing test** — `src/components/history/tone.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { chapterTone } from "./tone";

describe("chapterTone", () => {
  it("미디어 있으면 on-dark 텍스트 + 스크림", () => {
    const t = chapterTone(true, 0);
    expect(t.head).toBe("text-on-dark");
    expect(t.body).toBe("text-on-dark-soft");
    expect(t.scrim).toBe(true);
  });

  it("미디어 없는 밝은 폴백(index 1)은 ink/body + 스크림 없음", () => {
    const t = chapterTone(false, 1);
    expect(t.head).toBe("text-ink");
    expect(t.scrim).toBe(false);
    expect(t.layerBg).toBe("bg-primary-soft");
  });

  it("미디어 없는 어두운 폴백(index 0)은 on-dark + 스크림", () => {
    const t = chapterTone(false, 0);
    expect(t.head).toBe("text-on-dark");
    expect(t.scrim).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/history/tone.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: Create `src/components/history/tone.ts`**

```ts
export interface Tone {
  layerBg: string; // 미디어 없을 때 .chapterMedia 채움 색(토큰 유틸)
  head: string; // 연도·헤드·significance 텍스트 색
  body: string; // 설명·details 텍스트 색
  scrim: boolean; // 하단 스크림 적용 여부(밝은 배경엔 불필요)
}

// 미디어 없는 챕터 폴백 톤(HistoryBand BAND_TONES 재해석, 단일 액센트). 밝은 톤은 ink/body·스크림 없음(대비 보존).
const FALLBACK: Tone[] = [
  { layerBg: "bg-surface-dark", head: "text-on-dark", body: "text-on-dark-soft", scrim: true },
  { layerBg: "bg-primary-soft", head: "text-ink", body: "text-body", scrim: false },
  { layerBg: "bg-surface-soft", head: "text-ink", body: "text-body", scrim: false },
];

// 사진 미디어 위: on-dark + 스크림.
const PHOTO: Tone = { layerBg: "", head: "text-on-dark", body: "text-on-dark-soft", scrim: true };

export function chapterTone(hasMedia: boolean, index: number): Tone {
  return hasMedia ? PHOTO : FALLBACK[index % FALLBACK.length];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/history/tone.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/history/tone.ts src/components/history/tone.test.ts
git commit -m "feat : 연혁 배경 톤 페어(tone) 추가 #<issue>"
```

---

## Task 6: HistoryMedia 컴포넌트

**Files:**
- Create: `src/components/history/HistoryMedia.tsx`
- Test: `src/components/history/HistoryMedia.test.tsx`

**Interfaces:**
- Consumes: `HeroMedia` (`@/hero/types`)
- Produces: `export function HistoryMedia({ media, priority }: { media: HeroMedia; priority?: boolean }): JSX.Element`

- [ ] **Step 1: Write the failing test** — `src/components/history/HistoryMedia.test.tsx`

```tsx
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { HistoryMedia } from "./HistoryMedia";

describe("HistoryMedia", () => {
  it("이미지를 alt=''(장식)·src로 렌더한다", () => {
    const { container } = render(
      <HistoryMedia media={{ type: "image", src: "/history/2011-04.jpg", alt: "" }} />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.getAttribute("src")).toBe("/history/2011-04.jpg");
    expect(img?.getAttribute("loading")).toBe("lazy");
  });

  it("priority면 eager 로딩", () => {
    const { container } = render(
      <HistoryMedia media={{ type: "image", src: "/x.jpg", alt: "" }} priority />,
    );
    expect(container.querySelector("img")?.getAttribute("loading")).toBe("eager");
  });

  it("video는 video 요소를 poster 보존하여 렌더한다", () => {
    const { container } = render(
      <HistoryMedia media={{ type: "video", src: "/x.mp4", poster: "/p.jpg" }} />,
    );
    expect(container.querySelector("video")?.getAttribute("poster")).toBe("/p.jpg");
  });

  it("video 실패 시 poster 이미지로 폴백한다", () => {
    const { container } = render(
      <HistoryMedia media={{ type: "video", src: "/x.mp4", poster: "/p.jpg" }} />,
    );
    fireEvent.error(container.querySelector("video")!);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector('img[src="/p.jpg"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/history/HistoryMedia.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: Create `src/components/history/HistoryMedia.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { HeroMedia } from "@/hero/types";

export interface HistoryMediaProps {
  media: HeroMedia;
  priority?: boolean; // 첫 챕터만 eager, 나머지 lazy
}

// 연출 장식 미디어 — CrossHero/MediaCollage와 동일 onError→poster 폴백. 콘텐츠 이미지가 아니라 next/image 미사용.
export function HistoryMedia({ media, priority = false }: HistoryMediaProps) {
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
    // eslint-disable-next-line @next/next/no-img-element -- 연출용 장식 미디어(콘텐츠 이미지는 next/image)
    <img
      src={media.type === "video" ? (media.poster ?? "") : media.src}
      alt={media.type === "image" ? (media.alt ?? "") : ""}
      loading={priority ? "eager" : "lazy"}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/history/HistoryMedia.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/history/HistoryMedia.tsx src/components/history/HistoryMedia.test.tsx
git commit -m "feat : 연혁 미디어 렌더러 HistoryMedia 추가 #<issue>"
```

---

## Task 7: HistoryChapter 컴포넌트 (+ HistoryStory.module.css 1차)

**Files:**
- Create: `src/components/history/HistoryChapter.tsx`
- Create: `src/components/history/HistoryStory.module.css` (이 태스크에서 시작, 이후 태스크가 확장)
- Test: `src/components/history/HistoryChapter.test.tsx`

**Interfaces:**
- Consumes: `HistoryItem`(`@/constants/content`), `chapterTone`(`./tone`), `HistoryMedia`(`./HistoryMedia`), `Container`, `typo`, `cn`, `styles`
- Produces: `export const HistoryChapter` = `forwardRef<HTMLElement, { item: HistoryItem; index: number }>`
  - 마크업 계약(엔진이 의존): 루트 `<section id={item.id} aria-labelledby={item.id+"-h"}>`, 미디어 래퍼 `[data-history-media]`, 텍스트 노드 `[data-history-el="year|head|desc|details|significance"]`(details는 `data-history-stagger`), 헤딩 `<h2 data-history-heading tabIndex={-1} id={item.id+"-h"}>`

- [ ] **Step 1: Write the failing test** — `src/components/history/HistoryChapter.test.tsx`

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import { HistoryChapter } from "./HistoryChapter";

describe("HistoryChapter", () => {
  const item = HISTORY.items[0];

  it("미디어를 [data-history-media] 안에 alt=''로 렌더한다", () => {
    const { container } = render(<HistoryChapter item={item} index={0} />);
    const img = container.querySelector("[data-history-media] img");
    expect(img?.getAttribute("alt")).toBe("");
  });

  it("연도·헤드·설명·details·significance를 렌더한다", () => {
    render(<HistoryChapter item={item} index={0} />);
    expect(screen.getByText(item.year)).toBeDefined();
    expect(screen.getByText(item.text)).toBeDefined();
    expect(screen.getByText(item.desc)).toBeDefined();
    expect(screen.getByText(item.significance)).toBeDefined();
    for (const d of item.details) expect(screen.getByText(d)).toBeDefined();
  });

  it("헤딩 접근성: tabindex=-1·id·aria-labelledby 연결", () => {
    const { container } = render(<HistoryChapter item={item} index={0} />);
    const h = container.querySelector("h2[data-history-heading]");
    expect(h?.getAttribute("tabindex")).toBe("-1");
    expect(h?.getAttribute("id")).toBe(`${item.id}-h`);
    expect(container.querySelector("section")?.getAttribute("aria-labelledby")).toBe(`${item.id}-h`);
  });

  it("텍스트 노드에 data-history-el 마커가 있다", () => {
    const { container } = render(<HistoryChapter item={item} index={0} />);
    expect(container.querySelector('[data-history-el="year"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-history-el="details"]').length).toBe(item.details.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/history/HistoryChapter.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: Create `src/components/history/HistoryStory.module.css`** (1차 — 챕터 베이스 + 인터랙티브)

```css
/* 연혁 스토리 — base(무JS/reduced)는 자연 흐름·전부 가시, .storyInteractive에서만 sticky 크로스페이드(스펙 §7). */
.story { position: relative; }
.chapter { position: relative; }

/* base: 미디어 16:9 정적, 카피 자연 흐름 */
.chapterMedia { position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; }
.chapterMedia :global(img),
.chapterMedia :global(video) { width: 100%; height: 100%; object-fit: cover; display: block; }

.chapterCopy { position: relative; display: flex; flex-direction: column; }
.copyInner { display: flex; flex-direction: column; gap: var(--spacing-base); padding-block: var(--spacing-section); }
.heading { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.heading:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 4px; }
.details { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.scrim { position: absolute; inset-inline: 0; bottom: 0; height: 60%; pointer-events: none; }

/* 인터랙티브: 미디어 sticky 크로스페이드 + 카피 sticky 점진 노출. CHAPTER_VH은 historyScrub가 단일 진실 → --chapter-vh로 주입 */
.storyInteractive .chapter { height: calc(var(--chapter-vh, 160) * 1vh); }
.storyInteractive .chapterMedia { position: sticky; top: 0; height: 100vh; height: 100dvh; aspect-ratio: auto; }
.storyInteractive .chapterCopy {
  position: sticky; top: 0; min-height: 100vh; min-height: 100dvh;
  margin-top: -100vh; justify-content: flex-end;
}
.storyInteractive [data-history-el] { opacity: 0; will-change: opacity, transform; }

@media (max-width: 639px) {
  .copyInner { padding-block: var(--spacing-xxl); }
}
```

- [ ] **Step 4: Create `src/components/history/HistoryChapter.tsx`**

```tsx
"use client";

import { forwardRef } from "react";
import { Container } from "@/components/shell/Container";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { chapterTone } from "./tone";
import { HistoryMedia } from "./HistoryMedia";
import styles from "./HistoryStory.module.css";
import type { HistoryItem } from "@/constants/content";

export interface HistoryChapterProps {
  item: HistoryItem;
  index: number;
}

// 챕터 1개 — 미디어(뒤) + 카피(앞). base 정적/인터랙티브 sticky는 CSS가 분기(스펙 §7.1).
// 엔진이 [data-history-media]·[data-history-el]에 직접 style을 기록한다.
export const HistoryChapter = forwardRef<HTMLElement, HistoryChapterProps>(
  function HistoryChapter({ item, index }, ref) {
    const tone = chapterTone(Boolean(item.media), index);
    const headingId = `${item.id}-h`;
    return (
      <section ref={ref} id={item.id} aria-labelledby={headingId} className={styles.chapter}>
        <div data-history-media className={cn(styles.chapterMedia, tone.layerBg)}>
          {item.media ? <HistoryMedia media={item.media} priority={index === 0} /> : null}
        </div>
        <div className={styles.chapterCopy}>
          {tone.scrim ? <div aria-hidden="true" className={cn(styles.scrim, "scrim-bottom")} /> : null}
          <Container className={styles.copyInner}>
            <h2 id={headingId} data-history-heading tabIndex={-1} className={styles.heading}>
              <span data-history-el="year" className={cn(typo.displayMega, tone.head)}>
                {item.year}
              </span>
              <span data-history-el="head" className={cn(typo.displayLg, tone.head)}>
                {item.text}
              </span>
            </h2>
            <p data-history-el="desc" className={cn(typo.bodyMd, tone.body)}>
              {item.desc}
            </p>
            <ul className={styles.details}>
              {item.details.map((d, di) => (
                <li
                  key={d}
                  data-history-el="details"
                  data-history-stagger={di}
                  className={cn(typo.bodySm, tone.body)}
                >
                  {d}
                </li>
              ))}
            </ul>
            <p data-history-el="significance" className={cn(typo.bodyMd, tone.head)}>
              {item.significance}
            </p>
          </Container>
        </div>
      </section>
    );
  },
);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/history/HistoryChapter.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/history/HistoryChapter.tsx src/components/history/HistoryStory.module.css src/components/history/HistoryChapter.test.tsx
git commit -m "feat : 연혁 챕터 컴포넌트·스토리 CSS 추가 #<issue>"
```

---

## Task 8: HistoryYearRail (세로 연표 레일)

**Files:**
- Create: `src/components/history/HistoryYearRail.tsx`
- Modify: `src/components/history/HistoryStory.module.css` (레일 스타일 추가)
- Test: `src/components/history/HistoryYearRail.test.tsx`

**Interfaces:**
- Consumes: `HistoryItem`, `historyRailLabel`(`@/constants/content`), `typo`, `cn`, `styles`
- Produces: `export function HistoryYearRail({ items, active, onJump, visible }: { items: HistoryItem[]; active: number; onJump: (index: number, e: MouseEvent) => void; visible?: boolean })`
  - `MouseEvent`는 React의 `import type { MouseEvent } from "react"`.

- [ ] **Step 1: Write the failing test** — `src/components/history/HistoryYearRail.test.tsx`

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HISTORY, historyRailLabel } from "@/constants/content";
import { HistoryYearRail } from "./HistoryYearRail";

describe("HistoryYearRail", () => {
  it("모든 연도 라벨을 렌더하고 활성에 aria-current=step", () => {
    render(<HistoryYearRail items={HISTORY.items} active={2} onJump={vi.fn()} />);
    expect(screen.getByText(historyRailLabel(HISTORY.items[0].year))).toBeDefined();
    const activeLink = screen.getByText(historyRailLabel(HISTORY.items[2].year));
    expect(activeLink.getAttribute("aria-current")).toBe("step");
  });

  it("앵커 href가 #id를 가리킨다(무JS 동작)", () => {
    render(<HistoryYearRail items={HISTORY.items} active={0} onJump={vi.fn()} />);
    const link = screen.getByText(historyRailLabel(HISTORY.items[1].year));
    expect(link.getAttribute("href")).toBe(`#${HISTORY.items[1].id}`);
  });

  it("클릭 시 onJump(index, event)를 호출한다", () => {
    const onJump = vi.fn();
    render(<HistoryYearRail items={HISTORY.items} active={0} onJump={onJump} />);
    fireEvent.click(screen.getByText(historyRailLabel(HISTORY.items[1].year)));
    expect(onJump).toHaveBeenCalledWith(1, expect.anything());
  });

  it("visible=false면 aria-hidden", () => {
    const { container } = render(
      <HistoryYearRail items={HISTORY.items} active={0} onJump={vi.fn()} visible={false} />,
    );
    expect(container.querySelector("nav")?.getAttribute("aria-hidden")).toBe("true");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/history/HistoryYearRail.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: Append rail styles to `src/components/history/HistoryStory.module.css`**

```css
/* 세로 연표 레일 — DOM 순서는 본문보다 앞(목차→본문), 시각은 fixed 우측. */
.rail { position: fixed; right: var(--spacing-lg); top: 50%; transform: translateY(-50%); }
.railList { display: flex; flex-direction: column; gap: var(--spacing-xs); list-style: none; }
.railLink {
  display: block; padding: var(--spacing-xxs) var(--spacing-xs);
  color: var(--color-on-dark-soft); border-radius: var(--radius-full);
}
.railLink:hover { color: var(--color-on-dark); }
.railLinkActive { background: var(--color-primary-soft); color: var(--color-primary); }
.railHidden { opacity: 0; visibility: hidden; pointer-events: none; }

@media (max-width: 639px) {
  /* 모바일: 상단 가로 진행 도트 */
  .rail { right: 0; left: 0; top: var(--spacing-nav); transform: none; }
  .railList { flex-direction: row; justify-content: center; gap: var(--spacing-xs); overflow-x: auto; padding-inline: var(--spacing-lg); }
}
```

- [ ] **Step 4: Create `src/components/history/HistoryYearRail.tsx`**

```tsx
"use client";

import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { historyRailLabel } from "@/constants/content";
import styles from "./HistoryStory.module.css";
import type { HistoryItem } from "@/constants/content";

export interface HistoryYearRailProps {
  items: HistoryItem[];
  active: number;
  onJump: (index: number, e: MouseEvent) => void;
  visible?: boolean; // 스토리 구간에서만 표시(기본 true)
}

// 세로 연표 레일 — 라벨 typo.datetime(tnum)·on-dark, 활성 primary-soft. 앵커라 무JS도 동작, JS는 점프+포커스 가로챔.
export function HistoryYearRail({ items, active, onJump, visible = true }: HistoryYearRailProps) {
  return (
    <nav
      aria-label="연혁 연표"
      aria-hidden={visible ? undefined : true}
      className={cn(styles.rail, "z-rail", visible ? undefined : styles.railHidden)}
    >
      <ol className={styles.railList}>
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => onJump(i, e)}
              aria-current={i === active ? "step" : undefined}
              className={cn(typo.datetime, styles.railLink, i === active ? styles.railLinkActive : undefined)}
            >
              {historyRailLabel(item.year)}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/history/HistoryYearRail.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/history/HistoryYearRail.tsx src/components/history/HistoryStory.module.css src/components/history/HistoryYearRail.test.tsx
git commit -m "feat : 연혁 세로 연표 레일 추가 #<issue>"
```

---

## Task 9: HistoryIntro (인트로 섹션)

**Files:**
- Create: `src/components/history/HistoryIntro.tsx`
- Modify: `src/components/history/HistoryStory.module.css` (인트로 스타일)
- Test: `src/components/history/HistoryIntro.test.tsx`

**Interfaces:**
- Consumes: `Container`, `Reveal`(`@/components/main/Reveal`, 크로스 도메인 재사용 허용), `typo`, `cn`, `styles`
- Produces: `export function HistoryIntro({ title, intro, churchName }: { title: string; intro: string; churchName: string })`

- [ ] **Step 1: Write the failing test** — `src/components/history/HistoryIntro.test.tsx`

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HistoryIntro } from "./HistoryIntro";

afterEach(() => vi.unstubAllGlobals());

describe("HistoryIntro", () => {
  it("제목 키커·교회명·intro를 렌더한다", () => {
    // Reveal이 matchMedia를 읽으므로 stub(reduced=true → 즉시 표시 경로)
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<HistoryIntro title="연혁" intro="소개 문장" churchName="은샘교회" />);
    expect(screen.getByText("연혁")).toBeDefined();
    expect(screen.getByText("은샘교회")).toBeDefined();
    expect(screen.getByText("소개 문장")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/history/HistoryIntro.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: Append intro styles to `src/components/history/HistoryStory.module.css`**

```css
/* 인트로 — 100vh 타이틀 */
.intro { min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; }
.introHead { margin-top: var(--spacing-sm); }
.introLead { margin-top: var(--spacing-base); max-width: var(--container-narrow); }
```

- [ ] **Step 4: Create `src/components/history/HistoryIntro.tsx`**

```tsx
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import styles from "./HistoryStory.module.css";

export interface HistoryIntroProps {
  title: string;
  intro: string;
  churchName: string;
}

// 인트로 100vh — 키커(제목) + 교회명 + 한 줄. Reveal 진입(reduced/무JS는 즉시 표시).
export function HistoryIntro({ title, intro, churchName }: HistoryIntroProps) {
  return (
    <section className={styles.intro}>
      <Container>
        <Reveal>
          <p className={cn(typo.captionStrong, "text-muted")}>{title}</p>
          <h1 className={cn(typo.displayMega, "text-ink", styles.introHead)}>{churchName}</h1>
          <p className={cn(typo.bodyMd, "text-body", styles.introLead)}>{intro}</p>
        </Reveal>
      </Container>
    </section>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/history/HistoryIntro.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/history/HistoryIntro.tsx src/components/history/HistoryStory.module.css src/components/history/HistoryIntro.test.tsx
git commit -m "feat : 연혁 인트로 섹션 추가 #<issue>"
```

---

## Task 10: useHistoryScrollEngine (스크롤 엔진)

**Files:**
- Create: `src/components/history/useHistoryScrollEngine.ts`
- Test: `src/components/history/useHistoryScrollEngine.test.tsx`

**Interfaces:**
- Consumes: `historyScrub`(`chapterT`, `mediaOpacity`, `reveal`, `TEXT_SEGMENTS`, `PIN_VH`, `FADE_VH`)
- Produces: `export function useHistoryScrollEngine(chaptersRef: MutableRefObject<(HTMLElement | null)[]>, enabled: boolean): number`
  - enabled=true: scroll/resize rAF로 챕터 텍스트·미디어 명령형 갱신, active(state) 반환.
  - enabled=false: IntersectionObserver로 active만 갱신(스크롤 리스너 미등록).

- [ ] **Step 1: Write the failing test** — `src/components/history/useHistoryScrollEngine.test.tsx`

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { useRef } from "react";
import { useHistoryScrollEngine } from "./useHistoryScrollEngine";

afterEach(() => vi.unstubAllGlobals());

// jsdom엔 IntersectionObserver가 없다 — 관찰 캡처 mock.
let observed: Element[] = [];
let ioDisconnected = false;
class MockIO {
  constructor(_cb: IntersectionObserverCallback) {}
  observe(el: Element) { observed.push(el); }
  unobserve() {}
  disconnect() { ioDisconnected = true; }
}
afterEach(() => { observed = []; ioDisconnected = false; });

function Harness({ enabled, n = 2 }: { enabled: boolean; n?: number }) {
  const ref = useRef<(HTMLElement | null)[]>([]);
  const active = useHistoryScrollEngine(ref, enabled);
  return (
    <div>
      <span data-testid="active">{active}</span>
      {Array.from({ length: n }).map((_, i) => (
        <section key={i} ref={(el) => { ref.current[i] = el; }}>
          <div data-history-media />
          <span data-history-el="year">y</span>
        </section>
      ))}
    </div>
  );
}

describe("useHistoryScrollEngine", () => {
  it("enabled=true: scroll·resize 리스너를 등록한다", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<Harness enabled />);
    expect(addSpy.mock.calls.some(([t]) => t === "scroll")).toBe(true);
    expect(addSpy.mock.calls.some(([t]) => t === "resize")).toBe(true);
    addSpy.mockRestore();
  });

  it("enabled=true 언마운트: scroll 리스너 해제", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Harness enabled />);
    unmount();
    expect(removeSpy.mock.calls.some(([t]) => t === "scroll")).toBe(true);
    removeSpy.mockRestore();
  });

  it("enabled=false: 스크롤 미등록·IO로 챕터 관찰", () => {
    vi.stubGlobal("IntersectionObserver", MockIO);
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<Harness enabled={false} n={3} />);
    expect(addSpy.mock.calls.some(([t]) => t === "scroll")).toBe(false);
    expect(observed.length).toBe(3);
    addSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/history/useHistoryScrollEngine.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: Create `src/components/history/useHistoryScrollEngine.ts`**

```ts
"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { chapterT, mediaOpacity, reveal, TEXT_SEGMENTS, PIN_VH, FADE_VH } from "./historyScrub";

// 스크롤 엔진(스펙 §7.2~7.5). enabled=true면 rAF로 챕터 텍스트·미디어를 명령형 갱신(매 프레임 리렌더 없음),
// enabled=false(reduced/무JS-후)면 IO로 active만 갱신. React state는 레일용 active만.
export function useHistoryScrollEngine(
  chaptersRef: MutableRefObject<(HTMLElement | null)[]>,
  enabled: boolean,
): number {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  useEffect(() => {
    const chapters = chaptersRef.current.slice();

    // 비-인터랙티브: 스크럽 없이 가시 챕터로 active만(레일 aria-current). progress=0 고정 방지.
    if (!enabled) {
      if (typeof IntersectionObserver === "undefined") return;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const i = chapters.indexOf(entry.target as HTMLElement);
            if (i >= 0 && i !== activeRef.current) {
              activeRef.current = i;
              setActive(i);
            }
          });
        },
        { threshold: 0.5 },
      );
      chapters.forEach((ch) => ch && io.observe(ch));
      return () => io.disconnect();
    }

    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      const pinPx = (PIN_VH / 100) * vh;
      const fadePx = (FADE_VH / 100) * vh;
      const vc = vh / 2;
      const n = chapters.length;
      let best = 0;
      let bestDist = Infinity;

      chapters.forEach((ch, i) => {
        if (!ch) return;
        const rect = ch.getBoundingClientRect();
        const t = chapterT(rect.top, pinPx);

        ch.querySelectorAll<HTMLElement>("[data-history-el]").forEach((el) => {
          const seg = TEXT_SEGMENTS[el.dataset.historyEl as keyof typeof TEXT_SEGMENTS];
          if (!seg) return;
          const stag = Number(el.dataset.historyStagger ?? 0) * 0.05;
          const { opacity, ty } = reveal(t, seg[0] + stag, seg[1] + stag);
          el.style.opacity = String(opacity);
          el.style.transform = `translateY(${ty}px)`;
        });

        const center = rect.top + rect.height / 2;
        let offset = center - vc;
        if (i === 0 && offset > 0) offset = 0; // 첫 챕터 위쪽 공백 방지
        if (i === n - 1 && offset < 0) offset = 0; // 마지막 챕터 아래쪽 공백 방지
        const media = ch.querySelector<HTMLElement>("[data-history-media]");
        if (media) media.style.opacity = String(mediaOpacity(offset, fadePx));

        const dist = Math.abs(offset);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });

      if (best !== activeRef.current) {
        activeRef.current = best;
        setActive(best);
      }
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
      // 인라인 스타일 정리 — reduced 전환/언마운트 시 CSS 폴백과 충돌 방지(MediaCollage 선례).
      chapters.forEach((ch) => {
        ch?.querySelectorAll<HTMLElement>("[data-history-el]").forEach((el) => {
          el.style.opacity = "";
          el.style.transform = "";
        });
        const media = ch?.querySelector<HTMLElement>("[data-history-media]");
        if (media) media.style.opacity = "";
      });
    };
  }, [enabled, chaptersRef]);

  return active;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/history/useHistoryScrollEngine.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/history/useHistoryScrollEngine.ts src/components/history/useHistoryScrollEngine.test.tsx
git commit -m "feat : 연혁 스크롤 엔진(useHistoryScrollEngine) 추가 #<issue>"
```

---

## Task 11: HistoryStory (오케스트레이터 + 통합)

**Files:**
- Create: `src/components/history/HistoryStory.tsx`
- Test: `src/components/history/HistoryStory.test.tsx`

**Interfaces:**
- Consumes: `useMediaFlag`/`REDUCED_MQ`, `useHasHydrated`, `useHistoryScrollEngine`, `HistoryChapter`, `HistoryYearRail`, `HistoryIntro`, `CHAPTER_VH`, `CHURCH_NAME`(`@/constants/church`), `HistoryContent`, `cn`, `styles`
- Produces: `export function HistoryStory({ content }: { content: HistoryContent })`

- [ ] **Step 1: Write the failing test** — `src/components/history/HistoryStory.test.tsx`

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import { HistoryStory } from "./HistoryStory";

afterEach(() => vi.unstubAllGlobals());

function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: reduced, addEventListener: () => {}, removeEventListener: () => {} })),
  );
}

describe("HistoryStory", () => {
  it("모든 챕터 텍스트와 인트로를 렌더한다(SSR/무JS 콘텐츠 존재)", () => {
    stubMatchMedia(true); // reduced → 비-인터랙티브
    render(<HistoryStory content={HISTORY} />);
    for (const item of HISTORY.items) {
      expect(screen.getByText(item.text)).toBeDefined();
    }
  });

  it("reduced-motion: storyInteractive 클래스 미적용·scroll 리스너 미등록", () => {
    stubMatchMedia(true);
    const addSpy = vi.spyOn(window, "addEventListener");
    const { container } = render(<HistoryStory content={HISTORY} />);
    expect(container.querySelector('[class*="storyInteractive"]')).toBeNull();
    expect(addSpy.mock.calls.some(([t]) => t === "scroll")).toBe(false);
    addSpy.mockRestore();
  });

  it("비-reduced: storyInteractive 적용·scroll 리스너 등록", () => {
    stubMatchMedia(false); // 하이드레이트(jsdom client) + 비-reduced → 인터랙티브
    const addSpy = vi.spyOn(window, "addEventListener");
    const { container } = render(<HistoryStory content={HISTORY} />);
    expect(container.querySelector('[class*="storyInteractive"]')).not.toBeNull();
    expect(addSpy.mock.calls.some(([t]) => t === "scroll")).toBe(true);
    addSpy.mockRestore();
  });

  it("레일 점프 클릭이 scrollIntoView를 호출한다", () => {
    stubMatchMedia(true);
    const spy = vi.spyOn(Element.prototype, "scrollIntoView");
    render(<HistoryStory content={HISTORY} />);
    const link = screen.getByText("2011.5"); // historyRailLabel("2011년 5월")
    link.click();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/history/HistoryStory.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: Create `src/components/history/HistoryStory.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import styles from "./HistoryStory.module.css";
import { cn } from "@/lib/utils";
import { useMediaFlag, REDUCED_MQ } from "@/lib/hooks/useMediaFlag";
import { useHasHydrated } from "@/lib/hooks/useHasHydrated";
import { useHistoryScrollEngine } from "./useHistoryScrollEngine";
import { HistoryChapter } from "./HistoryChapter";
import { HistoryYearRail } from "./HistoryYearRail";
import { HistoryIntro } from "./HistoryIntro";
import { CHAPTER_VH } from "./historyScrub";
import { CHURCH_NAME } from "@/constants/church";
import type { HistoryContent } from "@/constants/content";

export interface HistoryStoryProps {
  content: HistoryContent;
}

// 인터랙티브 연혁 스토리 — 미디어는 챕터 내부, 베이스 가시 + 하이드레이트·비-reduced에서만 인터랙티브(점진적 향상).
export function HistoryStory({ content }: HistoryStoryProps) {
  const reduced = useMediaFlag(REDUCED_MQ);
  const hydrated = useHasHydrated();
  const interactive = hydrated && !reduced;

  const storyRef = useRef<HTMLDivElement>(null);
  const chaptersRef = useRef<(HTMLElement | null)[]>([]);
  const active = useHistoryScrollEngine(chaptersRef, interactive);

  // 레일은 스토리 구간에서만 노출(인트로·CtaBand·Footer 구간 숨김, 스펙 §10).
  const [inStory, setInStory] = useState(false);
  useEffect(() => {
    const el = storyRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInStory(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onJump = (i: number, e: MouseEvent) => {
    const el = chaptersRef.current[i];
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    el.querySelector<HTMLElement>("[data-history-heading]")?.focus();
  };

  return (
    <>
      <HistoryYearRail items={content.items} active={active} onJump={onJump} visible={inStory} />
      <HistoryIntro title={content.title} intro={content.intro} churchName={CHURCH_NAME} />
      <div
        ref={storyRef}
        className={cn(styles.story, interactive && styles.storyInteractive)}
        style={{ "--chapter-vh": CHAPTER_VH } as CSSProperties}
      >
        {content.items.map((item, i) => (
          <HistoryChapter
            key={item.id}
            item={item}
            index={i}
            ref={(el) => {
              chaptersRef.current[i] = el;
            }}
          />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/history/HistoryStory.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/history/HistoryStory.tsx src/components/history/HistoryStory.test.tsx
git commit -m "feat : 연혁 스토리 오케스트레이터 통합 #<issue>"
```

---

## Task 12: 페이지 교체 — /about/history

**Files:**
- Modify (replace): `src/app/(site)/about/history/page.tsx`
- Modify: `src/app/(site)/about/history/page.test.tsx`

**Interfaces:**
- Consumes: `HistoryStory`(`@/components/history/HistoryStory`), `HISTORY`(`@/constants/content`)
- Produces: `export default function HistoryPage()` (서버 컴포넌트), `export const metadata`

- [ ] **Step 1: Update the test** — `src/app/(site)/about/history/page.test.tsx`

기존 내용을 아래로 교체(스토리가 client 훅을 쓰므로 matchMedia stub 필요):
```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import HistoryPage from "./page";

afterEach(() => vi.unstubAllGlobals());

describe("HistoryPage", () => {
  it("연혁 스토리(첫 시대 내용)를 렌더한다", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })),
    );
    render(<HistoryPage />);
    expect(screen.getByText(HISTORY.items[0].text)).toBeDefined();
    expect(screen.getByText(HISTORY.items[0].year)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run "src/app/(site)/about/history/page.test.tsx"`
Expected: FAIL — 기존 page가 리스트라 구조 불일치(또는 matchMedia 미사용 경로 차이). (현 page는 `HISTORY.title`만 보장하던 테스트였음.)

> 참고: 경로에 괄호가 있으므로 셸에서 따옴표로 감싼다.

- [ ] **Step 3: Replace `src/app/(site)/about/history/page.tsx`**

```tsx
import type { Metadata } from "next";
import { HistoryStory } from "@/components/history/HistoryStory";
import { HISTORY } from "@/constants/content";

export const metadata: Metadata = { title: "연혁" };

// 공개 연혁 — 상수 구동(백엔드 무관, 부서 인트로와 동일 격리). 서버 컴포넌트가 client 스토리를 감싼다.
export default function HistoryPage() {
  return <HistoryStory content={HISTORY} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run "src/app/(site)/about/history/page.test.tsx"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "src/app/(site)/about/history/page.tsx" "src/app/(site)/about/history/page.test.tsx"
git commit -m "feat : /about/history를 인터랙티브 연혁 스토리로 교체 #<issue>"
```

---

## Task 13: 메인 HistoryBand 연결 (링크 + key)

**Files:**
- Modify: `src/components/main/HistoryBand.tsx`
- Modify: `src/components/main/HistoryBand.test.tsx`

**Interfaces:**
- Consumes: `Link`(`next/link`), 기존 `HISTORY`/`Reveal`/`Badge`/`typo`/`cn`

- [ ] **Step 1: Update the test** — `src/components/main/HistoryBand.test.tsx`

기존 내용을 아래로 교체(next/link mock + "전체 연혁 보기" 링크 + desc 가드):
```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import { HistoryBand } from "./HistoryBand";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(() => vi.unstubAllGlobals());

describe("HistoryBand", () => {
  it("연혁 항목을 연도 배지·헤드라인·설명으로 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<HistoryBand />);
    for (const item of HISTORY.items) {
      expect(screen.getByText(item.year)).toBeDefined();
      expect(screen.getByText(item.text)).toBeDefined();
      if (item.desc) expect(screen.getByText(item.desc)).toBeDefined();
    }
  });

  it("'전체 연혁 보기' 링크가 /about/history를 가리킨다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<HistoryBand />);
    const link = screen.getByText("전체 연혁 보기");
    expect(link.getAttribute("href")).toBe("/about/history");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/main/HistoryBand.test.tsx`
Expected: FAIL — "전체 연혁 보기" 없음.

- [ ] **Step 3: Modify `src/components/main/HistoryBand.tsx`**

상단 import에 추가:
```tsx
import Link from "next/link";
```

`Container` 내부에서 `key={item.year}` → `key={item.id}`로 바꾸고, `items.map(...)` 뒤(같은 Container 자식)에 링크를 추가한다:
```tsx
      <Container className="flex flex-col gap-base">
        {HISTORY.items.map((item, i) => {
          const tone = BAND_TONES[i % BAND_TONES.length];
          return (
            <Reveal key={item.id} delay={i * 120}>
              <div className={cn("rounded-xl p-xxl", tone.card)}>
                <Badge>{item.year}</Badge>
                <p className={cn(typo.displaySm, "mt-base", tone.head)}>{item.text}</p>
                {item.desc ? (
                  <p className={cn(typo.bodyMd, "mt-xs", tone.body)}>{item.desc}</p>
                ) : null}
              </div>
            </Reveal>
          );
        })}
        <Link href="/about/history" className={cn(typo.button, "mt-base text-primary")}>
          전체 연혁 보기
        </Link>
      </Container>
```
(나머지 컴포넌트 구조·BAND_TONES는 그대로 둔다.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/main/HistoryBand.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/main/HistoryBand.tsx src/components/main/HistoryBand.test.tsx
git commit -m "feat : 메인 HistoryBand에 전체 연혁 보기 링크·id key 적용 #<issue>"
```

---

## Task 14: 전체 검증 + 수동 시각 확인

**Files:** (없음 — 게이트만)

- [ ] **Step 1: 전체 테스트**

Run: `pnpm exec vitest run`
Expected: 전 테스트 PASS(신규 연혁 + 기존 회귀 포함).

- [ ] **Step 2: 타입체크 + 린트**

Run: `pnpm exec tsc --noEmit`
Run: `pnpm lint`
Expected: 둘 다 통과(인라인 hex/px/z-index 없음, set-state-in-effect 없음).

- [ ] **Step 3: 커버리지 확인(선택)**

Run: `pnpm exec vitest run --coverage`
Expected: `src/components/history/*` 80%+ (CSS 의존 시각 로직 제외).

- [ ] **Step 4: 수동 시각 확인(jsdom으로 못 잡는 sticky/크로스페이드)**

Run: `pnpm dev` 후 `/about/history` 방문.
확인:
- 데스크톱: 스크롤 시 시대별 사진 크로스페이드 + 연도→헤드→설명→details→significance 순차 노출, 우측 세로 레일 활성 갱신·클릭 점프.
- placeholder 이미지(`/history/{id}.jpg` 미존재)는 깨진 이미지로 보일 수 있음 — 정상(후일 교체). 필요 시 `/public/history/`에 임시 이미지를 둔다.
- OS "동작 줄이기" 켠 상태/JS 비활성: 모든 챕터가 사진+텍스트로 정적·전부 가시(세로 흐름), 레일은 앵커로 점프.
- 모바일 폭: 텍스트 스택, 레일이 상단 가로 도트로 전환.

- [ ] **Step 5: (요청 시) 최종 커밋/정리**

추가 변경이 없으면 종료. (이전 태스크에서 기능별 커밋 완료.)

---

## Self-Review (작성자 점검)

**1. Spec coverage (스펙 §↔태스크):**
- §6 데이터(id/media/intro·satisfies·레일라벨) → Task 1 ✓
- §8 useMediaFlag·useHasHydrated(점진적 향상 §7.0) → Task 2 ✓
- §7.1/§9/§10 z-rail·scrim 토큰 → Task 3 ✓
- §7.2~7.4 스크럽 수학(챕터별 t·중심정렬·노출) → Task 4 ✓
- §9 톤 페어(대비) → Task 5 ✓
- §8 HistoryMedia(img·alt·폴백) → Task 6 ✓
- §7.1/§9/§11 HistoryChapter(미디어 내부·data 마커·헤딩 tabindex·aria) + 베이스/인터랙티브 CSS → Task 7 ✓
- §10 레일(datetime·on-dark·aria-current=step·앵커·가시성) → Task 8 ✓
- §4 인트로 → Task 9 ✓
- §7.2/§7.5/§11/§13 엔진(명령형·active만 state·reduced IO) → Task 10 ✓
- §5/§7.0/§10/§11 오케스트레이터(interactive 게이트·점프 포커스·레일 가시성) → Task 11 ✓
- §5 서버 페이지 교체 → Task 12 ✓
- §14 메인 HistoryBand → Task 13 ✓
- §15/§16 전체 게이트 + 수동 시각 → Task 14 ✓

**2. Placeholder scan:** "TBD/추후구현" 없음. `#<issue>`만 Global Constraints에 명시된 1회 치환(실 이슈 번호) — 의도된 외부 의존값.

**3. Type consistency:**
- `HistoryItem`/`HistoryContent`(Task 1) ↔ 소비처(7,8,11,12) 일치.
- 엔진 시그니처 `useHistoryScrollEngine(chaptersRef, enabled): number`(Task 10) ↔ 호출(Task 11) 일치.
- 레일 `onJump(index, e: MouseEvent)`(Task 8) ↔ 제공(Task 11) 일치.
- `chapterTone(hasMedia, index): Tone`(Task 5) ↔ 소비(Task 7) 일치.
- 마커 계약 `[data-history-media]`/`[data-history-el]`/`[data-history-heading]`(Task 7) ↔ 엔진 조회(Task 10)·점프(Task 11) 일치.
- `CHAPTER_VH`(Task 4) ↔ `--chapter-vh` 주입(Task 11)·CSS calc(Task 7) 일치.
