# 학생부 페이지 UI/UX 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/departments/student` 학생부 상세 페이지를, 부서 성격에 맞는 정보·활동·사진 섹션으로 보강해 "히어로+짧은 텍스트"의 빈 화면을 짜임새 있는 공개 페이지로 개선한다.

**Architecture:** 새 시각 요소를 발명하지 않는다. `Department` 상수 타입에 **옵션 필드**(intro·features·info·activities·programs·gallery·invite)를 더하고, 상세 페이지가 **데이터가 있는 섹션만 조건부(삼항) 렌더**한다. 각 섹션은 기존 홈/예배/교회사진 컴포넌트 패턴(`MinistryCards`·`Card surface="soft"`·`HistoryBand`·`ChurchPhotos` 라이트박스·`Reveal`)을 그대로 재사용한다. 학생부만 필드를 채우고, 다른 부서는 미기입 시 기존과 동일하게 렌더되어 회귀가 없다.

**Tech Stack:** Next.js(App Router, RSC) · TypeScript · Tailwind(디자인 토큰) · Radix Dialog(라이트박스) · lucide-react · vitest + @testing-library/react

## Global Constraints

- 사용자 노출 텍스트·이미지는 **하드코딩 금지** — 상수(`src/constants/departments.ts`)에서 주입한다.
- 텍스트 스타일은 **`typo.*` 상수만** 사용(`src/constants/typography.ts`). 폰트 크기/굵기/행간을 직접 쓰지 않는다.
- **hex·px 인라인 금지** — 색·간격·라운드는 Tailwind 토큰 유틸(`bg-surface-soft`·`p-xl`·`rounded-xl` 등)만. arbitrary value 금지(예외: 라이트박스 `max-w-[var(--container-lightbox)]`, 이미지 `max-h-[70vh]`, 썸네일 hover `scale-[1.03]` — 기존 `ChurchPhotos` 선례와 동일한 레이아웃 값).
- **UI 이모지 금지** — 원문의 🎉 등은 넣지 않는다. 아이콘은 `lucide-react`만(색 `currentColor`, 크기 `size` prop).
- **JSX 조건부는 삼항** — `{cond ? <X/> : null}`. `{cond && <X/>}` 금지(falsy `0`·`""` 방어).
- **허용 라이브러리 외 추가 금지.**
- **커밋 메시지 끝에 이슈 태그** — 형식 `<type> : <설명> #<번호>`. 이 작업 이슈 번호는 실행 시점에 확인해 사용한다(미확정이면 `#학생부` 자리표시 금지 — 실제 번호를 채운다). Co-Authored-By 태그 금지.
- **테스트 관례** — vitest globals:false(명시 import), jest-dom 미사용(`.toBeDefined()`/`.toBeNull()`/`getAttribute`), `Reveal`을 쓰는 컴포넌트 테스트는 `vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })))`로 reduced-motion 경로를 태워 IntersectionObserver 미등록으로 만든다.
- 밴드 리듬 유지: 흰 ↔ 회색(`bg-surface-soft`) ↔ 미디어 ↔ 다크(`CtaBand`). 디스플레이 굵기 500(토큰이 이미 보장).

---

## File Structure

**Create (컴포넌트 6 + 테스트 6):**
- `src/components/departments/DeptFeatures.tsx` — 인트로 헤딩+리드 + 3-up 기능 카드(tone 교차). 서버 컴포넌트(`Reveal` 클라 자식 렌더).
- `src/components/departments/DeptFeatures.test.tsx`
- `src/components/departments/DeptInfo.tsx` — `bg-surface-soft` 밴드 + 알림 사항 카드 2×2(label/value). 서버 컴포넌트.
- `src/components/departments/DeptInfo.test.tsx`
- `src/components/departments/DeptActivities.tsx` — 주요 활동 헤어라인 목록. 서버 컴포넌트.
- `src/components/departments/DeptActivities.test.tsx`
- `src/components/departments/DeptPrograms.tsx` — 특별 프로그램 soft 카드 2×2(이름+설명). 서버 컴포넌트.
- `src/components/departments/DeptPrograms.test.tsx`
- `src/components/departments/DeptGallery.tsx` — 활동 사진 그리드 + Dialog 라이트박스(탭 없음). **클라이언트 컴포넌트**(`"use client"`).
- `src/components/departments/DeptGallery.test.tsx`
- `src/components/departments/DeptInvite.tsx` — `bg-primary-soft` 밴드 + 초대 문구. 서버 컴포넌트.
- `src/components/departments/DeptInvite.test.tsx`

**Modify:**
- `src/constants/departments.ts` — `Department` 옵션 필드 추가, `DEPT_SECTIONS` 상수 추가, `student` 데이터 채움.
- `src/constants/departments.test.ts` — 새 필드/상수 assertion 추가.
- `src/app/departments/[slug]/page.tsx` — 새 섹션 조건부 조립.
- `src/app/departments/[slug]/page.test.tsx` — 학생부 새 섹션 노출 검증.

