# 설교 등록 UX 개선 및 예배 안내 페이지 보강 구현 계획 (#109)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설교 등록 폼에 설교자·설교일(오늘 KST) 기본값과 연도 4자리 제한을 넣고, 예배 안내 카드의 시간을 강조하며 설교 목록 진입 CTA를 추가한다.

**Architecture:** 네이티브 `<input type="date">`를 유지한 채 `max` 속성과 RHF defaultValues로 보정한다. 시간 강조는 신규 typo 위계 `datetime-lg`를 디자인 시스템 절차(DESIGN.md → globals.css `@theme` → `typo` → twMerge 등록)대로 등록해 사용한다. 콘텐츠는 전부 상수 주입(church.ts·content.ts).

**Tech Stack:** Next.js(App Router)·TypeScript·react-hook-form·Tailwind v4(@theme 토큰)·vitest + testing-library.

**스펙:** `docs/superpowers/specs/2026-07-20-sermon-ux-worship-page-design.md`

## Global Constraints

- 커밋 메시지: `<type> : <설명> #109` 형식. Co-Authored-By 금지. push 금지(사용자 요청 시에만).
- 주석은 한국어·WHY 중심, 주변 스타일에 맞춘다.
- 콘텐츠 하드코딩 금지 — 사용자 노출 문자열은 상수(`church.ts`·`content.ts`) 주입.
- 텍스트 스타일은 `typo.*` 상수만. hex·px 인라인 금지. JSX 조건부는 삼항(`{cond ? <X/> : null}`).
- 새 `--text-*` 토큰은 반드시 `src/lib/utils.ts` extendTailwindMerge 목록에도 등록(누락 시 `cn()`이 크기 클래스를 제거).
- vitest 관례: globals:false — `import { describe, it, expect, vi } from "vitest"` 명시. jest-dom 없음 — `.value`·`getAttribute`·`toBeDefined` 사용. `next/link`는 `<a>` 반환 mock.
- `pnpm lint`는 타입체크가 아님 — 최종 검증에서 `npx tsc --noEmit` 별도 실행.
- `globals.css` 구조 변경 후 dev 서버는 재시작해야 반영된다(테스트에는 영향 없음).
- 이번 작업에 새 Next.js API 없음 — `next/link`+`buttonVariants` 링크형 CTA는 기존 관례(admin-inline-action) 복사.
- 패키지 매니저 pnpm. 테스트 실행: `pnpm test <파일경로>` (= `vitest run`).

---

### Task 0: 스펙·이슈 문서 커밋

**Files:**
- 커밋만: `docs/superpowers/specs/2026-07-20-sermon-ux-worship-page-design.md`, `.issues/20260720_기능개선_설교_등록_UX_예배_페이지_개선.md`, `docs/superpowers/plans/2026-07-20-sermon-ux-worship-page.md` (이미 작성됨)

- [ ] **Step 1: Commit**

```bash
git add docs/superpowers/specs/2026-07-20-sermon-ux-worship-page-design.md .issues/20260720_기능개선_설교_등록_UX_예배_페이지_개선.md docs/superpowers/plans/2026-07-20-sermon-ux-worship-page.md
git commit -m "docs : 설교 등록 UX·예배 페이지 개선 스펙·계획 문서 #109"
```

---

### Task 1: `todayKstDate()` KST 오늘 날짜 헬퍼

**Files:**
- Modify: `src/lib/date.ts` (파일 끝에 추가)
- Test: `src/lib/date.test.ts`

**Interfaces:**
- Consumes: 없음 (기존 `KST = "Asia/Seoul"` 모듈 상수 재사용)
- Produces: `todayKstDate(): string` — `"YYYY-MM-DD"` (Task 2의 SermonForm defaultValues가 사용)

- [ ] **Step 1: Write the failing test**

