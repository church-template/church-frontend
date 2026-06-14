# 어드민 삭제 즉시 반영 + 다이얼로그 오버플로 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** 어드민 쓰기(생성·수정·삭제) 후 공개 ISR 페이지를 즉시 무효화해 화면에 바로 반영하고, 일정 폼 팝업이 화면을 넘쳐 저장 버튼이 잘리는 문제를 고친다.

**근본 원인(조사 확정):** 공개 목록 fetch가 Next `revalidate:60` ISR 캐시인데 백엔드 쓰기는 별도 API라 Next 데이터 캐시를 못 비운다. `router.refresh()`는 라우터 캐시만 비우고 데이터 캐시는 ≤60초 stale 유지 → 삭제/생성/수정이 늦게 반영. (백엔드는 정상.) + 공용 `DialogContent`에 높이 상한·스크롤이 없어 긴 폼이 잘림.

**핵심 API(이 Next 16에서 실측 확정):** `revalidateTag(tag)` 단일 인자는 **deprecated(TS 에러)**. 즉시 무효화(read-your-own-writes)는 **`updateTag(tag)`**(server action 전용·단일 인자·즉시) 사용. `fetch`에 `next.tags`를 먼저 부착해야 작동. server action은 client가 import해 `await` 호출(공식 지원).

**Tech Stack:** Next 16 App Router(server action·`next/cache` `updateTag`) · TanStack Query · vitest.

**공통 테스트 관례:** vitest `globals:false` 명시 import, jest-dom 없음(`getAttribute`/`toBeDefined`/`toBeNull`), `vi.mock`+`vi.hoisted`, `vi.stubGlobal("fetch", …)`, 쿼리 컴포넌트는 `QueryClientProvider(retry:false)`. Radix Dialog 열기는 트리거 click/제어 open.

**커밋:** `<type> : <desc> #37`. worktree `.worktrees/fix-revalidate`, 브랜치 `20260615_#37_삭제_즉시반영_다이얼로그_개선`.

**⚠️ 런타임 검증 한계:** 단위테스트는 server action을 mock하므로 **실제 캐시 즉시 반영은 단위테스트로 보장 못 함**. T8에서 `pnpm build` 통과까지 확인하고, 실제 동작은 `pnpm dev` 수동 확인이 필요(보고서에 명시).

---

## File Structure
- Modify `src/lib/api/events.ts`·`sermons.ts`·`notices.ts` — 공개 목록 fetch에 `next.tags` 추가
- Modify `src/lib/api/events.test.ts`·`sermons.test.ts`·`notices.test.ts` — fetch 단언 갱신
- Create `src/lib/admin/revalidate.ts`(+test) — `"use server"` `updateTag` 무효화 함수 3종
- Modify events: `EventFormDialog.tsx`·`EventAdminActions.tsx`·`EventDetailModal.tsx`(+tests) — revalidate 연결 + 모달 닫기
- Modify sermons: `SermonForm.tsx`·`SermonAdminActions.tsx`(+tests)
- Modify notices: `NoticeForm.tsx`·`NoticeAdminActions.tsx`(+tests)
- Modify `src/components/ui/dialog.tsx` — DialogContent 스크롤
- Modify `src/components/admin/MarkdownEditor.tsx`(+test)·`EventFormDialog.tsx` — rows prop

---

## Task 1: 공개 목록 fetch에 캐시 태그 부착

**Files:** Modify `src/lib/api/events.ts`·`sermons.ts`·`notices.ts`, `src/lib/api/{events,sermons,notices}.test.ts`

`updateTag(tag)`가 작동하려면 fetch에 같은 태그가 있어야 한다. 목록(ISR `revalidate:60`)에만 부착. 상세 `getSermon`/`getNotice`는 `no-store`라 무관, `getEvent`는 `revalidate:60`라 태그 부착.

- [ ] **Step 1: 테스트 단언 먼저 갱신(RED)**