**정적 에셋(배포 시 실제 교체):** `public/dept/student/1.jpg` ~ `4.jpg` (placeholder). 코드 작업에는 실제 파일이 없어도 무방(경로 문자열만 사용). placeholder 생성은 선택.

---

## Task 1: 데이터 모델 확장 (Department 옵션 필드 + 학생부 데이터)

**Files:**
- Modify: `src/constants/departments.ts`
- Test: `src/constants/departments.test.ts`

**Interfaces:**
- Consumes: 기존 `Department`, `HeroMedia`.
- Produces:
  - `interface DeptFeature { icon: string; title: string; desc: string }`
  - `interface DeptInfoItem { label: string; value: string }`
  - `interface DeptProgram { name: string; desc: string }`
  - `interface DeptPhoto { src: string; alt: string }`
  - `Department`에 옵션 추가: `intro?: { heading: string; lead: string }`, `features?: DeptFeature[]`, `info?: DeptInfoItem[]`, `activities?: string[]`, `programs?: DeptProgram[]`, `gallery?: DeptPhoto[]`, `invite?: { heading: string; body: string }`.
  - `export const DEPT_SECTIONS = { info: "알림 사항", activities: "주요 활동", programs: "특별 프로그램", gallery: "활동 사진" } as const`

- [ ] **Step 1: Write the failing test** — `src/constants/departments.test.ts` 하단 `describe` 내부에 추가:

```ts
  it("학생부는 보강 섹션 데이터(intro·features·info·activities·programs·gallery·invite)를 보유한다", () => {
    const student = findDepartment("student")!;
    expect(student.intro?.heading).toBe("학생부");
    expect(student.features).toHaveLength(3);
    expect(student.features?.[0]).toMatchObject({ icon: "book", title: "청소년 신앙 교육" });
    expect(student.info?.map((i) => i.label)).toEqual([
      "담당자",
      "모임 시간",
      "연락처",
      "모임 장소",
    ]);
    expect(student.activities).toHaveLength(4);
    expect(student.programs).toHaveLength(4);
    expect(student.gallery?.length).toBeGreaterThan(0);
    expect(student.invite?.heading).toBe("학생부에서 함께해요");
  });

  it("섹션 헤딩 상수를 노출한다(하드코딩 0)", () => {
    expect(DEPT_SECTIONS.info).toBe("알림 사항");
    expect(DEPT_SECTIONS.activities.length).toBeGreaterThan(0);
    expect(DEPT_SECTIONS.programs.length).toBeGreaterThan(0);
    expect(DEPT_SECTIONS.gallery.length).toBeGreaterThan(0);
  });
```

그리고 파일 상단 import에 `DEPT_SECTIONS`를 추가:

```ts
import {
  DEPARTMENTS,
  DEPT_PAGE,
  DEPT_SECTIONS,
  allDepartmentSlugs,
  findDepartment,
  thumbnailOf,
  type Department,
} from "./departments";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/constants/departments.test.ts`
Expected: FAIL — `DEPT_SECTIONS` is not exported / `student.features` is undefined.

- [ ] **Step 3: Write minimal implementation** — `src/constants/departments.ts` 수정.

(a) 인터페이스 추가(`Department` 인터페이스 위에):

```ts
export interface DeptFeature {
  icon: string; // 직렬화 키 — 컴포넌트에서 lucide 아이콘으로 매핑(상수는 직렬화 가능 값만)
  title: string;
  desc: string;
}
export interface DeptInfoItem {
  label: string;
  value: string;
}
export interface DeptProgram {
  name: string;
  desc: string;
}
export interface DeptPhoto {
  src: string;
  alt: string;
}
```

(b) `Department` 인터페이스에 옵션 필드 추가(`children?` 아래):

```ts
  children?: Department[]; // 하위부서(옵션)
  // 부서 상세 보강 섹션(모두 옵션 — 미기입 부서는 기존과 동일하게 렌더)
  intro?: { heading: string; lead: string };
  features?: DeptFeature[];
  info?: DeptInfoItem[];
  activities?: string[];
  programs?: DeptProgram[];
  gallery?: DeptPhoto[];
  invite?: { heading: string; body: string };
```

(c) `DEPARTMENTS`의 `student` 항목을 보강 데이터로 교체(기존 slug/name/description/media/caption 유지, 필드 추가):

