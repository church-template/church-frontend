# 예배 시간 안내 페이지(`/worship`) 재디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/worship`를 정기 예배(흰)·특별 예배(회색)·장소·참석 안내(다크) 3밴드 구조로 재디자인한다.

**Architecture:** 오시는 길(#74) 패턴을 따른다 — `page.tsx`는 3개 서버 컴포넌트를 조립만 하고, 콘텐츠는 `content.ts`·`church.ts` 상수 주입으로 정적 생성(API 0). 특별 예배는 기존 `EventCard`를 재사용한다.

**Tech Stack:** Next.js(App Router) 서버 컴포넌트, TypeScript, Tailwind(v4 `@theme` 토큰), lucide-react(미사용 — 토큰 순수성 위해 아이콘 없이 진행), vitest + @testing-library/react.

## Global Constraints

- **디자인 토큰만** — hex·px 인라인 금지, arbitrary value(`bg-[#...]`) 금지. 색·간격·라운드는 Tailwind 토큰 유틸(`bg-surface-dark`·`gap-xl`·`rounded-xl` 등). 예외 없음. `h-14 px-8`은 기존 `CtaBand` 선례(간격 토큰 스케일).
- **텍스트 스타일은 `typo.*`** — `src/constants/typography.ts` 의미 상수만. 폰트 크기/굵기/행간 직접 지정 금지.
- **다크 밴드 텍스트는 on-dark 계열** — `text-on-dark`(#fff)·`text-on-dark-soft`(#a8acb3). canvas 토큰 재사용 금지.
- **JSX 조건부는 삼항** — `{cond ? <X/> : null}`. `{cond && <X/>}` 금지. `cn()` 내부 `&&`만 허용.
- **콘텐츠 하드코딩 금지** — 사용자 노출 텍스트는 `content.ts`(`WORSHIP`·`WORSHIP_SERVICES`·`SPECIAL_SERVICES`)·`church.ts`(`CHURCH_ADDRESS`·`CHURCH_PHONE`)에서 주입. 구조적 UI 라벨("주소"·"문의"·"오시는 길 자세히")은 인라인 허용(오시는 길 관례).
- **주석은 한국어, WHY 중심** — 주변 코드 스타일에 맞춘다.
- **비파괴** — 메인 페이지가 `WORSHIP.title`·`WORSHIP_SERVICES[].place`를 소비하므로 기존 필드 유지, 추가만. `church.ts`·`WorshipSection.tsx`·`ScheduleCard.tsx`·`EventCard.tsx` 변경 없음.
- **테스트 관례** — vitest `globals:false`(명시 import), jest-dom 미사용(`getAttribute`/`toBeDefined`). `Reveal`이 `useEffect`에서 `matchMedia` 호출 → jsdom 미구현이라 각 테스트에서 `vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })))` 스텁(about/* 관례). `next/link`는 렌더하는 파일에서 `vi.mock("next/link", …)`. `IntersectionObserver`는 `vitest.setup.ts` 전역 스텁.
- **커밋** — 프로젝트 규칙상 커밋은 명시 요청 시에만. 각 태스크의 커밋 단계는 사용자 승인/`/commit` 트리거 시 실행하며, 형식은 `<type> : <설명> #76`(콜론 앞뒤 공백, 이슈 태그 필수), Co-Authored-By 금지. 메모리 관례상 마이크로 커밋 대신 기능별로 묶어도 된다.

---

### Task 1: WorshipRegular (정기 예배, 흰 캔버스) + 콘텐츠 상수

**Files:**
- Create: `src/components/worship/WorshipRegular.tsx`
- Create: `src/components/worship/WorshipRegular.test.tsx`
- Modify: `src/constants/content.ts` (`WORSHIP`에 `regularLead` 추가, `WorshipService`에 `praise?`·`notes` 추가, 4개 항목에 `notes`/`praise` 채움)

**Interfaces:**
- Consumes: `Container`(`as` prop), `Reveal`(`delay?`·`className?`), `Card`(`surface="soft"`), `typo`, `cn`.
- Produces: `WorshipRegular()` 서버 컴포넌트(named export). 확장된 `WorshipService { name; time; place; praise?; notes: string[] }`. `WORSHIP.regularLead: string`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/worship/WorshipRegular.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";
import { WorshipRegular } from "./WorshipRegular";

describe("WorshipRegular", () => {
  it("제목(h1)·리드·정기 예배 4카드(이름·시간·찬양·설명)를 렌더한다", () => {
    // Reveal이 useEffect에서 matchMedia 호출 — jsdom 미구현이라 reduced 경로로 스텁(about/* 관례).
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<WorshipRegular />);

    expect(screen.getByRole("heading", { level: 1, name: WORSHIP.title })).toBeDefined();
    expect(screen.getByText(WORSHIP.regularLead)).toBeDefined();
    // 예배명은 h3 — 4종 전부(slice 회귀 방지)
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(WORSHIP_SERVICES.length);

    const sunday = WORSHIP_SERVICES.find((s) => s.name === "주일예배")!;
    expect(screen.getByText(sunday.time)).toBeDefined();
    expect(screen.getByText(sunday.praise!)).toBeDefined();
    expect(screen.getByText(sunday.notes[0])).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test -- src/components/worship/WorshipRegular.test.tsx`
Expected: FAIL — `WorshipRegular` 모듈 없음(그리고 `regularLead`/`praise`/`notes` 미정의).

- [ ] **Step 3: 콘텐츠 상수 확장**

`src/constants/content.ts`의 `WORSHIP`·`WorshipService`·`WORSHIP_SERVICES`를 교체(기존 `title`·`place` 유지):

```ts
export const WORSHIP = {
  title: "예배 시간 안내",
  regularLead: "매주 드리는 정기 예배에 참여하여 하나님과 더 가까이 만나세요.",
};

export interface WorshipService {
  name: string;
  time: string;
  place: string; // 기존 유지 — 메인 ScheduleCard 소비
  praise?: string; // 찬양 시간 서브라인(없으면 생략)
  notes: string[]; // 예배별 설명 3줄
}
export const WORSHIP_SERVICES: WorshipService[] = [
  {
    name: "새벽예배",
    time: "월~토 오전 5:30",
    place: "본당",
    notes: ["새벽 기도와 말씀 묵상", "하루를 시작하는 은혜로운 시간", "조용하고 경건한 분위기"],
  },
  {
    name: "주일예배",
    time: "주일 오전 11:00",
    place: "본당",
    praise: "오전 10시 40분 찬양",
    notes: ["주일 대예배 시간", "전 성도가 함께 드리는 예배", "설교·찬양·성찬식 진행"],
  },
  {
    name: "수요예배",
    time: "수요일 오후 7:20",
    place: "본당",
    praise: "오후 7시 찬양",
    notes: ["주중 말씀 은혜를 받는 시간", "성경 공부와 기도", "친밀한 교제와 나눔"],
  },
  {
    name: "학생·청년예배",
    time: "토요일 오전 11:00",
    place: "본당",
    notes: ["주말 예배 시간", "자유롭고 은혜로운 분위기", "학생·청년들을 위한 예배"],
  },
];
```

> 주의: 파일에 기존 `WORSHIP`·`WorshipService`·`WORSHIP_SERVICES` 선언이 이미 있다(약 312–318행). 새로 추가하지 말고 그 블록을 위 내용으로 교체한다(중복 선언 시 컴파일 에러).

- [ ] **Step 4: WorshipRegular 구현**

`src/components/worship/WorshipRegular.tsx`:

```tsx
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { Card } from "@/components/ui/Card";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";

// 흰 캔버스 — 정기 예배 2×2 카드(이름·대표시간·찬양시간·설명 3줄). 페이지 h1을 겸한다.
export function WorshipRegular() {
  return (
    <Container as="section" className="break-keep py-section">
      <Reveal>
        <h1 className={cn(typo.displayMd, "text-ink")}>{WORSHIP.title}</h1>
        <p className={cn(typo.bodyMd, "mt-base text-body")}>{WORSHIP.regularLead}</p>
      </Reveal>
      <ul className="mt-xxl grid gap-base sm:grid-cols-2">
        {WORSHIP_SERVICES.map((s, i) => (
          <li key={s.name}>
            <Reveal delay={i * 120} className="h-full">
              <Card surface="soft" className="h-full p-xl">
                <h3 className={cn(typo.titleMd, "text-ink")}>{s.name}</h3>
                <p className={cn(typo.datetime, "mt-xs text-body")}>{s.time}</p>
                {s.praise ? (
                  <p className={cn(typo.datetime, "mt-xxs text-muted")}>{s.praise}</p>
                ) : null}
                <div className={cn(typo.bodySm, "mt-base text-body")}>
                  {s.notes.map((note) => (
                    <p key={note} className="mt-xs first:mt-0">
                      {note}
                    </p>
                  ))}
                </div>
              </Card>
            </Reveal>
          </li>
        ))}
      </ul>
    </Container>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm test -- src/components/worship/WorshipRegular.test.tsx`
Expected: PASS.

- [ ] **Step 6: 회귀 확인(기존 스위트)**

Run: `npx tsc --noEmit && pnpm test`
Expected: PASS — 기존 `worship/page.test.tsx`는 아직 이전 `page.tsx`(예배명 h2 4개)를 검증하므로 여전히 green(상수 추가는 렌더 무영향). 메인 `WorshipSection`도 `place` 유지로 무영향.

- [ ] **Step 7: 체크포인트(커밋은 사용자 승인 시)**

```bash
git add src/components/worship/WorshipRegular.tsx src/components/worship/WorshipRegular.test.tsx src/constants/content.ts
git commit -m "feat : 예배시간 정기 예배 섹션·콘텐츠 상수 확장 #76"
```

---

### Task 2: WorshipSpecial (특별 예배, 회색 밴드) + 특별 예배 상수

**Files:**
- Create: `src/components/worship/WorshipSpecial.tsx`
- Create: `src/components/worship/WorshipSpecial.test.tsx`
- Modify: `src/constants/content.ts` (`WORSHIP`에 `specialHeading`·`specialLead` 추가, `SpecialService` 인터페이스 + `SPECIAL_SERVICES` 신규)

**Interfaces:**
- Consumes: `Container`, `Reveal`, `EventCard`(`date?`·`title`·`time?`·`summary?` — href 없이 비인터랙티브), `typo`, `cn`, `WORSHIP.specialHeading`·`WORSHIP.specialLead`, `SPECIAL_SERVICES`.
- Produces: `WorshipSpecial()` 서버 컴포넌트. `SpecialService { name; date; time; desc }`. `SPECIAL_SERVICES: SpecialService[]`(6개).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/worship/WorshipSpecial.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { WORSHIP, SPECIAL_SERVICES } from "@/constants/content";

// EventCard가 next/link를 모듈 임포트 — href 없어 렌더되진 않지만 EventCard.test 관례대로 안전 모킹.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { WorshipSpecial } from "./WorshipSpecial";

describe("WorshipSpecial", () => {
  it("특별 예배 6종을 날짜·제목·설명과 함께 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<WorshipSpecial />);

    expect(
      screen.getByRole("heading", { level: 2, name: WORSHIP.specialHeading }),
    ).toBeDefined();
    // EventCard 제목은 h3 — 6개(slice 회귀 방지)
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(SPECIAL_SERVICES.length);

    const first = SPECIAL_SERVICES[0]; // 송구영신 예배 — date/time/desc가 6종 중 유일값
    expect(screen.getByText(first.name)).toBeDefined();
    expect(screen.getByText(first.date)).toBeDefined();
    expect(screen.getByText(first.time)).toBeDefined();
    expect(screen.getByText(first.desc)).toBeDefined();
  });
});
```

> 시간 단언은 `SPECIAL_SERVICES[0].time`("오전 0시", 유일값)만 사용한다 — 나머지 5종은 "오전 11시"를 공유해 `getByText`가 다중 매칭된다.

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test -- src/components/worship/WorshipSpecial.test.tsx`
Expected: FAIL — `WorshipSpecial` 모듈 없음(그리고 `specialHeading`/`SPECIAL_SERVICES` 미정의).

- [ ] **Step 3: 특별 예배 상수 추가**

`src/constants/content.ts` — Task 1에서 만든 `WORSHIP` 객체에 필드 추가:

```ts
export const WORSHIP = {
  title: "예배 시간 안내",
  regularLead: "매주 드리는 정기 예배에 참여하여 하나님과 더 가까이 만나세요.",
  specialHeading: "특별 예배",
  specialLead: "연중 진행되는 의미 있는 특별 예배들입니다.",
};
```

그리고 `WORSHIP_SERVICES` 선언 아래에 신규 인터페이스·상수 추가:

```ts
export interface SpecialService {
  name: string;
  date: string; // 배지 — "1월 1일", "부활절 주일" 등 서술형 혼용
  time: string;
  desc: string;
}
export const SPECIAL_SERVICES: SpecialService[] = [
  { name: "송구영신 예배", date: "1월 1일", time: "오전 0시", desc: "새해를 맞아 하나님께 감사드리는 특별예배" },
  { name: "부활절 예배", date: "부활절 주일", time: "오전 11시", desc: "예수님의 부활을 기념하는 특별예배" },
  { name: "창립기념감사 예배", date: "5월 셋째 주일", time: "오전 11시", desc: "교회 창립을 기념하며 하나님께 감사드리는 예배" },
  { name: "맥추 감사절 예배", date: "6월 마지막 주일", time: "오전 11시", desc: "맥추 감사절을 맞아 첫 열매를 드리며 감사드리는 예배" },
  { name: "추수 감사절 예배", date: "11월 셋째 주일", time: "오전 11시", desc: "한 해의 은혜를 되돌아보며 감사드리는 예배" },
  { name: "성탄절 예배", date: "12월 25일", time: "오전 11시", desc: "예수님의 탄생을 기념하는 성탄절 특별예배" },
];
```

- [ ] **Step 4: WorshipSpecial 구현**

`src/components/worship/WorshipSpecial.tsx`:

```tsx
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { EventCard } from "@/components/cards/EventCard";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { WORSHIP, SPECIAL_SERVICES } from "@/constants/content";

// 회색 밴드 — 특별 예배 6종을 EventCard(날짜 배지) 3-up으로. href 없이 비인터랙티브.
export function WorshipSpecial() {
  return (
    <section className="break-keep bg-surface-soft py-section">
      <Container>
        <Reveal>
          <h2 className={cn(typo.titleLg, "text-ink")}>{WORSHIP.specialHeading}</h2>
          <p className={cn(typo.bodyMd, "mt-base text-body")}>{WORSHIP.specialLead}</p>
        </Reveal>
        <ul className="mt-xxl grid gap-base sm:grid-cols-2 lg:grid-cols-3">
          {SPECIAL_SERVICES.map((s, i) => (
            <li key={s.name}>
              <Reveal delay={i * 120} className="h-full">
                <EventCard date={s.date} title={s.name} time={s.time} summary={s.desc} />
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm test -- src/components/worship/WorshipSpecial.test.tsx`
Expected: PASS.

- [ ] **Step 6: 체크포인트(커밋은 사용자 승인 시)**

```bash
git add src/components/worship/WorshipSpecial.tsx src/components/worship/WorshipSpecial.test.tsx src/constants/content.ts
git commit -m "feat : 예배시간 특별 예배 섹션·상수 추가 #76"
```

---

### Task 3: WorshipPlace (장소·참석 안내, 다크 밴드) + 상수

**Files:**
- Create: `src/components/worship/WorshipPlace.tsx`
- Create: `src/components/worship/WorshipPlace.test.tsx`
- Modify: `src/constants/content.ts` (`WORSHIP`에 `placeHeading`·`placeLead`·`placeLandmark`·`attendHeading`·`attendLead`·`attendNotes` 추가)

**Interfaces:**
- Consumes: `Link`(next/link), `Container`, `Reveal`, `buttonVariants`(`"outlineOnDark"`), `typo`, `cn`, `CHURCH_ADDRESS`·`CHURCH_PHONE`(`@/constants/church`), `WORSHIP.place*`·`WORSHIP.attend*`.
- Produces: `WorshipPlace()` 서버 컴포넌트. `WORSHIP.placeHeading`·`placeLead`·`placeLandmark`·`attendHeading`·`attendLead`·`attendNotes: string[]`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/worship/WorshipPlace.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { WORSHIP } from "@/constants/content";
import { CHURCH_ADDRESS, CHURCH_PHONE } from "@/constants/church";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { WorshipPlace } from "./WorshipPlace";

describe("WorshipPlace", () => {
  it("장소·문의·참석 안내와 오시는 길 링크를 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<WorshipPlace />);

    expect(
      screen.getByRole("heading", { level: 2, name: WORSHIP.placeHeading }),
    ).toBeDefined();
    expect(screen.getByText(CHURCH_ADDRESS)).toBeDefined();

    const tel = screen.getByRole("link", { name: CHURCH_PHONE });
    expect(tel.getAttribute("href")).toBe(`tel:${CHURCH_PHONE}`);

    const more = screen.getByRole("link", { name: "오시는 길 자세히" });
    expect(more.getAttribute("href")).toBe("/about/location");

    expect(screen.getByText(WORSHIP.attendHeading)).toBeDefined();
    expect(screen.getByText(WORSHIP.attendNotes[0])).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test -- src/components/worship/WorshipPlace.test.tsx`
Expected: FAIL — `WorshipPlace` 모듈 없음.

- [ ] **Step 3: 상수 추가**

`src/constants/content.ts`의 `WORSHIP` 객체에 필드 추가(최종 형태):

```ts
export const WORSHIP = {
  title: "예배 시간 안내",
  regularLead: "매주 드리는 정기 예배에 참여하여 하나님과 더 가까이 만나세요.",
  specialHeading: "특별 예배",
  specialLead: "연중 진행되는 의미 있는 특별 예배들입니다.",
  placeHeading: "예배 장소 안내",
  placeLead: "모든 예배는 교회에서 진행됩니다.",
  placeLandmark: "유리 건물",
  attendHeading: "예배 참석 안내",
  attendLead: "처음 오시는 분들도 편안하게 참석하실 수 있습니다.",
  attendNotes: [
    "오전 10시 40분부터 찬양으로 예배합니다.",
    "예배 후 간단한 교제 시간이 있습니다.",
    "주차 공간이 준비되어 있습니다.",
  ],
};
```

- [ ] **Step 4: WorshipPlace 구현**

`src/components/worship/WorshipPlace.tsx`:

```tsx
import Link from "next/link";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { buttonVariants } from "@/components/ui/Button";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { CHURCH_ADDRESS, CHURCH_PHONE } from "@/constants/church";
import { WORSHIP } from "@/constants/content";

// 다크 밴드 — 좌: 장소 안내(주소·문의·오시는 길 링크) / 우: 참석 안내. 지도는 /about/location 위임.
export function WorshipPlace() {
  return (
    <section className="break-keep bg-surface-dark py-section">
      <Container>
        <Reveal>
          <div className="grid gap-xl lg:grid-cols-2 lg:items-start">
            {/* 좌 — 장소 안내 */}
            <div>
              <h2 className={cn(typo.titleLg, "text-on-dark")}>{WORSHIP.placeHeading}</h2>
              <p className={cn(typo.bodyMd, "mt-base text-on-dark-soft")}>{WORSHIP.placeLead}</p>
              <dl className="mt-xl grid gap-lg">
                <div>
                  <dt className={cn(typo.captionStrong, "text-on-dark-soft")}>주소</dt>
                  <dd className={cn(typo.bodyMd, "mt-xs text-on-dark")}>{CHURCH_ADDRESS}</dd>
                  <dd className={cn(typo.bodySm, "mt-xxs text-on-dark-soft")}>
                    {WORSHIP.placeLandmark}
                  </dd>
                </div>
                <div>
                  <dt className={cn(typo.captionStrong, "text-on-dark-soft")}>문의</dt>
                  <dd className={cn(typo.bodyMd, "mt-xs text-on-dark")}>
                    <a href={`tel:${CHURCH_PHONE}`} className="hover:text-primary">
                      {CHURCH_PHONE}
                    </a>
                  </dd>
                </div>
              </dl>
              <Link
                href="/about/location"
                className={cn(buttonVariants("outlineOnDark"), "mt-xl h-14 px-8")}
              >
                오시는 길 자세히
              </Link>
            </div>
            {/* 우 — 참석 안내 */}
            <div>
              <h3 className={cn(typo.titleMd, "text-on-dark")}>{WORSHIP.attendHeading}</h3>
              <p className={cn(typo.bodySm, "mt-base text-on-dark-soft")}>{WORSHIP.attendLead}</p>
              <div className={cn(typo.bodyMd, "mt-base text-on-dark")}>
                {WORSHIP.attendNotes.map((note) => (
                  <p key={note} className="mt-sm first:mt-0">
                    {note}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
```

> 아이콘 미사용: DESIGN에서 아이콘은 선택 사항이고, 다크 밴드 위 lucide 아이콘의 baseline 정렬에 스케일 밖 px 유틸(`mt-1` 등)이 필요해 토큰 순수성을 위해 생략한다. `dt`/`dd` 라벨·값 위계로 충분하다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm test -- src/components/worship/WorshipPlace.test.tsx`
Expected: PASS.

- [ ] **Step 6: 체크포인트(커밋은 사용자 승인 시)**

```bash
git add src/components/worship/WorshipPlace.tsx src/components/worship/WorshipPlace.test.tsx src/constants/content.ts
git commit -m "feat : 예배시간 장소·참석 안내 다크 밴드 추가 #76"
```

---

### Task 4: 페이지 조립 + 기존 테스트 갱신 + 전체 게이트

**Files:**
- Modify: `src/app/(site)/worship/page.tsx` (3개 섹션 조립으로 교체)
- Modify: `src/app/(site)/worship/page.test.tsx` (구조 변경 반영 — 이전 `heading level:2 == 4` 단언 폐기)

**Interfaces:**
- Consumes: `WorshipRegular`·`WorshipSpecial`·`WorshipPlace`(Tasks 1–3).
- Produces: 없음(페이지는 최종 소비자).

- [ ] **Step 1: 기존 page.test.tsx를 새 구조로 교체(실패하는 상태로)**

`src/app/(site)/worship/page.test.tsx` 전체를 교체:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { WORSHIP } from "@/constants/content";
import WorshipPage from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("WorshipPage", () => {
  it("정기·특별·장소 세 섹션을 조립해 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<WorshipPage />);

    expect(screen.getByRole("heading", { level: 1, name: WORSHIP.title })).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 2, name: WORSHIP.specialHeading }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 2, name: WORSHIP.placeHeading }),
    ).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test -- "src/app/(site)/worship/page.test.tsx"`
Expected: FAIL — 이전 `page.tsx`엔 `specialHeading`/`placeHeading` h2가 없다.

- [ ] **Step 3: page.tsx를 조립으로 교체**

`src/app/(site)/worship/page.tsx` 전체를 교체:

```tsx
import { WorshipRegular } from "@/components/worship/WorshipRegular";
import { WorshipSpecial } from "@/components/worship/WorshipSpecial";
import { WorshipPlace } from "@/components/worship/WorshipPlace";

// 예배 시간 안내 — 정적 생성(공개 콘텐츠는 상수 주입, API 호출 없음).
export default function WorshipPage() {
  return (
    <>
      <WorshipRegular />
      <WorshipSpecial />
      <WorshipPlace />
    </>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test -- "src/app/(site)/worship/page.test.tsx"`
Expected: PASS.

- [ ] **Step 5: 전체 게이트**

Run:
```bash
pnpm lint
npx tsc --noEmit
pnpm test
pnpm build
```
Expected: 전부 통과. `pnpm build`는 `/worship` 정적 생성 확인(API 호출 0). 메인 페이지 테스트(`WorshipSection`)도 green 유지(`place` 미변경).

- [ ] **Step 6: 반응형·육안 확인**

Run: `pnpm dev` → `http://localhost:3000/worship`
확인: 데스크톱 정기 2×2 / 특별 3×2, 태블릿 2-up, 모바일 1-up으로 접힘. 다크 밴드 좌우 분할 → 모바일 세로 1단. 시간 숫자 tnum 정렬(`typo.datetime`). "오시는 길 자세히" → `/about/location` 이동. 고령 가독성(본문 20/18px)·터치 타깃(버튼 56px) 확인.

- [ ] **Step 7: 체크포인트(커밋은 사용자 승인 시)**

```bash
git add "src/app/(site)/worship/page.tsx" "src/app/(site)/worship/page.test.tsx"
git commit -m "feat : 예배시간 안내 페이지 3밴드 조립·테스트 갱신 #76"
```

---

## Self-Review

**1. 스펙 커버리지**
- 정기 예배(찬양·설명 3줄) → Task 1 ✓
- 특별 예배 6종(날짜 배지) → Task 2 ✓
- 장소·참석 안내(주소·문의·오시는 길 링크) → Task 3 ✓
- 3밴드 리듬(흰·회색·다크) → 각 컴포넌트 배경 토큰 ✓
- 비파괴(메인·church.ts·EventCard) → Global Constraints + `place` 유지 ✓
- 지도 중복 회피(링크 위임) → Task 3 `/about/location` 링크 ✓
- 정적 생성·상수 주입 → Task 4 page.tsx 주석 ✓
- 기존 테스트 갱신 → Task 4 Step 1 ✓

**2. 플레이스홀더 스캔:** 없음. 모든 코드·테스트·명령이 완전.

**3. 타입 일관성:** `WorshipService{name;time;place;praise?;notes}`·`SpecialService{name;date;time;desc}`·`WORSHIP` 필드명이 상수 정의(Task 1–3)와 컴포넌트 소비(동일 태스크)·테스트에서 일치. `EventCard` props(`date`·`title`·`time`·`summary`)는 기존 시그니처와 일치. `buttonVariants("outlineOnDark")`는 `CtaBand` 선례와 동일.