`src/lib/api/events.test.ts`: `getEvents`·`getEvent` 단언의 두 번째 인자를 `{ next: { revalidate: 60, tags: ["events"] } }`로 변경.
`src/lib/api/sermons.test.ts`: `getSermons` 단언을 `{ next: { revalidate: 60, tags: ["sermons"] } }`로(`getSermon`은 `{ cache: "no-store" }` 유지).
`src/lib/api/notices.test.ts`: `getNotices` 단언을 `{ next: { revalidate: 60, tags: ["notices"] } }`로(`getNotice`는 `no-store` 유지).

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/lib/api/events.test.ts src/lib/api/sermons.test.ts src/lib/api/notices.test.ts` → FAIL(옵션 불일치).

- [ ] **Step 3: 구현** — 각 파일의 목록 fetch 옵션에 `tags` 추가:

```ts
// events.ts getEvents: fetch(apiUrl(...), { next: { revalidate: 60, tags: ["events"] } })
// events.ts getEvent:  fetch(apiUrl(...), { next: { revalidate: 60, tags: ["events"] } })
// sermons.ts getSermons: { next: { revalidate: 60, tags: ["sermons"] } }
// notices.ts getNotices: { next: { revalidate: 60, tags: ["notices"] } }
```

- [ ] **Step 4: 통과 확인** — Run: 위 3개 테스트 → PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api/events.ts src/lib/api/sermons.ts src/lib/api/notices.ts \
        src/lib/api/events.test.ts src/lib/api/sermons.test.ts src/lib/api/notices.test.ts
git commit -m "feat : 공개 목록 fetch에 캐시 태그(events·sermons·notices) #37"
```

---

## Task 2: revalidate 서버 액션 (updateTag)

**Files:** Create `src/lib/admin/revalidate.ts`, `src/lib/admin/revalidate.test.ts`

> 구현 전 `node_modules/next/dist/docs/`의 `updateTag`·`use-server` 문서를 확인할 것(이 Next는 breaking change 있음).

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/lib/admin/revalidate.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { updateTagMock } = vi.hoisted(() => ({ updateTagMock: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: updateTagMock }));

import { revalidateEvents, revalidateSermons, revalidateNotices } from "./revalidate";

afterEach(() => vi.clearAllMocks());