`src/lib/date.test.ts` — import 줄을 다음으로 교체:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  parseServerDate,
  formatDate,
  formatEventTime,
  formatClockTime,
  todayKstDate,
} from "./date";
```

파일 끝에 추가:

```ts
describe("todayKstDate", () => {
  afterEach(() => vi.useRealTimers());

  it("KST 자정 직후에는 KST 기준 새 날짜를 반환한다(러너 TZ 무관)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T15:30:00Z")); // = 2026-07-20 00:30 KST
    expect(todayKstDate()).toBe("2026-07-20");
  });

  it("KST 자정 직전에는 전날을 반환한다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T14:59:00Z")); // = 2026-07-19 23:59 KST
    expect(todayKstDate()).toBe("2026-07-19");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/date.test.ts`
Expected: FAIL — `todayKstDate`가 export에 없음 (SyntaxError/undefined)

- [ ] **Step 3: Write minimal implementation**

`src/lib/date.ts` 파일 끝에 추가:

```ts
// date 입력 프리필용 오늘(KST). en-CA 로케일은 "YYYY-MM-DD"를 그대로 내 조립이 필요 없고,
// Asia/Seoul 고정이라 러너 TZ와 무관하게 KST 자정 기준으로 날짜가 바뀐다.
const kstDateInputFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: KST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 오늘 날짜(KST) "YYYY-MM-DD" — date 입력 기본값용. */
export function todayKstDate(): string {
  return kstDateInputFmt.format(new Date());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/date.test.ts`
Expected: PASS (기존 테스트 포함 전부)

- [ ] **Step 5: Commit**

```bash
git add src/lib/date.ts src/lib/date.test.ts
git commit -m "feat : todayKstDate KST 오늘 날짜 헬퍼 추가 #109"
```

---

### Task 2: 설교 폼 설교자·설교일 기본값 + 연도 4자리 제한

**Files:**
- Modify: `src/constants/church.ts` (CHURCH_EMAIL 아래)
- Modify: `src/components/sermons/SermonForm.tsx:60-71` (defaultValues), `:107-114` (date Input)
- Test: `src/components/sermons/SermonForm.test.tsx`

**Interfaces:**
- Consumes: `todayKstDate(): string` (Task 1, `@/lib/date`)
- Produces: `SERMON_DEFAULT_PREACHER: string` (`@/constants/church`)

- [ ] **Step 1: Write the failing tests**

`src/components/sermons/SermonForm.test.tsx` — import 블록에 추가(기존 `import { ApiError } ...` 아래):

```ts
import { SERMON_DEFAULT_PREACHER } from "@/constants/church";
import { todayKstDate } from "@/lib/date";
```

`renderForm` 헬퍼 아래에 수정 모드 시드 객체를 승격(기존 "수정 모드는 initial.version..." 테스트 내부의 `const initial = {...}`를 제거하고 이걸 사용):

```ts
// 수정 모드 시드 — 프리필 테스트와 version 테스트가 공유.
const EDIT_INITIAL = {
  id: 9, title: "원본", preacher: "김목사", series: null, scripture: null,
  content: "", videoUrl: null, audioUrl: null, preachedAt: "2026-06-01",
  viewCount: 0, createdAt: "2026-06-01T00:00:00", updatedAt: "2026-06-01T00:00:00",
  version: 4, tags: [], author: null,
};
```

기존 테스트의 `renderForm(<SermonForm mode="edit" initial={initial} />);`를
`renderForm(<SermonForm mode="edit" initial={EDIT_INITIAL} />);`로 변경.

describe 블록에 테스트 2개 추가:

```ts
  it("create 모드는 설교자·설교일이 미리 채워진다(교회 상수·오늘 KST)", () => {
    renderForm(<SermonForm mode="create" />);
    expect((screen.getByLabelText("설교자") as HTMLInputElement).value).toBe(
      SERMON_DEFAULT_PREACHER,
    );
    const date = screen.getByLabelText("설교일") as HTMLInputElement;
    expect(date.value).toBe(todayKstDate());
    // max가 연도 세그먼트를 4자리로 제한(6자리 연도 입력·자동 이동 안 됨 문제의 해결 장치)
    expect(date.getAttribute("max")).toBe("9999-12-31");
  });

  it("edit 모드는 프리필 대신 initial 값을 유지한다", () => {
    renderForm(<SermonForm mode="edit" initial={EDIT_INITIAL} />);
    expect((screen.getByLabelText("설교자") as HTMLInputElement).value).toBe("김목사");
    expect((screen.getByLabelText("설교일") as HTMLInputElement).value).toBe("2026-06-01");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/components/sermons/SermonForm.test.tsx`
Expected: FAIL — `SERMON_DEFAULT_PREACHER` export 없음(모듈 에러) 또는 create 프리필 assertion 실패. 기존 테스트는 통과 유지.

- [ ] **Step 3: Write minimal implementation**

`src/constants/church.ts` — `CHURCH_EMAIL` 아래에 추가:

```ts
// 설교 등록 폼의 설교자 기본값 — 설교자가 바뀌는 일이 드물어 미리 채운다(#109).
// 교회 교체 시 이 값만 바꾸면 되고, 빈 문자열이면 기본값 없음과 동일하게 동작한다.
export const SERMON_DEFAULT_PREACHER = "홍성균 목사";
```

`src/components/sermons/SermonForm.tsx` — import 추가:

```ts
import { SERMON_DEFAULT_PREACHER } from "@/constants/church";
import { todayKstDate } from "@/lib/date";
```

defaultValues 두 줄 변경:

```ts
      // 등록 모드 프리필: 설교자는 교회 상수, 설교일은 오늘(KST) — 수정 모드는 기존 값 유지.
      preacher: initial?.preacher ?? SERMON_DEFAULT_PREACHER,
      preachedAt: initial?.preachedAt ?? todayKstDate(),
```

설교일 Input에 `max` 추가:

```tsx
        <Input
          id="sermon-preachedAt"
          type="date"
          // max로 연도 세그먼트를 4자리로 제한 — 4자리 입력 시 월로 자동 이동(연도 6자리 입력 방지).
          max="9999-12-31"
          error={errors.preachedAt?.message}
          {...register("preachedAt")}
        />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/components/sermons/SermonForm.test.tsx`
Expected: PASS (6개 전부)

- [ ] **Step 5: Commit**

```bash
git add src/constants/church.ts src/components/sermons/SermonForm.tsx src/components/sermons/SermonForm.test.tsx
git commit -m "feat : 설교 등록 폼 설교자·설교일 기본값 및 연도 4자리 제한 #109"
```

---

### Task 3: `datetime-lg` 타이포 위계 등록

**Files:**
- Modify: `.claude/rules/DESIGN.md` (타이포 위계 표)
- Modify: `src/app/globals.css` (`@theme`의 `--text-datetime` 블록 아래)
- Modify: `src/constants/typography.ts` (`datetime` 줄 아래)
- Modify: `src/lib/utils.ts` (font-size classGroups 목록)
- Test: `src/lib/utils.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `typo.datetimeLg = "text-datetime-lg tabular-nums"` (Task 4의 WorshipRegular가 사용), CSS 토큰 `--text-datetime-lg`(22px/600/1.4)

- [ ] **Step 1: DESIGN.md 타이포 표에 행 추가**

`.claude/rules/DESIGN.md` 타이포 위계 표의 `{typography.datetime}` 행 바로 아래에:

```markdown
| `{typography.datetime-lg}` | 22px | 600 | 강조 날짜·시간 — 예배 카드 대표시간 (tnum) |
```

- [ ] **Step 2: globals.css `@theme`에 토큰 추가**

`src/app/globals.css` — `--text-datetime--font-weight: 500;` 줄 아래에:

```css
  --text-datetime-lg: 22px;           /* 강조 날짜·시간(예배 카드 대표시간) — tnum은 typo.datetimeLg가 부여 */
  --text-datetime-lg--line-height: 1.4;
  --text-datetime-lg--font-weight: 600;
```

- [ ] **Step 3: Write the failing test**

`src/lib/utils.test.ts` — 첫 it 블록의 datetime assertion 아래에 추가:

```ts
    // datetime-lg(예배 카드 대표시간)도 크기 그룹 등록 + tabular-nums 생존
    expect(cn(typo.datetimeLg, "text-ink")).toBe("text-datetime-lg tabular-nums text-ink");
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test src/lib/utils.test.ts`
Expected: FAIL — `typo.datetimeLg`가 아직 undefined라 `cn(undefined, "text-ink")` = `"text-ink"`로 assertion 실패

- [ ] **Step 5: Write minimal implementation**

`src/constants/typography.ts` — `datetime` 줄 아래에:

```ts
  datetimeLg: "text-datetime-lg tabular-nums", // 강조 날짜·시간(예배 카드 대표시간) — 크기만 키운 datetime
```

`src/lib/utils.ts` — font-size 목록의 `"datetime",` 아래에:

```ts
            "datetime-lg",
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test src/lib/utils.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add .claude/rules/DESIGN.md src/app/globals.css src/constants/typography.ts src/lib/utils.ts src/lib/utils.test.ts
git commit -m "feat : datetime-lg 타이포 위계 등록 #109"
```

---

### Task 4: 예배 카드 시간 강조 + 설교 진입 CTA

**Files:**
- Modify: `src/constants/content.ts` (`WORSHIP` 상수)
- Modify: `src/components/worship/WorshipRegular.tsx`
- Test: `src/components/worship/WorshipRegular.test.tsx`

**Interfaces:**
- Consumes: `typo.datetimeLg` (Task 3), `buttonVariants(variant): string` (`@/components/ui/Button`, 기존)
- Produces: `WORSHIP.sermonCta: string`

- [ ] **Step 1: Write the failing test**

`src/components/worship/WorshipRegular.test.tsx` — import에 `ReactNode` 타입과 `next/link` mock 추가(파일 상단, 기존 관례 그대로):

```tsx
import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";
import { WorshipRegular } from "./WorshipRegular";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
```

describe에 테스트 추가:

```tsx
  it("대표시간을 강조 위계(datetime-lg·ink)로 렌더하고 설교 진입 CTA를 둔다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<WorshipRegular />);

    const sunday = WORSHIP_SERVICES.find((s) => s.name === "주일예배")!;
    const time = screen.getByText(sunday.time);
    expect(time.className).toContain("text-datetime-lg");
    expect(time.className).toContain("text-ink");

    const cta = screen.getByRole("link", { name: WORSHIP.sermonCta });
    expect(cta.getAttribute("href")).toBe("/sermons");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/worship/WorshipRegular.test.tsx`
Expected: FAIL — 시간 클래스에 `text-datetime-lg` 없음 + `WORSHIP.sermonCta` CTA 링크 미존재

- [ ] **Step 3: Write minimal implementation**

`src/constants/content.ts` — `WORSHIP` 상수의 `regularLead` 줄 아래에:

```ts
  sermonCta: "설교 말씀 보기", // 정기예배 섹션 하단 → 설교 목록 진입 CTA(#109)
```

`src/components/worship/WorshipRegular.tsx` 전체를 다음으로 교체:

```tsx
import Link from "next/link";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";

// 흰 캔버스 — 정기 예배 2×2 카드(이름·대표시간·찬양시간·설명 3줄). 페이지 h1을 겸한다.
export function WorshipRegular() {
  return (
    <Container as="section" className="break-keep py-section">
      <Reveal>
        <h1 className={cn(typo.displayMd, "text-ink")}>{WORSHIP.title}</h1>
        <p className={cn(typo.bodyLg, "mt-base text-body")}>{WORSHIP.regularLead}</p>
      </Reveal>
      <ul className="mt-xxl grid gap-base sm:grid-cols-2">
        {WORSHIP_SERVICES.map((s, i) => (
          <li key={s.name}>
            <Reveal delay={i * 120} className="h-full">
              <Card surface="soft" className="h-full p-xl">
                <h3 className={cn(typo.titleMd, "text-ink")}>{s.name}</h3>
                {/* 대표시간이 카드의 핵심 정보 — 예배명에 묻히지 않게 강조 위계(고령 가독, #109). */}
                <p className={cn(typo.datetimeLg, "mt-xs text-ink")}>{s.time}</p>
                {s.praise ? (
                  <p className={cn(typo.datetime, "mt-xxs text-muted")}>{s.praise}</p>
                ) : null}
                <div className={cn(typo.bodyMd, "mt-base text-body")}>
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
      {/* 예배를 보다가 설교로 가는 진입점 — 회원전용 안내(MemberGate)는 /sermons가 담당. */}
      <Reveal className="mt-xl">
        <Link href="/sermons" className={buttonVariants("primary")}>
          {WORSHIP.sermonCta}
        </Link>
      </Reveal>
    </Container>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/worship/WorshipRegular.test.tsx`
Expected: PASS (기존 테스트 포함 2개)

- [ ] **Step 5: Commit**

```bash
git add src/constants/content.ts src/components/worship/WorshipRegular.tsx src/components/worship/WorshipRegular.test.tsx
git commit -m "feat : 예배 카드 시간 강조 및 설교 진입 CTA 추가 #109"
```

---

### Task 5: 최종 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 테스트**

Run: `pnpm test`
Expected: 전부 PASS

- [ ] **Step 2: 타입체크 (lint는 타입체크를 안 함)**

Run: `npx tsc --noEmit`
Expected: 에러 0

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: 에러 0

- [ ] **Step 4: 프로덕션 빌드**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 5: 수동 확인 (dev 서버 재시작 후)**

`pnpm dev` 재시작(globals.css `@theme` 변경 반영) 후:
1. `/mypage` 경유 설교 등록 화면: 설교자 "홍성균 목사"·설교일 오늘 날짜 프리필, 연도에 4자리 입력 시 월로 자동 이동 확인
2. `/worship`: 카드 시간이 22px/600 검정으로 강조, 하단 "설교 말씀 보기" 버튼이 `/sermons`로 이동 확인
