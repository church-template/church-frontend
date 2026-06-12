# HistoryBand + MinistryCards 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메인 콜라주 직후에 연혁 카드 시퀀스(HistoryBand)와 사역 카드 3-up(MinistryCards)을 IO 1회 reveal 연출로 추가한다.

**Architecture:** 공용 `Reveal`(client, IO+CSS transition) 하나로 등장을 처리하고 두 섹션은 서버 컴포넌트로 유지. 색은 기존 토큰 3종 교차(스펙 H2 — hex 추가 없음).

**Tech Stack:** React 19 + CSS Module + lucide-react(기존 의존성), vitest/RTL.

**근거 스펙:** `docs/superpowers/specs/2026-06-12-history-ministry-sections-design.md` (H1~H5)

**공통:** pnpm / 커밋은 사용자가 일괄 수행(태스크별 커밋 생략 — 사용자 지시) / 삼항 조건부 / 주석 한국어 WHY

---

### Task 1: Reveal 공용 컴포넌트 (TDD)

**Files:** Create `src/components/main/Reveal.tsx`, `src/components/main/Reveal.module.css` / Test `src/components/main/Reveal.test.tsx`

- [ ] **Step 1: 실패하는 테스트**

```tsx
// src/components/main/Reveal.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { Reveal } from "./Reveal";

function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reduced })));
}

let ioCallback: IntersectionObserverCallback | null = null;
let observed: Element[] = [];
let ioDisconnected = false;
class MockIO {
  constructor(cb: IntersectionObserverCallback) {
    ioCallback = cb;
  }
  observe(el: Element) {
    observed.push(el);
  }
  unobserve() {}
  disconnect() {
    ioDisconnected = true;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  ioCallback = null;
  observed = [];
  ioDisconnected = false;
});

describe("Reveal", () => {
  it("IO를 등록하고 교차 시 표시 클래스를 붙인다(1회)", () => {
    stubMatchMedia(false);
    vi.stubGlobal("IntersectionObserver", MockIO);
    const { container } = render(<Reveal>내용</Reveal>);
    expect(observed.length).toBe(1);
    const target = observed[0];
    act(() => {
      ioCallback?.(
        [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(target.className).toMatch(/shown/);
    expect(container.textContent).toBe("내용");
  });

  it("delay를 CSS 변수로 주입한다(스태거)", () => {
    stubMatchMedia(false);
    vi.stubGlobal("IntersectionObserver", MockIO);
    const { container } = render(<Reveal delay={240}>x</Reveal>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.getPropertyValue("--reveal-delay")).toBe("240ms");
  });

  it("reduced-motion이면 IO를 등록하지 않는다(CSS 즉시 표시)", () => {
    stubMatchMedia(true);
    const ioSpy = vi.fn();
    vi.stubGlobal("IntersectionObserver", ioSpy);
    render(<Reveal>x</Reveal>);
    expect(ioSpy).not.toHaveBeenCalled();
  });

  it("언마운트 시 disconnect한다", () => {
    stubMatchMedia(false);
    vi.stubGlobal("IntersectionObserver", MockIO);
    const { unmount } = render(<Reveal>x</Reveal>);
    unmount();
    expect(ioDisconnected).toBe(true);
  });
});
```

- [ ] **Step 2: RED 확인** — `pnpm test src/components/main/Reveal.test.tsx`

- [ ] **Step 3: 구현**

```tsx
// src/components/main/Reveal.tsx
"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import styles from "./Reveal.module.css";
import { cn } from "@/lib/utils";

export interface RevealProps {
  children: ReactNode;
  /** 스태거 지연(ms) — 카드 나열 시 i*120 권장(스펙 H3) */
  delay?: number;
  className?: string;
}

// 뷰포트 진입 시 1회 fade+slide-up(스펙 H3). reduced-motion이면 IO 미등록 — CSS가 즉시 표시.
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const el = ref.current;
    if (!el) {
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles.shown);
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(styles.reveal, className)}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
```

```css
/* src/components/main/Reveal.module.css */
/* IO 1회 등장(스펙 H3). 이동 거리 24px = 연출 수치.
   translate는 Tailwind v4에서 속성으로 컴파일되므로 여기서도 속성을 쓴다(transform 충돌 방지). */
.reveal {
  opacity: 0;
  translate: 0 24px;
  transition: opacity 0.6s ease, translate 0.6s ease;
  transition-delay: var(--reveal-delay, 0ms);
}
.shown {
  opacity: 1;
  translate: 0 0;
}

@media (prefers-reduced-motion: reduce) {
  /* JS 미등록 — 즉시 표시 */
  .reveal { opacity: 1; translate: none; transition: none; }
}
```