describe("어드민 캐시 무효화 서버 액션", () => {
  it("revalidateEvents는 events 태그를 즉시 무효화한다", async () => {
    await revalidateEvents();
    expect(updateTagMock).toHaveBeenCalledWith("events");
  });
  it("revalidateSermons는 sermons 태그를 무효화한다", async () => {
    await revalidateSermons();
    expect(updateTagMock).toHaveBeenCalledWith("sermons");
  });
  it("revalidateNotices는 notices 태그를 무효화한다", async () => {
    await revalidateNotices();
    expect(updateTagMock).toHaveBeenCalledWith("notices");
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/lib/admin/revalidate.test.ts` → FAIL(import 없음).

- [ ] **Step 3: 구현**

```ts
// src/lib/admin/revalidate.ts
"use server";

import { updateTag } from "next/cache";

// 어드민 쓰기(생성·수정·삭제) 성공 후 client onSuccess에서 await 호출 → 해당 도메인 공개 ISR 캐시를
// 즉시 무효화(read-your-own-writes). updateTag는 server action 전용·단일 인자·즉시(Next 16). 다음 요청이 fresh.
// (revalidateTag 단일 인자는 이 버전에서 deprecated/TS 에러라 updateTag 사용.)
export async function revalidateEvents() {
  updateTag("events");
}
export async function revalidateSermons() {
  updateTag("sermons");
}
export async function revalidateNotices() {
  updateTag("notices");
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm test src/lib/admin/revalidate.test.ts` → PASS(3). `npx tsc --noEmit` → 0(updateTag 시그니처 확인).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/admin/revalidate.ts src/lib/admin/revalidate.test.ts
git commit -m "feat : 어드민 캐시 즉시 무효화 서버 액션(updateTag) #37"
```

---

## Task 3: 일정 — revalidate 연결 + 모달 닫기

**Files:** Modify `src/components/events/EventFormDialog.tsx`·`EventAdminActions.tsx`·`EventDetailModal.tsx`, 각 `.test.tsx`

- [ ] **Step 1: 테스트 갱신(RED)**

`EventFormDialog.test.tsx`: `vi.hoisted`에 `revalidateEventsMock` 추가 + `vi.mock("@/lib/admin/revalidate", () => ({ revalidateEvents: revalidateEventsMock }))`. 등록 성공 테스트에 `await waitFor(() => expect(revalidateEventsMock).toHaveBeenCalled())` 추가.
`EventAdminActions.test.tsx`: 동일 mock 추가. 삭제 테스트에 `expect(revalidateEventsMock).toHaveBeenCalled()` + `onDeleted` 콜백 호출 검증(`<EventDetailActions event={event} onDeleted={onDeletedMock} />` 후 삭제 시 `onDeletedMock` 호출).

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/components/events/EventFormDialog.test.tsx src/components/events/EventAdminActions.test.tsx` → FAIL.

- [ ] **Step 3: 구현**

`EventFormDialog.tsx`: 상단 `import { revalidateEvents } from "@/lib/admin/revalidate";`. `SAVED_NOTICE`를 `"저장했습니다."`로 변경(지연 안내 제거). `onSuccess`를 async로:
```tsx
onSuccess: async () => {
  await revalidateEvents();
  notify.success(SAVED_NOTICE);
  router.refresh();
  onOpenChange(false);
},
```

`EventAdminActions.tsx`: `import { revalidateEvents } from "@/lib/admin/revalidate";`. `EventDetailActions` props에 `onDeleted?: () => void` 추가. 삭제 onSuccess:
```tsx
export function EventDetailActions({ event, onDeleted }: { event: EventDetailResponse; onDeleted?: () => void }) {
  ...
  const remove = useMutation({
    mutationFn: () => deleteEvent(event.id),
    onError: adminOnError(),
    onSuccess: async () => {
      await revalidateEvents();
      notify.success("삭제했습니다.");
      setDelOpen(false);
      onDeleted?.();
      router.refresh();
    },
  });
```

`EventDetailModal.tsx`: 모달 내 `<EventDetailActions event={shown} />`를 `<EventDetailActions event={shown} onDeleted={onClose} />`로(삭제 후 모달 닫기 — props 체인 EventCalendar onClose=setSelected(null)).

- [ ] **Step 4: 통과 확인** — Run: 위 테스트 + `pnpm test src/components/events` → PASS. `npx tsc --noEmit` → 0.

- [ ] **Step 5: 커밋**

```bash
git add src/components/events/EventFormDialog.tsx src/components/events/EventAdminActions.tsx \
        src/components/events/EventDetailModal.tsx src/components/events/EventFormDialog.test.tsx \
        src/components/events/EventAdminActions.test.tsx
git commit -m "feat : 일정 쓰기 후 캐시 즉시 무효화 + 삭제 시 모달 닫기 #37"
```

---

## Task 4: 설교 — revalidate 연결

**Files:** Modify `src/components/sermons/SermonForm.tsx`·`SermonAdminActions.tsx`, 각 `.test.tsx`

- [ ] **Step 1: 테스트 갱신(RED)** — 두 테스트에 `revalidateSermonsMock` `vi.hoisted` + `vi.mock("@/lib/admin/revalidate", () => ({ revalidateSermons: revalidateSermonsMock }))`. 등록/수정·삭제 성공에 `expect(revalidateSermonsMock).toHaveBeenCalled()` 추가.

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/components/sermons/SermonForm.test.tsx src/components/sermons/SermonAdminActions.test.tsx` → FAIL.

- [ ] **Step 3: 구현**

`SermonForm.tsx`: `import { revalidateSermons } from "@/lib/admin/revalidate";`. `SAVED_NOTICE`→`"저장했습니다."`. onSuccess async:
```tsx
onSuccess: async (res) => {
  await revalidateSermons();
  notify.success(SAVED_NOTICE);
  router.push(`/sermons/${res.id}`);
},
```
`SermonAdminActions.tsx`: `import { revalidateSermons }`. 삭제 onSuccess:
```tsx
onSuccess: async () => {
  await revalidateSermons();
  notify.success("삭제했습니다.");
  setOpen(false);
  router.push("/sermons");
},
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm test src/components/sermons` → PASS. `npx tsc --noEmit` → 0.

- [ ] **Step 5: 커밋**

```bash
git add src/components/sermons/SermonForm.tsx src/components/sermons/SermonAdminActions.tsx \
        src/components/sermons/SermonForm.test.tsx src/components/sermons/SermonAdminActions.test.tsx
git commit -m "feat : 설교 쓰기 후 캐시 즉시 무효화 #37"
```

---

## Task 5: 공지 — revalidate 연결

**Files:** Modify `src/components/notices/NoticeForm.tsx`·`NoticeAdminActions.tsx`, 각 `.test.tsx`

공지는 폼(create/update) + 인라인 삭제 + **고정 토글(PATCH)** 모두 공개 반영 대상.

- [ ] **Step 1: 테스트 갱신(RED)** — `revalidateNoticesMock` mock 추가. NoticeForm 등록/수정·NoticeAdminActions 삭제·**고정 토글** 성공에 `expect(revalidateNoticesMock).toHaveBeenCalled()` 추가.

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/components/notices/NoticeForm.test.tsx src/components/notices/NoticeAdminActions.test.tsx` → FAIL.

- [ ] **Step 3: 구현**

`NoticeForm.tsx`: `import { revalidateNotices }`. `SAVED_NOTICE`→`"저장했습니다."`. onSuccess async + `await revalidateNotices()` 후 push.
`NoticeAdminActions.tsx`: `import { revalidateNotices }`. `DELAY_NOTICE` 제거(삭제 토스트 `"삭제했습니다."`). 삭제 onSuccess·**고정 토글 pin onSuccess** 둘 다 async로 `await revalidateNotices()` 후 기존 처리(pin은 `router.refresh()`):
```tsx
const pin = useMutation({
  mutationFn: () => patchNotice(id, { version, isPinned: !isPinned }),
  onError: adminOnError({ onReedit: () => router.refresh() }),
  onSuccess: async () => { await revalidateNotices(); router.refresh(); },
});
const remove = useMutation({
  mutationFn: () => deleteNotice(id),
  onError: adminOnError(),
  onSuccess: async () => { await revalidateNotices(); notify.success("삭제했습니다."); setOpen(false); router.push("/notices"); },
});
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm test src/components/notices` → PASS. `npx tsc --noEmit` → 0.

- [ ] **Step 5: 커밋**

```bash
git add src/components/notices/NoticeForm.tsx src/components/notices/NoticeAdminActions.tsx \
        src/components/notices/NoticeForm.test.tsx src/components/notices/NoticeAdminActions.test.tsx
git commit -m "feat : 공지 쓰기·고정 토글 후 캐시 즉시 무효화 #37"
```

---

## Task 6: 공용 Dialog 스크롤 (오버플로 수정)

**Files:** Modify `src/components/ui/dialog.tsx`

`DialogContent`에 뷰포트 높이 상한·내부 스크롤 추가 → 긴 폼이 잘리지 않고 저장 버튼 항상 보임. `vh`는 색·간격 토큰이 아닌 레이아웃 값이라 인라인 허용 예외(`PhotoLightbox` `max-h-[70vh]`·`TermsDialog` `max-h-[60vh] overflow-y-auto` 선례). 공용 수정이라 모든 모달 동시 구제.

- [ ] **Step 1: 구현** — `DialogContent`의 `cn(` 첫 클래스 문자열(`"fixed left-1/2 top-1/2 z-overlay grid w-full max-w-[var(--container-modal)] -translate-x-1/2 -translate-y-1/2 gap-base"`)에 `max-h-[85vh] overflow-y-auto`를 추가한다.

- [ ] **Step 2: 회귀 확인** — Run: `pnpm test src/components/ui/dialog src/components/admin/DeleteConfirmDialog src/components/events/EventFormDialog src/components/auth` (Dialog 사용 모달 테스트) → 전부 PASS(스크롤 클래스는 동작 무관, 회귀 없음). `npx tsc --noEmit` → 0.

- [ ] **Step 3: 커밋**

```bash
git add src/components/ui/dialog.tsx
git commit -m "feat : 공용 Dialog 높이 상한·스크롤(긴 폼 저장버튼 잘림 수정) #37"
```

---

## Task 7: MarkdownEditor rows + 일정 폼 본문 축소

**Files:** Modify `src/components/admin/MarkdownEditor.tsx`(+test), `src/components/events/EventFormDialog.tsx`

- [ ] **Step 1: 실패 테스트 작성(RED)** — `MarkdownEditor.test.tsx`에 추가:

```tsx
it("rows를 Textarea에 전달한다", () => {
  const { container } = render(<MarkdownEditor value="" onChange={() => {}} rows={5} />);
  expect(container.querySelector("textarea")?.getAttribute("rows")).toBe("5");
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/components/admin/MarkdownEditor.test.tsx` → FAIL.

- [ ] **Step 3: 구현** — `MarkdownEditorProps`에 `rows?: number` 추가, `Textarea`에 `rows={rows}` 패스스루(미지정 시 Textarea 기본 12 유지). `EventFormDialog.tsx`의 본문 `<MarkdownEditor … />`에 `rows={5}` 추가.

- [ ] **Step 4: 통과 확인** — Run: `pnpm test src/components/admin/MarkdownEditor.test.tsx src/components/events/EventFormDialog.test.tsx` → PASS. `npx tsc --noEmit` → 0.

- [ ] **Step 5: 커밋**

```bash
git add src/components/admin/MarkdownEditor.tsx src/components/admin/MarkdownEditor.test.tsx \
        src/components/events/EventFormDialog.tsx
git commit -m "feat : MarkdownEditor rows prop + 일정 폼 본문 5행 #37"
```

---

## Task 8: 전체 검증

- [ ] **Step 1: 전체 테스트** — Run: `pnpm test` → 전부 PASS(03 기준 578 + 변경 반영).
- [ ] **Step 2: 타입·린트·빌드** — Run: `npx tsc --noEmit`(0) · `pnpm lint`(0 error) · `pnpm build`(성공, server action 포함 빌드 확인).
- [ ] **Step 3: 점검** — revalidate 6개 onSuccess 연결·모달 닫기·Dialog 스크롤·rows·"최대 1분" 토스트 제거 확인. hex/px 인라인 0(`max-h-[85vh]` 등 vh 레이아웃 예외 제외)·typo·삼항.
- [ ] **Step 4: 커밋(있으면)** — 잔여 정리만.

> **수동 검증 권장(단위테스트 한계)**: `pnpm dev`로 일정/설교/공지를 삭제·등록·수정해 공개 화면에 **즉시** 반영되는지, 일정 폼 팝업이 안 잘리는지 확인.

---

## 자기 검토 메모
- **스펙 커버리지**: 즉시 반영(태그=T1·서버액션=T2·연결=T3~T5)·모달 닫기(T3)·다이얼로그 오버플로(T6·T7).
- **타입 일관성**: `updateTag(tag)` 단일 인자(Next 16). server action 3종(events/sermons/notices). onSuccess는 async로 전환.
- **검증 필요(구현 시)**: `next/cache`의 `updateTag` 시그니처(docs 재확인), 각 컴포넌트 onSuccess의 정확한 현재 코드(파일 열어 확인), server action을 client에서 `await` 호출하는 빌드 통과.