```ts
  {
    slug: "student",
    name: "학생부",
    description:
      "중·고등학생이 **말씀과 예배** 안에서 건강하게 자라가는 공동체입니다.\n\n매주 토요일 오전 11시, 학생·청년이 함께 예배하며 찬양과 말씀, 소그룹 나눔으로 모입니다.",
    media: img("student", "학생부"),
    caption: ["말씀으로 자라는", "다음 세대"],
    intro: {
      heading: "학생부",
      lead: "중·고등학생들이 하나님의 사랑 안에서 건강하게 성장할 수 있도록 돕는 사역입니다. 또래 친구들과 함께 신앙을 배우고 나누며, 꿈과 비전을 발견해 나가세요.",
    },
    features: [
      { icon: "book", title: "청소년 신앙 교육", desc: "성경 중심의 체계적 신앙 교육" },
      { icon: "users", title: "또래 교제", desc: "건전한 친구 관계와 공동체 의식" },
      { icon: "sparkles", title: "창의적 활동", desc: "재미있는 활동을 통한 전인적 성장" },
    ],
    info: [
      { label: "담당자", value: "학생부 담당 선생님" },
      { label: "모임 시간", value: "매주 토요일 오전 11시 (학생·청년예배)" },
      { label: "연락처", value: "041-337-2298" },
      { label: "모임 장소", value: "은샘침례교회 학생부실" },
    ],
    activities: [
      "토요일 학생 예배 및 성경공부",
      "여름·겨울 수련회 참가",
      "찬양과 율동 활동",
      "배드민턴 등 재미있는 활동",
    ],
    programs: [
      { name: "여름 수련회", desc: "자연 속에서 하나님과 더 가까워지는 시간" },
      { name: "겨울 수련회", desc: "한 해를 마무리하며 새로운 다짐을 세우는 시간" },
      { name: "찬양 경연대회", desc: "학생들의 재능을 발휘하는 특별한 무대" },
      { name: "배드민턴 프로그램", desc: "학생 예배 후에 하는 재밌는 배드민턴 운동" },
    ],
    gallery: [
      { src: "/dept/student/1.jpg", alt: "학생부 활동 사진 1" },
      { src: "/dept/student/2.jpg", alt: "학생부 활동 사진 2" },
      { src: "/dept/student/3.jpg", alt: "학생부 활동 사진 3" },
      { src: "/dept/student/4.jpg", alt: "학생부 활동 사진 4" },
    ],
    invite: {
      heading: "학생부에서 함께해요",
      body: "중·고등학생 친구들! 새로운 친구들과 만나고, 재미있는 활동을 통해 신앙을 배워나가세요. 또래 친구들과 함께 하나님의 사랑을 경험하며, 언제든지 편안하게 참여하실 수 있습니다.",
    },
  },
```

(d) `DEPT_PAGE` 상수 아래에 섹션 헤딩 상수 추가:

```ts
// 상세 보강 섹션 헤딩 — 하드코딩 금지(컴포넌트가 아닌 상수에서 주입).
export const DEPT_SECTIONS = {
  info: "알림 사항",
  activities: "주요 활동",
  programs: "특별 프로그램",
  gallery: "활동 사진",
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/constants/departments.test.ts`
Expected: PASS (전체 통과).

- [ ] **Step 5: Commit**

```bash
git add src/constants/departments.ts src/constants/departments.test.ts
git commit -m "feat : 부서 상세 보강 섹션 데이터 모델·학생부 콘텐츠 추가 #<이슈번호>"
```

---

## Task 2: DeptFeatures 컴포넌트 (인트로 + 3-up 기능 카드)

**Files:**
- Create: `src/components/departments/DeptFeatures.tsx`
- Test: `src/components/departments/DeptFeatures.test.tsx`

**Interfaces:**
- Consumes: `DeptFeature`(Task 1), `Reveal`, `Container`, `typo`, `cn`, lucide `BookOpen`·`Users`·`Sparkles`.
- Produces: `export function DeptFeatures({ heading, lead, items }: { heading: string; lead?: string; items: DeptFeature[] })`

- [ ] **Step 1: Write the failing test** — `src/components/departments/DeptFeatures.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeptFeatures } from "./DeptFeatures";
import type { DeptFeature } from "@/constants/departments";

afterEach(() => vi.unstubAllGlobals());

const items: DeptFeature[] = [
  { icon: "book", title: "청소년 신앙 교육", desc: "성경 중심의 체계적 신앙 교육" },
  { icon: "users", title: "또래 교제", desc: "건전한 친구 관계와 공동체 의식" },
  { icon: "sparkles", title: "창의적 활동", desc: "재미있는 활동을 통한 전인적 성장" },
];

describe("DeptFeatures", () => {
  it("헤딩·리드와 기능 카드 3장(아이콘 포함)을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(
      <DeptFeatures heading="학생부" lead="함께 성장해요" items={items} />,
    );
    expect(screen.getByRole("heading", { name: "학생부" })).toBeDefined();
    expect(screen.getByText("함께 성장해요")).toBeDefined();
    for (const f of items) {
      expect(screen.getByText(f.title)).toBeDefined();
      expect(screen.getByText(f.desc)).toBeDefined();
    }
    expect(container.querySelectorAll("svg").length).toBe(3);
  });

  it("lead가 없으면 리드 문단을 렌더하지 않는다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<DeptFeatures heading="학생부" items={items} />);
    expect(screen.getByRole("heading", { name: "학생부" })).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/departments/DeptFeatures.test.tsx`
Expected: FAIL — `Failed to resolve import "./DeptFeatures"`.

- [ ] **Step 3: Write minimal implementation** — `src/components/departments/DeptFeatures.tsx`:

