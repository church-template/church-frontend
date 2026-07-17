# TagMultiSelect 인라인 칩 토글 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 태그 선택 UI를 플로팅 Popover에서 인라인 칩 토글로 바꿔, 모달(일정·갤러리) 뒤에 드롭다운이 깔리는 문제를 없애고 4개 폼(설교·공지·일정·갤러리)의 UI를 통일한다.

**Architecture:** `src/components/admin/TagMultiSelect.tsx` 하나만 재작성한다(props `{ value: number[]; onChange }` 불변 — 소비처 4곳 무수정). Popover·트리거 버튼·하단 선택 Badge 목록을 제거하고, 태그 전체를 `aria-pressed` 버튼 칩으로 항상 펼쳐 렌더한다. 포탈이 없으므로 z-index 토큰은 변경하지 않는다.

**Tech Stack:** Next.js(App Router)·TypeScript·Tailwind v4 토큰·TanStack Query·vitest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-07-17-tag-multiselect-inline-chips-design.md`

## Global Constraints

- 답변·주석은 한국어, 주석은 WHY 중심으로 최소화
- hex·px 인라인 금지 — 토큰 유틸만 사용 (`bg-primary`·`bg-surface-strong`·`rounded-sm`·`gap-xs` 등)
- 텍스트 스타일은 `typo.*` 상수 (`src/constants/typography.ts`)
- 아이콘은 `lucide-react`만, 색은 `currentColor` 상속, 크기는 `size` prop
- JSX 조건부 렌더링은 삼항 (`{cond ? <X/> : null}`), `&&` 금지
- 불변 패턴 — 배열은 `filter`/spread로 새로 만든다 (기존 `toggle` 로직 유지)
- 테스트 관례: vitest 명시 import(globals 아님)·jest-dom 없음(`toBeDefined`/`getAttribute`)·`vi.hoisted`로 API mock
- `pnpm lint`는 타입체크를 하지 않는다 — `npx tsc --noEmit` 별도 실행
- **커밋은 사용자 명시 요청 시에만**, 마이크로 커밋 금지(기능 단위 1커밋), Co-Authored-By 금지, 메시지 끝에 이슈 태그(`#번호`) 필수

---

### Task 1: 테스트를 인라인 칩 동작 기준으로 갱신 (RED)

**Files:**
- Modify: `src/components/admin/TagMultiSelect.test.tsx` (전체 교체)

**Interfaces:**
- Consumes: `TagMultiSelect` props `{ value: number[]; onChange: (value: number[]) => void }` (불변)
- Produces: Task 2 구현이 통과시켜야 할 테스트 7개 — 칩은 `role="button"` + 접근 가능한 이름 = 태그명, 선택 상태는 `aria-pressed`

- [ ] **Step 1: 테스트 파일 전체를 아래 내용으로 교체**

기존 2개 테스트는 팝오버 전제("태그 선택" 버튼 클릭 후 목록 열림)라 폐기하고, 스펙의 테스트 계획 5항목을 7개 테스트로 작성한다.

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getTagsMock } = vi.hoisted(() => ({ getTagsMock: vi.fn() }));
vi.mock("@/lib/api/tags", () => ({ getTags: getTagsMock }));

import { TagMultiSelect } from "./TagMultiSelect";

afterEach(() => vi.clearAllMocks());

