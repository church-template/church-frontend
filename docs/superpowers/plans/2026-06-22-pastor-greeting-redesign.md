# 목회자 인사말 페이지 재디자인 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 목회자 인사말 페이지(`/about/pastor`)를 흰→다크(인용)→회색 밴드 교차의 "편집된 인물 지면"으로 재구성한다.

**Architecture:** 서버 컴포넌트 페이지가 3개 밴드 컴포넌트(`PastorIntro`·`PastorQuote`·`PastorDossier`)를 합성한다. 콘텐츠는 `PASTOR` 상수 주입, 등장 연출은 기존 `Reveal` 클라이언트 island. 초상 폴백은 `PastorPortrait`가 담당.

**Tech Stack:** Next.js 16 App Router(RSC), TypeScript, Tailwind v4 토큰, vitest + @testing-library/react, lucide-react, pnpm.

**설계 출처:** `docs/superpowers/specs/2026-06-22-pastor-greeting-redesign-design.md`

## Global Constraints

- **커밋 금지** — 사용자 지시. 각 태스크는 커밋하지 않고 검증 게이트(test+tsc+lint 통과)로 종료한다.
- **토큰 전용** — hex·px 인라인 금지, arbitrary value(`bg-[#..]`·`aspect-[3/4]`) 금지. 커스텀 비율은 CSS 모듈 `aspect-ratio`로(선례 `HistoryStory.module.css`).
- **텍스트 스타일은 `typo.*`** — 폰트 크기/굵기/행간 직접 지정 금지. 새 typo 토큰 추가 안 함(기존만 사용 → twmerge 등록 불필요).
- **단일 액센트** — primary는 본문 1회(밴드2 Badge)만. 두 번째 브랜드 컬러 금지. 디스플레이 굵기 500 유지(700+ 금지).
- **아이콘은 lucide-react만** — 색 `currentColor`/토큰, 크기 `size` prop. UI 이모지 금지.
- **JSX 조건부는 삼항** — `{cond && <X/>}` 금지, `{cond ? <X/> : null}` 사용.
- **이미지** — `<img>` + `eslint-disable @next/next/no-img-element`(코드베이스 관례, next/image는 후속). 새 그림자 단계 추가 금지.
- **주석은 한국어 WHY 중심**, 패키지 매니저 **pnpm**.
- **테스트 관례** — vitest `globals:false`(명시 import), jest-dom 미사용(`getAttribute`/`toBeDefined`/`textContent`). `Reveal` 래핑 컴포넌트 테스트는 매 `it`에서 `vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })))` + 파일에 `afterEach(() => vi.unstubAllGlobals())`. 커버리지 80%+.
- **검증 명령** — 파일별: `npx vitest run <path>` · 전체 타입: `npx tsc --noEmit` · 린트: `pnpm lint`.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `src/constants/content.ts` | `PASTOR`에 `image`·`pullQuote` 추가, `philosophy.items` 객체화 + `PastorPhilosophyKey` 타입 |
| `src/components/about/PastorPortrait.tsx` | 3:4 초상 액자 — `image` 있으면 `<img>`, 없으면 폴백(lucide `UserRound`) |
| `src/components/about/PastorPortrait.module.css` | 초상 프레임 `aspect-ratio: 3/4` + media/placeholder |
| `src/components/about/PastorIntro.tsx` | 밴드1 — 5/7 스플릿(초상 + 키커·이름·직분·학위·intro·greeting) |
| `src/components/about/PastorQuote.tsx` | 밴드2 — 다크 elevated 인용 카드 + Badge + lucide `Quote` |
| `src/components/about/PastorDossier.tsx` | 밴드3 — 약력 헤어라인 행 + 목회 철학 아이콘 그리드 |
| `src/app/(site)/about/pastor/page.tsx` | 3개 밴드 합성 + `metadata` |
| `*.test.tsx` | 각 컴포넌트·페이지 테스트 |

---

## Task 1: 콘텐츠 모델 확장 (`PASTOR`)

**Files:**
- Modify: `src/constants/content.ts:181-213` (`PASTOR`)
- Modify: `src/app/(site)/about/pastor/page.tsx` (philosophy 렌더를 `.text`로 — 컴파일 유지용 임시, Task 6에서 재작성)
- Modify: `src/app/(site)/about/pastor/page.test.tsx:17` (`items[0]` → `items[0].text`)