```tsx
import { BookOpen, Sparkles, Users, type LucideIcon } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import type { DeptFeature } from "@/constants/departments";

// 아이콘은 직렬화 키를 컴포넌트에서 매핑(MinistryCards와 동일 방식). 색은 currentColor 상속.
const ICONS: Record<string, LucideIcon> = {
  book: BookOpen,
  users: Users,
  sparkles: Sparkles,
};

// 카드 배경 토큰 교차 — MinistryCards와 동일(단일 액센트 원칙).
const TONES = [
  { card: "bg-primary-soft", head: "text-ink", body: "text-body" },
  { card: "bg-surface-soft", head: "text-ink", body: "text-body" },
  { card: "bg-surface-dark", head: "text-on-dark", body: "text-on-dark-soft" },
] as const;

// 부서 인트로 헤딩·리드 + 3-up 기능 카드(WorshipRegular의 제목+리드+카드 패턴).
export function DeptFeatures({
  heading,
  lead,
  items,
}: {
  heading: string;
  lead?: string;
  items: DeptFeature[];
}) {
  return (
    <Container as="section" className="break-keep py-section">
      <Reveal>
        <h2 className={cn(typo.displayMd, "text-ink")}>{heading}</h2>
        {lead ? <p className={cn(typo.bodyMd, "mt-base text-body")}>{lead}</p> : null}
      </Reveal>
      <div className="mt-lg grid gap-base sm:grid-cols-3">
        {items.map((f, i) => {
          const tone = TONES[i % TONES.length];
          const Icon = ICONS[f.icon] ?? BookOpen;
          return (
            <Reveal key={f.title} delay={i * 120} className="h-full">
              <div className={cn("h-full rounded-xl p-xl", tone.card, tone.head)}>
                <Icon size={32} aria-hidden />
                <h3 className={cn(typo.titleLg, "mt-base")}>{f.title}</h3>
                <p className={cn(typo.bodyMd, "mt-xs", tone.body)}>{f.desc}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Container>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/departments/DeptFeatures.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/departments/DeptFeatures.tsx src/components/departments/DeptFeatures.test.tsx
git commit -m "feat : 부서 상세 DeptFeatures 기능 카드 섹션 추가 #<이슈번호>"
```

---

## Task 3: DeptInfo 컴포넌트 (알림 사항 카드 밴드)

**Files:**
- Create: `src/components/departments/DeptInfo.tsx`
- Test: `src/components/departments/DeptInfo.test.tsx`

**Interfaces:**
- Consumes: `DeptInfoItem`(Task 1), `Reveal`, `Container`, `Card`, `typo`, `cn`.
- Produces: `export function DeptInfo({ heading, items }: { heading: string; items: DeptInfoItem[] })`

- [ ] **Step 1: Write the failing test** — `src/components/departments/DeptInfo.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeptInfo } from "./DeptInfo";
import type { DeptInfoItem } from "@/constants/departments";

afterEach(() => vi.unstubAllGlobals());

const items: DeptInfoItem[] = [
  { label: "담당자", value: "학생부 담당 선생님" },
  { label: "연락처", value: "041-337-2298" },
];

describe("DeptInfo", () => {
  it("헤딩과 label/value 카드를 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<DeptInfo heading="알림 사항" items={items} />);
    expect(screen.getByRole("heading", { name: "알림 사항" })).toBeDefined();
    expect(screen.getByText("담당자")).toBeDefined();
    expect(screen.getByText("학생부 담당 선생님")).toBeDefined();
    expect(screen.getByText("041-337-2298")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/departments/DeptInfo.test.tsx`
Expected: FAIL — import 해석 실패.

- [ ] **Step 3: Write minimal implementation** — `src/components/departments/DeptInfo.tsx`:

```tsx
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { Card } from "@/components/ui/Card";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import type { DeptInfoItem } from "@/constants/departments";

// 알림 사항 — 회색 밴드 위 흰 카드(schedule-card 성격). label(muted) + value(ink).
export function DeptInfo({ heading, items }: { heading: string; items: DeptInfoItem[] }) {
  return (
    <section className="bg-surface-soft py-section">
      <Container>
        <Reveal>
          <h2 className={cn(typo.displayMd, "text-ink")}>{heading}</h2>
        </Reveal>
        <dl className="mt-lg grid gap-base sm:grid-cols-2">
          {items.map((it, i) => (
            <Reveal key={it.label} delay={i * 120} className="h-full">
              <Card className="h-full p-xl">
                <dt className={cn(typo.bodySm, "text-muted")}>{it.label}</dt>
                <dd className={cn(typo.titleMd, "mt-xs text-ink")}>{it.value}</dd>
              </Card>
            </Reveal>
          ))}
        </dl>
      </Container>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/departments/DeptInfo.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/departments/DeptInfo.tsx src/components/departments/DeptInfo.test.tsx
git commit -m "feat : 부서 상세 DeptInfo 알림 사항 밴드 추가 #<이슈번호>"
```

---

## Task 4: DeptActivities 컴포넌트 (주요 활동 목록)

**Files:**
- Create: `src/components/departments/DeptActivities.tsx`
- Test: `src/components/departments/DeptActivities.test.tsx`