function renderWithQc(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("TagMultiSelect", () => {
  it("태그 목록이 열기 단계 없이 즉시 칩 버튼으로 렌더된다", async () => {
    getTagsMock.mockResolvedValue([
      { id: 1, name: "청년부" },
      { id: 2, name: "주일예배" },
    ]);
    renderWithQc(<TagMultiSelect value={[]} onChange={() => {}} />);
    expect(await screen.findByRole("button", { name: "청년부" })).toBeDefined();
    expect(screen.getByRole("button", { name: "주일예배" })).toBeDefined();
  });

  it("비선택 칩 클릭 시 onChange가 기존 배열에 id를 더해 호출된다", async () => {
    getTagsMock.mockResolvedValue([
      { id: 1, name: "청년부" },
      { id: 2, name: "주일예배" },
    ]);
    const onChange = vi.fn();
    renderWithQc(<TagMultiSelect value={[2]} onChange={onChange} />);
    fireEvent.click(await screen.findByRole("button", { name: "청년부" }));
    expect(onChange).toHaveBeenCalledWith([2, 1]);
  });

  it("선택된 칩 클릭 시 onChange가 해당 id를 뺀 배열로 호출된다", async () => {
    getTagsMock.mockResolvedValue([
      { id: 1, name: "청년부" },
      { id: 2, name: "주일예배" },
    ]);
    const onChange = vi.fn();
    renderWithQc(<TagMultiSelect value={[1, 2]} onChange={onChange} />);
    fireEvent.click(await screen.findByRole("button", { name: "청년부" }));
    expect(onChange).toHaveBeenCalledWith([2]);
  });

  it("선택 여부가 aria-pressed로 반영된다", async () => {
    getTagsMock.mockResolvedValue([
      { id: 1, name: "청년부" },
      { id: 2, name: "주일예배" },
    ]);
    renderWithQc(<TagMultiSelect value={[1]} onChange={() => {}} />);
    const selected = await screen.findByRole("button", { name: "청년부" });
    expect(selected.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByRole("button", { name: "주일예배" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("로딩 중 문구를 보여준다", () => {
    getTagsMock.mockReturnValue(new Promise(() => {}));
    renderWithQc(<TagMultiSelect value={[]} onChange={() => {}} />);
    expect(screen.getByText("불러오는 중…")).toBeDefined();
  });

  it("에러 시 실패 문구를 보여준다", async () => {
    getTagsMock.mockRejectedValue(new Error("network"));
    renderWithQc(<TagMultiSelect value={[]} onChange={() => {}} />);
    expect(await screen.findByText("태그를 불러오지 못했습니다.")).toBeDefined();
  });

  it("태그가 없으면 안내 문구를 보여준다", async () => {
    getTagsMock.mockResolvedValue([]);
    renderWithQc(<TagMultiSelect value={[]} onChange={() => {}} />);
    expect(await screen.findByText("등록된 태그가 없습니다.")).toBeDefined();
  });
});
```

주의: 선택 칩에는 lucide `Check`(aria-hidden)가 들어가지만 접근 가능한 이름은 태그명 그대로다 — `findByRole("button", { name: "청년부" })`가 그대로 성립해야 한다.

- [ ] **Step 2: 테스트 실행으로 RED 확인**

Run: `pnpm test TagMultiSelect`
Expected: **FAIL** — 현재 구현은 "태그 선택" 트리거 버튼 + Popover라 태그명 `role="button"`이 없다. 첫 테스트부터 `Unable to find an accessible element with the role "button" and name "청년부"` 계열 실패. (7개 중 로딩·에러·빈 목록 3개는 현재 구현도 통과할 수 있다 — 나머지 4개가 실패하는지만 확인하면 된다.)

### Task 2: TagMultiSelect 인라인 칩 구현 (GREEN)

**Files:**
- Modify: `src/components/admin/TagMultiSelect.tsx` (전체 교체)

**Interfaces:**
- Consumes: `getTags` (`@/lib/api/tags`, 반환 `{ id: number; name: string }[]`), `cn`, `typo`, lucide `Check`
- Produces: `TagMultiSelect({ value, onChange })` — 기존과 동일한 export·props. 소비처 4곳(`SermonForm.tsx:140`·`NoticeForm.tsx:123`·`EventFormDialog.tsx:191`·`AlbumFormDialog.tsx:87`)은 수정하지 않는다.

- [ ] **Step 1: 컴포넌트 전체를 아래 내용으로 교체**

Popover·Checkbox·Badge·Button import를 모두 제거한다(이 변경으로 고아가 되는 import 정리). 상태 처리 문구·`toggle` 불변 로직은 기존 그대로 유지.

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { getTags } from "@/lib/api/tags";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface TagMultiSelectProps {
  value: number[];
  onChange: (value: number[]) => void;
}

// 기존 태그 선택 전용(신규 생성=06 TAG_MANAGE 소관). 옵션은 공개 getTags.
// 인라인 칩 토글 — 플로팅(Popover)이면 모달(z-overlay 50) 뒤에 깔려 조작 불가라 포탈 자체를 쓰지 않는다.
export function TagMultiSelect({ value, onChange }: TagMultiSelectProps) {
  const { data: tags = [], isPending, isError } = useQuery({ queryKey: ["tags"], queryFn: getTags });
  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }
  if (isError) {
    return <p className={cn(typo.bodySm, "text-error")}>태그를 불러오지 못했습니다.</p>;
  }
  if (isPending) {
    return <p className={cn(typo.bodySm, "text-muted")}>불러오는 중…</p>;
  }
  if (tags.length === 0) {
    return <p className={cn(typo.bodySm, "text-muted")}>등록된 태그가 없습니다.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-xs">
      {tags.map((t) => {
        const selected = value.includes(t.id);
        return (
          <li key={t.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(t.id)}
              className={cn(
                typo.bodySm,
                "inline-flex items-center gap-xxs rounded-sm px-sm py-xs whitespace-nowrap",
                "transition duration-150 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                selected ? "bg-primary text-on-primary" : "bg-surface-strong text-ink",
              )}
            >
              {selected ? <Check size={16} aria-hidden /> : null}
              {t.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

토큰 근거: 칩 모양 `rounded-sm`(8px, DESIGN Shapes 배지 규칙)·`typo.bodySm`(18px), 패딩 `px-sm py-xs`(12/8px 스페이싱 토큰), 선택 `bg-primary text-on-primary`(Button primary와 동일 조합), 비선택 `bg-surface-strong text-ink`(Badge default와 동일 조합), 포커스 링은 dialog 닫기 버튼과 동일 관례. `type="button"` 필수 — RHF 폼 안이라 없으면 submit 된다.

- [ ] **Step 2: 테스트 실행으로 GREEN 확인**

Run: `pnpm test TagMultiSelect`
Expected: **PASS** — 7개 전부 통과

- [ ] **Step 3: 타입·린트 확인**

Run: `npx tsc --noEmit && pnpm lint`
Expected: 둘 다 에러 0 (lint는 타입체크를 안 하므로 tsc 별도 필수)

### Task 3: DESIGN.md 갱신·전체 검증·커밋(사용자 게이트)

**Files:**
- Modify: `.claude/rules/DESIGN.md` (어드민 공용 구획의 `tag-multiselect` 한 줄)

**Interfaces:**
- Consumes: Task 2 완료 상태 (구현·테스트 GREEN)
- Produces: 문서-구현 일치, 전체 테스트 통과 확인, 커밋 1건(사용자 승인 후)

- [ ] **Step 1: DESIGN.md `tag-multiselect` 항목 교체**

기존:

```markdown
- **`tag-multiselect`**: 기존 태그 다중선택. `Popover` + `Checkbox` 목록 + 선택 `Badge` 칩. 옵션은 `getTags`. 신규 생성 없음(06 소관).
```

교체:

```markdown
- **`tag-multiselect`**: 기존 태그 다중선택. 인라인 칩 토글 — 태그 전체를 폼 안에 항상 펼쳐 렌더(`aria-pressed` 버튼), 선택=primary 채움+lucide `Check`, 비선택=surface-strong. 플로팅(Popover) 미사용 — 모달(Dialog) 안에서도 레이어 문제 없음. 옵션은 `getTags`. 신규 생성 없음(06 소관).
```

(어드민 공용 구획의 다른 라인은 건드리지 않는다 — 병렬 머지 충돌 규칙.)

- [ ] **Step 2: 전체 테스트로 회귀 확인**

Run: `pnpm test`
Expected: 전체 통과 — 특히 `SermonForm`·`NoticeForm`·`EventFormDialog`·`AlbumFormDialog` 테스트가 있다면 그대로 통과해야 한다(props 불변이므로 실패 시 구현 오류).

- [ ] **Step 3: 수동 확인 (모달 재현 경로)**

Run: `pnpm dev` 후 브라우저에서
1. 갤러리 앨범 등록(모달)·일정 등록(모달)에서 태그 칩이 모달 안에 보이고 토글되는지
2. 설교/공지 등록 페이지에서 동일한 칩 UI인지
3. 모바일 폭(<640px)에서 칩이 줄바꿈(flex-wrap)으로 자연스럽게 흐르는지
Expected: 세 경우 모두 동일한 인라인 칩, 가림·잘림 없음

- [ ] **Step 4: 커밋 — 사용자 승인 게이트**

프로젝트 규칙상 커밋은 사용자 명시 요청 시에만. 사용자에게 이슈 번호를 확인한 뒤 **1커밋**으로 묶는다(스펙·플랜 문서 포함):

```bash
git add src/components/admin/TagMultiSelect.tsx src/components/admin/TagMultiSelect.test.tsx .claude/rules/DESIGN.md docs/superpowers/specs/2026-07-17-tag-multiselect-inline-chips-design.md docs/superpowers/plans/2026-07-17-tag-multiselect-inline-chips.md
git commit -m "fix : 태그 선택 UI 인라인 칩 토글로 통일 (모달 뒤 드롭다운 가림 수정) #<이슈번호>"
```

Co-Authored-By 금지. push는 별도 요청 시에만.