- [ ] **Step 4: PASS 확인** (4건)

---

### Task 2: 상수 확장 + DESIGN.md

**Files:** Modify `src/constants/content.ts`, `.claude/rules/DESIGN.md`

- [ ] **Step 1: content.ts** — `HISTORY`를 다음으로 교체(desc 추가):

```ts
export const HISTORY = {
  title: "연혁",
  items: [
    { year: "2010", text: "교회 설립", desc: "작은 모임에서 시작해 첫 예배를 드렸습니다." },
    { year: "2015", text: "교육관 건축", desc: "다음 세대를 위한 배움의 공간을 마련했습니다." },
    { year: "2020", text: "지역 섬김 사역 확대", desc: "이웃과 함께하는 사역으로 지경을 넓혔습니다." },
  ],
};
```

파일 하단(MAIN_SECTIONS 아래)에 추가:

```ts
// 메인 사역 카드(스펙 2026-06-12 H4·H5) — VISION.points의 3축을 카드로 승격.
// 아이콘은 직렬화 가능한 키만 — lucide 컴포넌트 매핑은 MinistryCards가 담당.
export const MINISTRY = { title: "우리의 사역" };
export interface Ministry {
  key: "worship" | "nextgen" | "serving";
  title: string;
  desc: string;
}
export const MINISTRIES: Ministry[] = [
  { key: "worship", title: "말씀 중심의 예배", desc: "주일과 평일, 삶의 자리마다 말씀으로 예배합니다." },
  { key: "nextgen", title: "다음 세대 양육", desc: "영유아부터 청년까지 세대별 교육으로 신앙을 세웁니다." },
  { key: "serving", title: "지역 사회 섬김", desc: "지역과 이웃의 필요에 응답하는 섬김을 실천합니다." },
];
```

- [ ] **Step 2: DESIGN.md** — `### 연출` 절(media-collage 항목 아래)에 추가:

```markdown
- **`history-band`**: 연혁 카드 시퀀스(참조: 우리은행 Dream). 연도 배지 + 헤드라인 + 설명의
  풀폭 라운드 밴드(`{rounded.xl}`)가 세로로 이어지고, 배경은 surface-dark·primary-soft·
  surface-soft 토큰 교차(브랜드 3색 직역 금지 — 단일 액센트 원칙). 뷰포트 진입 시 1회
  fade+slide-up(Reveal, 스태거 120ms).
- **`ministry-cards`**: 사역 카드 3-up(모바일 1-up). lucide 아이콘(32·currentColor) + 제목 +
  설명, 배경 토큰 교차는 history-band와 시작점을 달리한다. 동일한 Reveal 등장.
```

- [ ] **Step 3:** `pnpm exec tsc --noEmit` + 기존 history 페이지 테스트 회귀 확인(`pnpm test src/app`)

---

### Task 3: HistoryBand + MinistryCards (TDD)

**Files:** Create `src/components/main/HistoryBand.tsx`, `src/components/main/MinistryCards.tsx` + 각 테스트

- [ ] **Step 1: 실패하는 테스트 2파일**

```tsx
// src/components/main/HistoryBand.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import { HistoryBand } from "./HistoryBand";

afterEach(() => vi.unstubAllGlobals());

describe("HistoryBand", () => {
  it("연혁 항목을 연도 배지·헤드라인·설명 카드로 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<HistoryBand />);
    for (const item of HISTORY.items) {
      expect(screen.getByText(item.year)).toBeDefined();
      expect(screen.getByText(item.text)).toBeDefined();
      expect(screen.getByText(item.desc)).toBeDefined();
    }
  });
});
```

```tsx
// src/components/main/MinistryCards.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MINISTRY, MINISTRIES } from "@/constants/content";
import { MinistryCards } from "./MinistryCards";

afterEach(() => vi.unstubAllGlobals());

describe("MinistryCards", () => {
  it("섹션 헤딩과 사역 카드 3장(아이콘 포함)을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<MinistryCards />);
    expect(screen.getByRole("heading", { name: MINISTRY.title })).toBeDefined();
    for (const m of MINISTRIES) {
      expect(screen.getByText(m.title)).toBeDefined();
      expect(screen.getByText(m.desc)).toBeDefined();
    }
    expect(container.querySelectorAll("svg").length).toBe(3);
  });
});
```