**Interfaces:**
- Consumes: `Reveal`, `Container`, `typo`, `cn`, lucide `Check`.
- Produces: `export function DeptActivities({ heading, items }: { heading: string; items: string[] })`

- [ ] **Step 1: Write the failing test** — `src/components/departments/DeptActivities.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeptActivities } from "./DeptActivities";

afterEach(() => vi.unstubAllGlobals());

const items = ["토요일 학생 예배 및 성경공부", "여름·겨울 수련회 참가", "찬양과 율동 활동"];

describe("DeptActivities", () => {
  it("헤딩과 활동 항목을 목록으로 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<DeptActivities heading="주요 활동" items={items} />);
    expect(screen.getByRole("heading", { name: "주요 활동" })).toBeDefined();
    for (const item of items) {
      expect(screen.getByText(item)).toBeDefined();
    }
    expect(screen.getAllByRole("listitem")).toHaveLength(items.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/departments/DeptActivities.test.tsx`
Expected: FAIL — import 해석 실패.

- [ ] **Step 3: Write minimal implementation** — `src/components/departments/DeptActivities.tsx`:

```tsx
import { Check } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 주요 활동 — 헤어라인으로 구분되는 목록. 선두 체크(currentColor=primary)는 항목 마커.
export function DeptActivities({ heading, items }: { heading: string; items: string[] }) {
  return (
    <Container as="section" className="break-keep py-section">
      <Reveal>
        <h2 className={cn(typo.displayMd, "text-ink")}>{heading}</h2>
        <ul className="mt-lg">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-center gap-sm border-b border-hairline py-base last:border-b-0"
            >
              <Check size={20} aria-hidden className="shrink-0 text-primary" />
              <span className={cn(typo.bodyMd, "text-body")}>{item}</span>
            </li>
          ))}
        </ul>
      </Reveal>
    </Container>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/departments/DeptActivities.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/departments/DeptActivities.tsx src/components/departments/DeptActivities.test.tsx
git commit -m "feat : 부서 상세 DeptActivities 주요 활동 목록 추가 #<이슈번호>"
```

---

## Task 5: DeptPrograms 컴포넌트 (특별 프로그램 카드)

**Files:**
- Create: `src/components/departments/DeptPrograms.tsx`
- Test: `src/components/departments/DeptPrograms.test.tsx`

**Interfaces:**
- Consumes: `DeptProgram`(Task 1), `Reveal`, `Container`, `Card`, `typo`, `cn`.
- Produces: `export function DeptPrograms({ heading, items }: { heading: string; items: DeptProgram[] })`

- [ ] **Step 1: Write the failing test** — `src/components/departments/DeptPrograms.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeptPrograms } from "./DeptPrograms";
import type { DeptProgram } from "@/constants/departments";

afterEach(() => vi.unstubAllGlobals());

const items: DeptProgram[] = [
  { name: "여름 수련회", desc: "자연 속에서 하나님과 더 가까워지는 시간" },
  { name: "겨울 수련회", desc: "한 해를 마무리하며 새로운 다짐을 세우는 시간" },
];

describe("DeptPrograms", () => {
  it("헤딩과 프로그램 카드(이름+설명)를 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<DeptPrograms heading="특별 프로그램" items={items} />);
    expect(screen.getByRole("heading", { name: "특별 프로그램" })).toBeDefined();
    for (const p of items) {
      expect(screen.getByText(p.name)).toBeDefined();
      expect(screen.getByText(p.desc)).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/departments/DeptPrograms.test.tsx`
Expected: FAIL — import 해석 실패.

- [ ] **Step 3: Write minimal implementation** — `src/components/departments/DeptPrograms.tsx`:

```tsx
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { Card } from "@/components/ui/Card";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import type { DeptProgram } from "@/constants/departments";

// 특별 프로그램 — soft 카드 2×2(이름 + 설명). 계절 이벤트라 날짜 배지 없음.
export function DeptPrograms({ heading, items }: { heading: string; items: DeptProgram[] }) {
  return (
    <Container as="section" className="break-keep py-section">
      <Reveal>
        <h2 className={cn(typo.displayMd, "text-ink")}>{heading}</h2>
      </Reveal>
      <div className="mt-lg grid gap-base sm:grid-cols-2">
        {items.map((p, i) => (
          <Reveal key={p.name} delay={i * 120} className="h-full">
            <Card surface="soft" className="h-full p-xl">
              <h3 className={cn(typo.titleMd, "text-ink")}>{p.name}</h3>
              <p className={cn(typo.bodyMd, "mt-xs text-body")}>{p.desc}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </Container>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/departments/DeptPrograms.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/departments/DeptPrograms.tsx src/components/departments/DeptPrograms.test.tsx
git commit -m "feat : 부서 상세 DeptPrograms 특별 프로그램 카드 추가 #<이슈번호>"
```

---

## Task 6: DeptGallery 컴포넌트 (활동 사진 그리드 + 라이트박스)

**Files:**
- Create: `src/components/departments/DeptGallery.tsx`
- Test: `src/components/departments/DeptGallery.test.tsx`