**Interfaces:**
- Produces:
  - `PASTOR.image: { src: string; alt: string } | null`
  - `PASTOR.pullQuote: string`
  - `PASTOR.philosophy.items: { key: PastorPhilosophyKey; text: string }[]`
  - `export type PastorPhilosophyKey = "worship" | "bible" | "fellowship" | "community" | "nextgen" | "mission"`
  - 유지: `title`·`name`·`position`·`degree`·`intro`·`greeting`·`credentials.{heading,items: string[]}`·`philosophy.heading`

- [ ] **Step 1: `PastorPhilosophyKey` 타입과 `PASTOR` 확장**

`src/constants/content.ts`의 `PASTOR` 블록(현재 181~213행)을 아래로 교체. `intro`·`greeting`·`credentials.items` 텍스트 값은 **기존 그대로 유지**하고 표시한 필드만 추가/변경한다.

```ts
// 목회자 인사말 페이지 — 소개·인사말·약력·목회 철학. 사진은 자산 준비 후 image에 주입.
export type PastorPhilosophyKey =
  | "worship"
  | "bible"
  | "fellowship"
  | "community"
  | "nextgen"
  | "mission";

export const PASTOR = {
  title: "목회자 인사말",
  name: "홍성균",
  position: "담임목사",
  degree: "한국침례신학대학교 석사 (M.Div)",
  // 포트레이트 자산 — 미준비 시 null(플레이스홀더 폴백). 준비되면 { src, alt } 주입.
  image: null as { src: string; alt: string } | null,
  // 다크 밴드 핵심 인용 1문장 — 컴포넌트 발췌 금지(콘텐츠 하드코딩 방지).
  pullQuote:
    "은샘에서 함께함이 축복이 되는 행복한 신앙의 삶을 시작하시길 주님의 이름으로 축원합니다.",
  intro:
    "홍성균 목사님은 은샘침례교회를 섬기고 있습니다. 성경적인 설교와 따뜻한 목회로 성도들의 영적 성장을 돕고 있으며, 교회와 지역 사회를 위한 다양한 사역을 이끌고 있습니다.",
  greeting: [
    "하나님의 은혜와 사랑으로 시작된 은샘교회에 오심을 주님의 이름으로 축복합니다. 사람의 계획보다 더 큰 계획을 가지고 계신 하나님께서 덕산에 작은 교회를 통하여 하나님의 일을 시작하셨고, 지금까지 도우심으로 지금 이곳에 은샘교회가 여전히 존재합니다.",
    "지금까지 지키신 에벤에셀의 하나님께서 앞으로도 지키시고 도우시고 복주시며 이곳을 들고 나는 모든 이들을 축복하실 것입니다. 은샘에서 함께함이 축복이 되는 행복한 신앙의 삶을 시작하시고 경험하시고 누리시길 주님의 이름으로 축원합니다.",
  ],
  credentials: {
    heading: "학력 및 경력",
    items: [
      "한국침례신학대학교 신학과 졸업",
      "한국침례신학대학교 목회신학대학원 석사 (M.Div)",
      "2011년 은샘침례교회 개척 및 담임목사 취임",
      "기독교한국침례회 소속",
      "한국 베트남 신학교 강사",
    ],
  },
  philosophy: {
    heading: "목회 철학",
    // 아이콘 매핑용 key 부여(컴포넌트가 매핑, 상수는 직렬화 키만 — MinistryCards 선례).
    items: [
      { key: "worship", text: "예배와 교회가 중심이 되는 신앙생활" },
      { key: "bible", text: "성경 중심의 설교와 목회" },
      { key: "fellowship", text: "성도들과의 따뜻한 교제와 돌봄" },
      { key: "community", text: "지역 사회를 섬기는 교회" },
      { key: "nextgen", text: "다음 세대를 세우는 교육 사역" },
      { key: "mission", text: "선교와 전도에 힘쓰는 교회" },
    ] satisfies { key: PastorPhilosophyKey; text: string }[],
  },
};
```

- [ ] **Step 2: 기존 페이지를 컴파일 유지(임시 한 줄)**

`src/app/(site)/about/pastor/page.tsx`의 philosophy 렌더에서 항목이 객체가 됐으므로 `{p}` → `{p.text}`, `key={p}` → `key={p.key}`로 수정(이 파일은 Task 6에서 전면 재작성됨 — 지금은 빌드 그린 유지가 목적).

```tsx
{PASTOR.philosophy.items.map((p) => (
  <li key={p.key} className={cn(typo.bodySm, "text-muted")}>
    {p.text}
  </li>
))}
```