- [ ] **Step 2: RED 확인**

- [ ] **Step 3: 구현**

```tsx
// src/components/main/HistoryBand.tsx
import { Container } from "@/components/shell/Container";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "./Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { HISTORY } from "@/constants/content";

// 카드 배경 토큰 교차(스펙 H2) — 참조의 브랜드 3색을 시스템 토큰으로 재해석(단일 액센트 원칙).
const BAND_TONES = [
  { card: "bg-surface-dark", head: "text-on-dark", body: "text-on-dark-soft" },
  { card: "bg-primary-soft", head: "text-ink", body: "text-body" },
  { card: "bg-surface-soft", head: "text-ink", body: "text-body" },
] as const;

// 연혁 카드 시퀀스(스펙 §3) — 연출 섹션이라 헤딩 없이 aria-label, 카드가 곧 콘텐츠.
export function HistoryBand() {
  return (
    <section aria-label={HISTORY.title} className="py-section">
      <Container className="flex flex-col gap-base">
        {HISTORY.items.map((item, i) => {
          const tone = BAND_TONES[i % BAND_TONES.length];
          return (
            <Reveal key={item.year} delay={i * 120}>
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
      </Container>
    </section>
  );
}
```

```tsx
// src/components/main/MinistryCards.tsx
import { BookOpen, GraduationCap, HeartHandshake, type LucideIcon } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Reveal } from "./Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { MINISTRY, MINISTRIES, type Ministry } from "@/constants/content";

// 아이콘은 컴포넌트에서 매핑 — 상수는 직렬화 가능한 키만 보유(스펙 §3). 색은 currentColor 상속.
const ICONS: Record<Ministry["key"], LucideIcon> = {
  worship: BookOpen,
  nextgen: GraduationCap,
  serving: HeartHandshake,
};

// 카드 배경 토큰 교차 — 연혁(HistoryBand)과 시작점을 달리해 인접 중복 회피(스펙 §3).
const CARD_TONES = [
  { card: "bg-primary-soft", head: "text-ink", body: "text-body" },
  { card: "bg-surface-soft", head: "text-ink", body: "text-body" },
  { card: "bg-surface-dark", head: "text-on-dark", body: "text-on-dark-soft" },
] as const;

export function MinistryCards() {
  return (
    <section className="py-section">
      <Container>
        <h2 className={cn(typo.displayLg, "text-ink")}>{MINISTRY.title}</h2>
        <div className="mt-lg grid gap-base sm:grid-cols-3">
          {MINISTRIES.map((m, i) => {
            const tone = CARD_TONES[i % CARD_TONES.length];
            const Icon = ICONS[m.key];
            return (
              <Reveal key={m.key} delay={i * 120} className="h-full">
                <div className={cn("h-full rounded-xl p-xl", tone.card, tone.head)}>
                  <Icon size={32} aria-hidden />
                  <p className={cn(typo.titleLg, "mt-base")}>{m.title}</p>
                  <p className={cn(typo.bodyMd, "mt-xs", tone.body)}>{m.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 4: PASS 확인**

---

### Task 4: 페이지 통합

**Files:** Modify `src/app/page.tsx`, `src/app/page.test.tsx`

- [ ] **Step 1: 실패하는 단언** — page.test 첫 it에 추가(import에 HISTORY·MINISTRY 추가):

```tsx
    // 연혁·사역 섹션이 콜라주 뒤에 합성된다(스펙 H1)
    const collageImg = container.querySelector('img[src="/collage-1.jpg"]')!;
    const historyHead = screen.getByText(HISTORY.items[0].text);
    expect(
      collageImg.compareDocumentPosition(historyHead) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: MINISTRY.title })).toBeDefined();
```

- [ ] **Step 2: RED → Step 3: page.tsx** — import 2줄 추가 후 `<MediaCollage ... />` 바로 아래에:

```tsx
        <HistoryBand />
        <MinistryCards />
```

- [ ] **Step 4: PASS + 전체 게이트** — `pnpm test && pnpm exec tsc --noEmit && pnpm lint && pnpm build`

- [ ] **Step 5: 브라우저 검증** — 콜라주 뒤 연혁 3밴드 스태거 등장, 사역 3카드, 모바일 1-up, reduced-motion 즉시 표시