**Interfaces:**
- Consumes: `DeptPhoto`(Task 1), `Container`, `Dialog`/`DialogContent`/`DialogTitle`(`@/components/ui/dialog`), `Button`(`@/components/ui/Button`), `typo`, `cn`, lucide `ChevronLeft`·`ChevronRight`.
- Produces: `export function DeptGallery({ heading, photos }: { heading: string; photos: DeptPhoto[] })`

> `ChurchPhotos`의 라이트박스 패턴에서 **카테고리 탭만 제거**한 단일 그룹 버전이다. 정적 `public/` 에셋을 `<img src>`로 직접 렌더(멤버 갤러리의 `PhotoLightbox`는 `apiUrl(/api/media/{id})` 전용이라 재사용 불가). `Reveal` 미사용 → 테스트에 matchMedia 스텁 불필요.

- [ ] **Step 1: Write the failing test** — `src/components/departments/DeptGallery.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeptGallery } from "./DeptGallery";
import type { DeptPhoto } from "@/constants/departments";

const photos: DeptPhoto[] = [
  { src: "/dept/student/1.jpg", alt: "사진 1" },
  { src: "/dept/student/2.jpg", alt: "사진 2" },
];

describe("DeptGallery", () => {
  it("헤딩과 썸네일 버튼을 렌더하고 초기엔 라이트박스가 닫혀 있다", () => {
    render(<DeptGallery heading="활동 사진" photos={photos} />);
    expect(screen.getByRole("heading", { name: "활동 사진" })).toBeDefined();
    expect(screen.getAllByRole("button", { name: /크게 보기/ })).toHaveLength(2);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("썸네일 클릭 시 라이트박스가 열리고 카운터를 보인다", () => {
    render(<DeptGallery heading="활동 사진" photos={photos} />);
    fireEvent.click(screen.getByRole("button", { name: "1번째 사진 크게 보기" }));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("1 / 2")).toBeDefined();
  });

  it("→ 키로 다음 사진으로 이동한다", () => {
    render(<DeptGallery heading="활동 사진" photos={photos} />);
    fireEvent.click(screen.getByRole("button", { name: "1번째 사진 크게 보기" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(screen.getByText("2 / 2")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/departments/DeptGallery.test.tsx`
Expected: FAIL — import 해석 실패.

- [ ] **Step 3: Write minimal implementation** — `src/components/departments/DeptGallery.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import type { DeptPhoto } from "@/constants/departments";

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-md";

// 활동 사진 — 그리드 + 확대 모달(ChurchPhotos 라이트박스 패턴, 카테고리 탭 없음).
// 정적 public 에셋을 <img>로 직접 렌더(멤버 갤러리 PhotoLightbox와 분리).
export function DeptGallery({ heading, photos }: { heading: string; photos: DeptPhoto[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const open = index !== null;
  const current = open ? photos[index] : null;
  const hasPrev = open && index > 0;
  const hasNext = open && index < photos.length - 1;

  const go = (delta: number) => {
    if (index === null) return;
    const next = index + delta;
    if (next >= 0 && next < photos.length) setIndex(next);
  };

  return (
    <Container as="section" className="py-section">
      <h2 className={cn(typo.displayMd, "text-ink")}>{heading}</h2>
      <div className="mt-lg grid grid-cols-2 gap-xs sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <button
            key={p.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`${i + 1}번째 사진 크게 보기`}
            className={cn("block w-full", focusRing)}
          >
            <span className="block aspect-square overflow-hidden rounded-md">
              {/* eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸 */}
              <img
                src={p.src}
                alt={p.alt}
                className="h-full w-full object-cover transition-transform duration-300 ease-out hover:scale-[1.03]"
              />
            </span>
          </button>
        ))}
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) setIndex(null);
        }}
      >
        <DialogContent
          className="max-w-[var(--container-lightbox)]"
          aria-describedby={undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") go(-1);
            if (e.key === "ArrowRight") go(1);
          }}
        >
          <DialogTitle className="sr-only">
            {heading} 사진 {open ? index + 1 : 0} / {photos.length}
          </DialogTitle>
          {current ? (
            <div className="flex flex-col gap-sm">
              <div className="relative flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸 */}
                <img
                  src={current.src}
                  alt={current.alt}
                  className="max-h-[70vh] w-auto rounded-md object-contain"
                />
                <Button
                  type="button"
                  variant="tertiary"
                  iconOnly
                  onClick={() => go(-1)}
                  disabled={!hasPrev}
                  aria-label="이전 사진"
                  className="absolute left-xs top-1/2 -translate-y-1/2 rounded-full bg-surface-card/80 p-xs text-ink disabled:opacity-30"
                >
                  <ChevronLeft size={24} aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="tertiary"
                  iconOnly
                  onClick={() => go(1)}
                  disabled={!hasNext}
                  aria-label="다음 사진"
                  className="absolute right-xs top-1/2 -translate-y-1/2 rounded-full bg-surface-card/80 p-xs text-ink disabled:opacity-30"
                >
                  <ChevronRight size={24} aria-hidden />
                </Button>
              </div>
              <div className={cn(typo.datetime, "text-center text-muted")}>
                {index! + 1} / {photos.length}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/departments/DeptGallery.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/departments/DeptGallery.tsx src/components/departments/DeptGallery.test.tsx
git commit -m "feat : 부서 상세 DeptGallery 활동 사진 갤러리 추가 #<이슈번호>"
```