- [ ] **Step 3: 기존 테스트 단언 수정**

`src/app/(site)/about/pastor/page.test.tsx:17`을 객체 접근으로 수정.

```tsx
expect(screen.getByText(PASTOR.philosophy.items[0].text)).toBeDefined();
```

- [ ] **Step 4: 검증 게이트 (커밋 안 함)**

```bash
npx vitest run "src/app/(site)/about/pastor/page.test.tsx"
npx tsc --noEmit
pnpm lint
```
Expected: 테스트 PASS, tsc 출력 없음(0 에러), lint 경고/에러 없음. **커밋하지 않는다.**

---

## Task 2: `PastorPortrait` 컴포넌트 + CSS 모듈

**Files:**
- Create: `src/components/about/PastorPortrait.tsx`
- Create: `src/components/about/PastorPortrait.module.css`
- Test: `src/components/about/PastorPortrait.test.tsx`

**Interfaces:**
- Consumes: 없음(순수 표시). `image: { src: string; alt: string } | null` prop.
- Produces: `export function PastorPortrait(props: { image: { src: string; alt: string } | null }): JSX.Element`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/about/PastorPortrait.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PastorPortrait } from "./PastorPortrait";

describe("PastorPortrait", () => {
  it("image가 있으면 alt·src를 가진 img를 렌더한다", () => {
    const { container } = render(
      <PastorPortrait image={{ src: "/about/pastor.jpg", alt: "홍성균 담임목사" }} />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("alt")).toBe("홍성균 담임목사");
    expect(img?.getAttribute("src")).toBe("/about/pastor.jpg");
  });

  it("image가 null이면 img 없이 장식 폴백(아이콘)을 렌더한다", () => {
    const { container } = render(<PastorPortrait image={null} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/components/about/PastorPortrait.test.tsx
```
Expected: FAIL — "Failed to resolve import './PastorPortrait'".

- [ ] **Step 3: CSS 모듈 작성**

`src/components/about/PastorPortrait.module.css`(선례 `HistoryStory.module.css`의 `.asideMedia` 패턴):

```css
/* 3:4 세로 초상 프레임 — 커스텀 비율은 CSS 모듈로(arbitrary value 금지). 박스 예약으로 CLS 0. */
.frame { aspect-ratio: 3 / 4; }
.media { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }
.placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
```

- [ ] **Step 4: 컴포넌트 작성**

`src/components/about/PastorPortrait.tsx`:

```tsx
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./PastorPortrait.module.css";

export interface PastorPortraitProps {
  image: { src: string; alt: string } | null;
}

// 3:4 초상 액자. 자산 미준비(null)면 surface-soft 폴백 + 장식 아이콘(가짜 사진 끼우지 않음).
// 두 분기 모두 동일 프레임이 박스를 예약 → 자산 도착 시 CLS 0.
export function PastorPortrait({ image }: PastorPortraitProps) {
  return (
    <div className={cn(styles.frame, "overflow-hidden rounded-xl border border-hairline")}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- 코드베이스 관례(콘텐츠 이미지 next/image 전환은 후속)
        <img src={image.src} alt={image.alt} className={styles.media} />
      ) : (
        <div className={cn(styles.placeholder, "bg-surface-soft text-muted")}>
          <UserRound size={64} aria-hidden />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx vitest run src/components/about/PastorPortrait.test.tsx
```
Expected: PASS (2 tests).

- [ ] **Step 6: 검증 게이트 (커밋 안 함)**

```bash
npx tsc --noEmit
pnpm lint
```
Expected: 0 에러/경고. **커밋하지 않는다.**

---

## Task 3: `PastorIntro` 컴포넌트 (밴드1)

**Files:**
- Create: `src/components/about/PastorIntro.tsx`
- Test: `src/components/about/PastorIntro.test.tsx`

**Interfaces:**
- Consumes: `PastorPortrait`(Task 2), `PASTOR`(Task 1), `Container`, `Reveal`, `typo`, `cn`.
- Produces: `export function PastorIntro(): JSX.Element` (props 없음 — `PASTOR` 직접 주입, MinistryCards 패턴).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/about/PastorIntro.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PASTOR } from "@/constants/content";
import { PastorIntro } from "./PastorIntro";

afterEach(() => vi.unstubAllGlobals());

describe("PastorIntro", () => {
  it("키커·이름·직분·학위·intro·greeting을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<PastorIntro />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toContain(PASTOR.name);
    expect(h1.textContent).toContain(PASTOR.position);
    expect(screen.getByText(PASTOR.degree)).toBeDefined();
    expect(screen.getByText(PASTOR.intro)).toBeDefined();
    expect(screen.getByText(PASTOR.greeting[0])).toBeDefined();
    expect(screen.getByText(PASTOR.greeting[1])).toBeDefined();
  });

  it("자산 미준비 시 초상 폴백(아이콘)을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<PastorIntro />);
    // PASTOR.image 기본값 null → img 없이 장식 아이콘
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/components/about/PastorIntro.test.tsx
```
Expected: FAIL — "Failed to resolve import './PastorIntro'".

- [ ] **Step 3: 컴포넌트 작성**

`src/components/about/PastorIntro.tsx`:

```tsx
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { PastorPortrait } from "./PastorPortrait";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { PASTOR } from "@/constants/content";

// 밴드1 — 흰 캔버스 비대칭 5/7 스플릿(좌 초상 / 우 인사말 본문). intro·greeting 모두 흰 위(가독성).
export function PastorIntro() {
  return (
    <Container as="section" className="py-section">
      <Reveal>
        <div className="grid gap-xxl lg:grid-cols-[5fr_7fr] lg:items-start">
          <PastorPortrait image={PASTOR.image} />
          <div>
            <p className={cn(typo.captionStrong, "text-muted")}>{PASTOR.title}</p>
            <h1 className={cn(typo.displayMd, "mt-xs text-ink")}>
              {PASTOR.name}{" "}
              <span className={cn(typo.titleMd, "text-muted")}>{PASTOR.position}</span>
            </h1>
            <p className={cn(typo.datetime, "mt-xs text-muted")}>{PASTOR.degree}</p>
            <p className={cn(typo.bodyMd, "mt-lg text-body")}>{PASTOR.intro}</p>
            <div className={cn(typo.bodyMd, "mt-base text-body")}>
              {PASTOR.greeting.map((p) => (
                <p key={p} className="mt-base first:mt-0">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </Container>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/components/about/PastorIntro.test.tsx
```
Expected: PASS (2 tests).

- [ ] **Step 5: 검증 게이트 (커밋 안 함)**

```bash
npx tsc --noEmit
pnpm lint
```
Expected: 0 에러/경고. **커밋하지 않는다.**

---

## Task 4: `PastorQuote` 컴포넌트 (밴드2 — 다크 인용 카드)

**Files:**
- Create: `src/components/about/PastorQuote.tsx`
- Test: `src/components/about/PastorQuote.test.tsx`

**Interfaces:**
- Consumes: `PASTOR`(Task 1), `Container`, `Reveal`, `Badge`, `typo`, `cn`, lucide `Quote`.
- Produces: `export function PastorQuote(): JSX.Element`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/about/PastorQuote.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PASTOR } from "@/constants/content";
import { PastorQuote } from "./PastorQuote";

afterEach(() => vi.unstubAllGlobals());

describe("PastorQuote", () => {
  it("핵심 인용문과 직분·이름 배지를 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<PastorQuote />);
    expect(screen.getByText(PASTOR.pullQuote)).toBeDefined();
    expect(screen.getByText(`${PASTOR.position} ${PASTOR.name}`)).toBeDefined();
    // 장식 인용 글리프(lucide) 존재
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/components/about/PastorQuote.test.tsx
```
Expected: FAIL — "Failed to resolve import './PastorQuote'".

- [ ] **Step 3: 컴포넌트 작성**

`src/components/about/PastorQuote.tsx`:

```tsx
import { Quote } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { Badge } from "@/components/ui/Badge";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { PASTOR } from "@/constants/content";

// 밴드2 — 다크 밴드 위 elevated 카드(인용). DESIGN '깊이가 더 필요하면 다크 밴드 elevated'(새 그림자 0).
// primary 액센트는 이 페이지에서 Badge 1회만 등장(희소할수록 강하다).
export function PastorQuote() {
  return (
    <section className="bg-surface-dark py-section">
      <Container>
        <Reveal>
          <figure className="rounded-xl bg-surface-dark-elevated p-xxl">
            <Quote size={32} aria-hidden className="text-on-dark-soft" />
            <blockquote className={cn(typo.displayLg, "mt-base text-on-dark")}>
              {PASTOR.pullQuote}
            </blockquote>
            <figcaption className="mt-lg">
              <Badge variant="primary">{`${PASTOR.position} ${PASTOR.name}`}</Badge>
            </figcaption>
          </figure>
        </Reveal>
      </Container>
    </section>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/components/about/PastorQuote.test.tsx
```
Expected: PASS (1 test).

- [ ] **Step 5: 검증 게이트 (커밋 안 함)**

```bash
npx tsc --noEmit
pnpm lint
```
Expected: 0 에러/경고. **커밋하지 않는다.**

---

## Task 5: `PastorDossier` 컴포넌트 (밴드3 — 약력 + 철학)

**Files:**
- Create: `src/components/about/PastorDossier.tsx`
- Test: `src/components/about/PastorDossier.test.tsx`

**Interfaces:**
- Consumes: `PASTOR`·`PastorPhilosophyKey`(Task 1), `Container`, `Reveal`, `typo`, `cn`, lucide `BookOpen`/`Church`/`GraduationCap`/`HandHeart`/`HeartHandshake`/`Send`.
- Produces: `export function PastorDossier(): JSX.Element`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/about/PastorDossier.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PASTOR } from "@/constants/content";
import { PastorDossier } from "./PastorDossier";

afterEach(() => vi.unstubAllGlobals());

describe("PastorDossier", () => {
  it("약력·철학 헤딩과 전 항목을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<PastorDossier />);
    expect(screen.getByText(PASTOR.credentials.heading)).toBeDefined();
    for (const item of PASTOR.credentials.items) {
      expect(screen.getByText(item)).toBeDefined();
    }
    expect(screen.getByText(PASTOR.philosophy.heading)).toBeDefined();
    for (const item of PASTOR.philosophy.items) {
      expect(screen.getByText(item.text)).toBeDefined();
    }
  });

  it("철학 6항목마다 장식 아이콘(svg)을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<PastorDossier />);
    expect(container.querySelectorAll("svg").length).toBe(PASTOR.philosophy.items.length);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/components/about/PastorDossier.test.tsx
```
Expected: FAIL — "Failed to resolve import './PastorDossier'".

- [ ] **Step 3: 컴포넌트 작성**

`src/components/about/PastorDossier.tsx` (철학 그리드는 MinistryCards 패턴; `ul>li>Reveal>div` 유효 중첩):

```tsx
import {
  BookOpen,
  Church,
  GraduationCap,
  HandHeart,
  HeartHandshake,
  Send,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { PASTOR, type PastorPhilosophyKey } from "@/constants/content";

// 철학 키→아이콘 매핑(상수는 직렬화 키만, 색은 currentColor=ink 상속 — MinistryCards 선례).
const PHILOSOPHY_ICONS: Record<PastorPhilosophyKey, LucideIcon> = {
  worship: Church,
  bible: BookOpen,
  fellowship: HeartHandshake,
  community: HandHeart,
  nextgen: GraduationCap,
  mission: Send,
};

// 밴드3 — 회색 밴드. 약력 헤어라인 행(세로) + 목회 철학 풀폭 3-up 아이콘 그리드.
export function PastorDossier() {
  return (
    <section className="bg-surface-soft py-section">
      <Container>
        <h2 className={cn(typo.titleLg, "text-ink")}>{PASTOR.credentials.heading}</h2>
        <ul className="mt-lg">
          {PASTOR.credentials.items.map((item, i) => (
            <li key={item} className="border-t border-hairline-soft first:border-t-0">
              <Reveal delay={i * 120}>
                <p className={cn(typo.bodyMd, "py-base text-body")}>{item}</p>
              </Reveal>
            </li>
          ))}
        </ul>

        <h2 className={cn(typo.titleLg, "mt-xl text-ink")}>{PASTOR.philosophy.heading}</h2>
        <ul className="mt-lg grid gap-base sm:grid-cols-2 lg:grid-cols-3">
          {PASTOR.philosophy.items.map((item, i) => {
            const Icon = PHILOSOPHY_ICONS[item.key];
            return (
              <li key={item.key} className="h-full">
                <Reveal delay={i * 120} className="h-full">
                  <div className="h-full rounded-xl bg-canvas p-xl">
                    <Icon size={32} aria-hidden className="text-ink" />
                    <p className={cn(typo.titleMd, "mt-base text-ink")}>{item.text}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/components/about/PastorDossier.test.tsx
```
Expected: PASS (2 tests). svg 개수 = 6.

- [ ] **Step 5: 검증 게이트 (커밋 안 함)**

```bash
npx tsc --noEmit
pnpm lint
```
Expected: 0 에러/경고. **커밋하지 않는다.**

---

## Task 6: 페이지 합성 + 테스트 재작성

**Files:**
- Modify(재작성): `src/app/(site)/about/pastor/page.tsx`
- Modify(재작성): `src/app/(site)/about/pastor/page.test.tsx`

**Interfaces:**
- Consumes: `PastorIntro`(Task 3)·`PastorQuote`(Task 4)·`PastorDossier`(Task 5)·`PASTOR`(Task 1).
- Produces: `export default function PastorPage(): JSX.Element`, `export const metadata: Metadata`.

- [ ] **Step 1: 통합 테스트 재작성(실패 유도)**

`src/app/(site)/about/pastor/page.test.tsx` 전체를 교체:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PASTOR } from "@/constants/content";
import PastorPage from "./page";

afterEach(() => vi.unstubAllGlobals());

describe("PastorPage", () => {
  it("인사말 헤더·인용·약력·철학을 모두 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<PastorPage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toContain(PASTOR.name);
    expect(h1.textContent).toContain(PASTOR.position);
    expect(screen.getByText(PASTOR.intro)).toBeDefined();
    expect(screen.getByText(PASTOR.greeting[0])).toBeDefined();
    expect(screen.getByText(PASTOR.pullQuote)).toBeDefined();
    expect(screen.getByText(PASTOR.credentials.heading)).toBeDefined();
    expect(screen.getByText(PASTOR.credentials.items[0])).toBeDefined();
    expect(screen.getByText(PASTOR.philosophy.heading)).toBeDefined();
    expect(screen.getByText(PASTOR.philosophy.items[0].text)).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run "src/app/(site)/about/pastor/page.test.tsx"
```
Expected: FAIL — 아직 옛 단일 컬럼 페이지라 `pullQuote` 미렌더(또는 h1 텍스트 불일치).

- [ ] **Step 3: 페이지 재작성**

`src/app/(site)/about/pastor/page.tsx` 전체를 교체:

```tsx
import type { Metadata } from "next";
import { PastorIntro } from "@/components/about/PastorIntro";
import { PastorQuote } from "@/components/about/PastorQuote";
import { PastorDossier } from "@/components/about/PastorDossier";

export const metadata: Metadata = { title: "목회자 인사말" };

// 공개 인사말 — 상수 구동 서버 컴포넌트. 흰→다크(인용)→회색→전역 다크 CTA 밴드 리듬.
export default function PastorPage() {
  return (
    <>
      <PastorIntro />
      <PastorQuote />
      <PastorDossier />
    </>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run "src/app/(site)/about/pastor/page.test.tsx"
```
Expected: PASS (1 test).

- [ ] **Step 5: 전체 검증 게이트 (커밋 안 함)**

```bash
npx vitest run src/components/about src/app/\(site\)/about/pastor
npx tsc --noEmit
pnpm lint
pnpm build
```
Expected: 모든 테스트 PASS, tsc 0 에러, lint 0, build 성공. **커밋하지 않는다.**

---

## Self-Review (작성자 체크 — 검토 완료)

**1. Spec coverage:** 밴드1(Task 3)·밴드2(Task 4)·밴드3(Task 5)·데이터 모델(Task 1)·페이지 합성(Task 6)·폴백(Task 2)·단일 액센트(Task 4 Badge)·모션(각 Reveal)·접근성(h1/blockquote/aria-hidden)·테스트(각 태스크) 모두 태스크에 매핑됨. 자산 배치는 비범위(자산 도착 시 `PASTOR.image`만 설정).

**2. Placeholder scan:** TBD/TODO/"적절히" 없음. 모든 코드 스텝에 실제 코드 포함. 콘텐츠 텍스트는 실제 값.

**3. Type consistency:** `PastorPhilosophyKey`(Task 1) ↔ `Record<PastorPhilosophyKey, LucideIcon>`(Task 5) 일치. `PASTOR.image: {src,alt}|null`(Task 1) ↔ `PastorPortraitProps.image`(Task 2) ↔ `PastorIntro`가 `PASTOR.image` 전달(Task 3) 일치. `pullQuote: string`(Task 1) ↔ `PastorQuote`(Task 4) 일치. `philosophy.items: {key,text}[]`(Task 1) ↔ 소비처(Task 5·6) 일치.

**검수 게이트(설계 §1):** hex·px·arbitrary 0(비율은 CSS 모듈), 두 번째 색 0, 700+ 0, 새 그림자 0, RSC 유지, reduced-motion 안전, 커버리지 80%+. 커밋 없음.