---

## Task 7: DeptInvite 컴포넌트 (닫는 초대 밴드)

**Files:**
- Create: `src/components/departments/DeptInvite.tsx`
- Test: `src/components/departments/DeptInvite.test.tsx`

**Interfaces:**
- Consumes: `Reveal`, `Container`, `typo`, `cn`.
- Produces: `export function DeptInvite({ heading, body }: { heading: string; body: string })`

- [ ] **Step 1: Write the failing test** — `src/components/departments/DeptInvite.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeptInvite } from "./DeptInvite";

afterEach(() => vi.unstubAllGlobals());

describe("DeptInvite", () => {
  it("초대 헤딩과 본문을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<DeptInvite heading="학생부에서 함께해요" body="언제든 편안하게 참여하세요." />);
    expect(screen.getByRole("heading", { name: "학생부에서 함께해요" })).toBeDefined();
    expect(screen.getByText("언제든 편안하게 참여하세요.")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/departments/DeptInvite.test.tsx`
Expected: FAIL — import 해석 실패.

- [ ] **Step 3: Write minimal implementation** — `src/components/departments/DeptInvite.tsx`:

```tsx
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 닫는 초대 — primary-soft 밴드(따뜻한 강조). 전화·시간은 알림 사항에 있어 중복 제거, 메시지만.
export function DeptInvite({ heading, body }: { heading: string; body: string }) {
  return (
    <section className="bg-primary-soft py-section">
      <Container className="break-keep">
        <Reveal>
          <h2 className={cn(typo.displayMd, "text-ink")}>{heading}</h2>
          <p className={cn(typo.bodyLg, "mt-base text-body")}>{body}</p>
        </Reveal>
      </Container>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/departments/DeptInvite.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/departments/DeptInvite.tsx src/components/departments/DeptInvite.test.tsx
git commit -m "feat : 부서 상세 DeptInvite 초대 밴드 추가 #<이슈번호>"
```

---

## Task 8: 상세 페이지 조립 (조건부 섹션 렌더 + 페이지 테스트)

**Files:**
- Modify: `src/app/departments/[slug]/page.tsx`
- Test: `src/app/departments/[slug]/page.test.tsx`

**Interfaces:**
- Consumes: Task 2~7 컴포넌트, Task 1의 `DEPT_SECTIONS`.
- Produces: (없음 — 최종 조립)

- [ ] **Step 1: Write the failing test** — `src/app/departments/[slug]/page.test.tsx`의 첫 번째 `it`(제목·본문 합성) 블록 **끝부분**에 새 섹션 검증을 추가한다(기존 assertion 유지, 닫는 `});` 앞):

```tsx
    // 보강 섹션(학생부 상수 구동)이 노출된다
    expect(screen.getByRole("heading", { name: "알림 사항" })).toBeDefined();
    expect(screen.getByText("학생부 담당 선생님")).toBeDefined();
    expect(screen.getByRole("heading", { name: "주요 활동" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "특별 프로그램" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "여름 수련회" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "활동 사진" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "학생부에서 함께해요" })).toBeDefined();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/app/departments/[slug]/page.test.tsx`
Expected: FAIL — "알림 사항" 등 헤딩을 찾지 못함(아직 조립 전).

- [ ] **Step 3: Write minimal implementation** — `src/app/departments/[slug]/page.tsx` 전체를 아래로 교체:

```tsx
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { Container } from "@/components/shell/Container";
import { CtaBand } from "@/components/shell/CtaBand";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import DeptHero from "@/hero/DeptHero";
import { DeptLeader } from "@/components/departments/DeptLeader";
import { SubDepartments } from "@/components/departments/SubDepartments";
import { DeptFeatures } from "@/components/departments/DeptFeatures";
import { DeptInfo } from "@/components/departments/DeptInfo";
import { DeptActivities } from "@/components/departments/DeptActivities";
import { DeptPrograms } from "@/components/departments/DeptPrograms";
import { DeptGallery } from "@/components/departments/DeptGallery";
import { DeptInvite } from "@/components/departments/DeptInvite";
import {
  allDepartmentSlugs,
  findDepartment,
  DEPT_SECTIONS,
} from "@/constants/departments";

// 빌드 시 모든 부서 slug(하위 포함)를 정적 생성 — 상수 단일 출처라 백엔드 불필요.
export function generateStaticParams() {
  return allDepartmentSlugs().map((slug) => ({ slug }));
}

// 사역 부서 상세(공개) — 상수 구동. SiteShell 대신 투명+solid 고정 헤더 직접 합성.
// DeptHero 시작이 라이트라 on-dark 투명은 가독성 위험 → 라이트 스킨 고정(메인 무수정).
// 보강 섹션은 데이터가 있는 부서에만 조건부 노출(학생부만 채움, 타 부서는 기존과 동일).
export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dept = findDepartment(slug);
  if (!dept) {
    notFound();
  }

  // 줄 단위 카피 → block span(메인 caption과 동일 패턴, "\n" 이슈 차단).
  const caption = dept.caption.map((line, i) => (
    <span key={i} className="block">
      {line}
    </span>
  ));

  return (
    <>
      <SiteHeader variant="transparent" solid />
      <main className="flex-1">
        <DeptHero title={dept.name} caption={caption} media={dept.media} />
        <Container as="section" className="py-section">
          {dept.leader ? <DeptLeader name={dept.leader} /> : null}
          {dept.description ? (
            <MarkdownContent source={dept.description} className="mt-base" />
          ) : null}
        </Container>
        {dept.intro && dept.features?.length ? (
          <DeptFeatures
            heading={dept.intro.heading}
            lead={dept.intro.lead}
            items={dept.features}
          />
        ) : null}
        {dept.info?.length ? <DeptInfo heading={DEPT_SECTIONS.info} items={dept.info} /> : null}
        {dept.activities?.length ? (
          <DeptActivities heading={DEPT_SECTIONS.activities} items={dept.activities} />
        ) : null}
        {dept.programs?.length ? (
          <DeptPrograms heading={DEPT_SECTIONS.programs} items={dept.programs} />
        ) : null}
        {dept.gallery?.length ? (
          <DeptGallery heading={DEPT_SECTIONS.gallery} photos={dept.gallery} />
        ) : null}
        {dept.invite ? (
          <DeptInvite heading={dept.invite.heading} body={dept.invite.body} />
        ) : null}
        {dept.children?.length ? <SubDepartments items={dept.children} /> : null}
      </main>
      <CtaBand />
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/app/departments/[slug]/page.test.tsx`
Expected: PASS (기존 3 + 보강 assertion).

- [ ] **Step 5: 전체 게이트 검증**

Run (하나씩, 모두 통과 확인):
```bash
pnpm test -- src/components/departments src/constants/departments.test.ts "src/app/departments/[slug]/page.test.tsx"
npx tsc --noEmit
pnpm lint
pnpm build
```
Expected: 테스트 전부 PASS · tsc 에러 0 · lint 통과 · build 성공. (`pnpm lint`은 타입체크를 하지 않으므로 `tsc --noEmit`을 반드시 별도 실행 — effect 내 setState 등은 lint에서 잡힘.)

- [ ] **Step 6: Commit**

```bash
git add "src/app/departments/[slug]/page.tsx" "src/app/departments/[slug]/page.test.tsx"
git commit -m "feat : 학생부 상세 페이지 보강 섹션 조립 #<이슈번호>"
```

---

## Self-Review (작성자 체크 완료)

**1. Spec coverage** — 스펙 각 섹션 대응:
- 데이터 모델(옵션 필드·DEPT_SECTIONS) → Task 1 ✅
- DeptFeatures/Info/Activities/Programs/Gallery/Invite → Task 2~7 ✅
- 페이지 조건부 조립·밴드 리듬 → Task 8 ✅
- 콘텐츠 정리(🎉 제거·전화/시간 중복 통합) → Task 1 데이터(invite에 전화/시간 없음, 이모지 없음) ✅
- 재사용성(타 부서 옵션 필드) → 모든 섹션 조건부 렌더, 미기입 부서 회귀 없음(Task 8) ✅
- 검수 게이트(반응형·토큰·이모지/hex 금지·테스트·build) → Task 8 Step 5 ✅

**2. Placeholder scan** — 모든 스텝에 실제 코드/명령/기대 출력 포함. `#<이슈번호>`는 커밋 시 실제 번호로 치환(Global Constraints에 명시). ✅

**3. Type consistency** — `DeptFeature`/`DeptInfoItem`/`DeptProgram`/`DeptPhoto` 및 각 컴포넌트 prop 시그니처가 Task 1 정의와 Task 2~8 사용처에서 일치. `DeptGallery`는 `photos` prop(페이지에서 `photos={dept.gallery}`), 나머지는 `items`. 헤딩은 `DEPT_SECTIONS.*`(info/activities/programs/gallery) + `DeptFeatures`는 `dept.intro.heading`, `DeptInvite`는 `dept.invite.heading`. ✅

## 콘텐츠 노트

- 주요 활동(정기)과 특별 프로그램(계절 이벤트)은 수련회·배드민턴에서 소재가 겹치나 성격이 달라(정기 리듬 vs 이벤트 소개) 편집상 구분을 유지한다.
- 담당자·모임 시간은 히어로/알림/닫는문구 3중 중복이던 원문을 **알림 사항 1회**로 통합했고, 닫는 초대(DeptInvite)에는 전화·시간을 넣지 않는다.
- `public/dept/student/*.jpg`는 placeholder — 실제 활동 사진 확보 시 교체(개수 변동은 `gallery` 배열만 수정하면 됨).
```
