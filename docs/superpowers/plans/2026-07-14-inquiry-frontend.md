# 문의(Inquiry) 프론트 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 방문자가 `/about/location`에서 문의를 남기고, `INQUIRY_MANAGE` 보유자가 `/mypage/manage/inquiries`에서 그 문의를 읽고 완료 처리·삭제한다.

**Architecture:** 공개 등록은 비인증 POST라 `authFetch`를 타지 않는 얇은 `fetch + parseJson` 함수 하나로 처리한다. 어드민은 기존 `members.admin.ts` / `TagManager` 패턴을 그대로 복제한다(읽기 `authFetch`+`parseJson`, 쓰기 `apiMutate`, 목록 `DataTable`+`Pagination`, 처리 `Dialog`). 새 인프라·새 라이브러리 0.

**Tech Stack:** Next.js(App Router) · TypeScript · TanStack Query · react-hook-form + zod(v4) · Tailwind(토큰) · vitest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-07-14-inquiry-frontend-design.md`
**Branch:** `20260714_#90_문의_접수_폼_및_문의_관리_화면_연동` (이미 생성됨)

## Global Constraints

- **커밋 메시지 형식**: `<type> : <설명> #90` — 이슈 태그 `#90` 필수. Co-Authored-By 태그 금지.
- **답변·주석·UI 문구는 한국어.** 주석은 WHY 중심, 주변 코드 스타일에 맞춰 과하지 않게.
- **텍스트 스타일은 `typo.*` 상수**(`src/constants/typography.ts`) — 컴포넌트에 폰트 크기/굵기 직접 작성 금지.
- **hex·px 인라인 금지** — 색·간격은 Tailwind 토큰 유틸(`text-ink`·`bg-surface-soft`·`gap-sm`·`py-section` 등).
- **UI 이모지 금지 · 아이콘은 `lucide-react`만**, 색 `currentColor`, 크기는 `size` prop.
- **JSX 조건부 렌더링은 삼항** — `{cond && <X/>}` 금지, `{cond ? <X/> : null}`.
- **에러 분기는 `errorCode`로만** (status/title 기준 금지).
- **테스트 관례**: vitest `globals: false` — `describe`/`it`/`expect`/`vi`를 `vitest`에서 명시 import. jest-dom 없음 → `toBeDefined()`·`getAttribute()`로 단언. `vi.hoisted` + `vi.mock`으로 모듈 모킹.
- **`useEffect` 안에서 `setState` 금지**(eslint 에러) — 쿼리 파생값을 쓴다. effect는 `notify` 호출 등 부수효과만.
- **검증 명령**: `pnpm lint` · `npx tsc --noEmit` · `pnpm test` (lint는 타입체크를 하지 않으므로 tsc 별도 실행 필수).

---

### Task 1: 공개 문의 등록 API

**Files:**
- Create: `src/lib/api/inquiries.ts`
- Test: `src/lib/api/inquiries.test.ts`

**Interfaces:**
- Consumes: `apiUrl` (`@/lib/auth/apiBase`), `parseJson` (`@/lib/auth/apiError`)
- Produces:
  - `interface InquiryCreateRequest { name: string; phone: string; email?: string; content: string; privacyAgreed: boolean }`
  - `interface InquiryCreatedResponse { id: number }`
  - `function createInquiry(body: InquiryCreateRequest): Promise<InquiryCreatedResponse>`

`apiMutate`는 `authFetch`(401 refresh·토큰 큐잉) 위에 있어 **비회원 제출에 쓸 수 없다.** 공개 GET들이 쓰는 `apiUrl` + 에러 변환기 `parseJson`만 조합한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/api/inquiries.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { createInquiry } from "./inquiries";
import { ApiError } from "@/lib/auth/apiError";

afterEach(() => vi.restoreAllMocks());

const body = {
  name: "홍길동",
  phone: "010-1234-5678",
  email: "a@b.com",
  content: "예배 시간이 궁금합니다.",
  privacyAgreed: true,
};

describe("createInquiry", () => {
  it("POST /api/inquiries 로 본문을 JSON 전송하고 접수번호를 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 12 }), { status: 201, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await createInquiry(body);

    expect(res).toEqual({ id: 12 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url).endsWith("/api/inquiries")).toBe(true);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual(body);
  });

  it("비-2xx는 ApiError로 변환하고 errorCode를 보존한다(429 과다 제출)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ errorCode: "RATE_LIMIT_EXCEEDED", title: "요청이 너무 많습니다" }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(createInquiry(body)).rejects.toBeInstanceOf(ApiError);
    await expect(createInquiry(body)).rejects.toMatchObject({ status: 429, errorCode: "RATE_LIMIT_EXCEEDED" });
  });

  it("인증 헤더를 붙이지 않는다(비회원 제출)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 201, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createInquiry(body);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.credentials).toBeUndefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/lib/api/inquiries.test.ts`
Expected: FAIL — `Failed to resolve import "./inquiries"`

- [ ] **Step 3: 최소 구현**

`src/lib/api/inquiries.ts`:

```ts
// 공개 문의 등록(비인증). authFetch(401 refresh·토큰 큐잉) 체인을 타면 안 되므로 apiMutate를 쓰지 않는다
// — 방문자는 토큰이 없다. 에러 변환(parseJson)만 공유해 errorCode 분기(가이드 4장)에 그대로 얹힌다.
import { apiUrl } from "@/lib/auth/apiBase";
import { parseJson } from "@/lib/auth/apiError";

export interface InquiryCreateRequest {
  name: string; // ≤50
  phone: string; // ≤20
  email?: string; // 선택, ≤100
  content: string; // 10~2000
  privacyAgreed: boolean; // 필수 true
}
// 개인정보는 되돌려주지 않는다 — 접수번호만.
export interface InquiryCreatedResponse {
  id: number;
}

export function createInquiry(body: InquiryCreateRequest): Promise<InquiryCreatedResponse> {
  return fetch(apiUrl("/api/inquiries"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => parseJson<InquiryCreatedResponse>(res));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/lib/api/inquiries.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api/inquiries.ts src/lib/api/inquiries.test.ts
git commit -m "feat : 공개 문의 등록 API 연동 추가 #90"
```

---

### Task 2: 어드민 문의 API

**Files:**
- Create: `src/lib/api/inquiries.admin.ts`
- Test: `src/lib/api/inquiries.admin.test.ts`

**Interfaces:**
- Consumes: `authFetch` (`@/lib/auth/authFetch`), `parseJson` (`@/lib/auth/apiError`), `apiMutate` (`@/lib/admin/apiMutate`), `Page` (`@/lib/page`)
- Produces:
  - `interface InquiryCardResponse { id: number; name: string; phone: string; email: string; completed: boolean; completedAt: string | null; createdAt: string }`
  - `interface InquiryDetailResponse extends InquiryCardResponse { content: string }`
  - `interface InquiryListParams { completed?: boolean; page?: number; size?: number }`
  - `function listInquiries(p: InquiryListParams): Promise<Page<InquiryCardResponse>>`
  - `function getInquiry(id: number): Promise<InquiryDetailResponse>`
  - `function completeInquiry(id: number, completed: boolean): Promise<InquiryDetailResponse>`
  - `function deleteInquiry(id: number): Promise<void>`

`members.admin.ts` 동형: 읽기는 `authFetch`+`parseJson`, 쓰기는 `apiMutate`. **client 컴포넌트 전용**(authFetch/authStore 체인이 서버 번들에 들어가면 빌드 오류).

`sort`는 보내지 않는다 — 백엔드 기본이 `createdAt,desc`(최신순). `completed` 미지정 = 전체.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/api/inquiries.admin.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { authFetchMock, apiMutateMock } = vi.hoisted(() => ({ authFetchMock: vi.fn(), apiMutateMock: vi.fn() }));
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { listInquiries, getInquiry, completeInquiry, deleteInquiry } from "./inquiries.admin";

afterEach(() => vi.clearAllMocks());

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

const card = {
  id: 1,
  name: "홍길동",
  phone: "010-1234-5678",
  email: "a@b.com",
  completed: false,
  completedAt: null,
  createdAt: "2026-07-14T10:00:00",
};

describe("문의 어드민 API", () => {
  it("listInquiries는 completed 미지정 시 쿼리에서 생략한다", async () => {
    authFetchMock.mockResolvedValue(ok({ content: [card], page: { size: 10, number: 0, totalElements: 1, totalPages: 1 } }));
    const res = await listInquiries({ page: 0, size: 10 });
    expect(res.content[0].name).toBe("홍길동");
    const [url] = authFetchMock.mock.calls[0];
    expect(String(url).endsWith("/api/admin/inquiries?page=0&size=10")).toBe(true);
  });

  it("listInquiries는 completed=false를 쿼리에 반영한다(미처리만)", async () => {
    authFetchMock.mockResolvedValue(ok({ content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } }));
    await listInquiries({ completed: false, page: 0, size: 10 });
    const [url] = authFetchMock.mock.calls[0];
    expect(String(url).endsWith("/api/admin/inquiries?completed=false&page=0&size=10")).toBe(true);
  });

  it("listInquiries는 completed=true를 쿼리에 반영한다(완료만)", async () => {
    authFetchMock.mockResolvedValue(ok({ content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } }));
    await listInquiries({ completed: true, page: 1, size: 10 });
    const [url] = authFetchMock.mock.calls[0];
    expect(String(url).endsWith("/api/admin/inquiries?completed=true&page=1&size=10")).toBe(true);
  });

  it("getInquiry는 상세를 조회한다(content 포함)", async () => {
    authFetchMock.mockResolvedValue(ok({ ...card, content: "문의 내용입니다." }));
    const res = await getInquiry(1);
    expect(res.content).toBe("문의 내용입니다.");
    const [url] = authFetchMock.mock.calls[0];
    expect(String(url).endsWith("/api/admin/inquiries/1")).toBe(true);
  });

  it("completeInquiry는 PATCH로 completed를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ ...card, content: "x", completed: true, completedAt: "2026-07-14T11:00:00" });
    await completeInquiry(1, true);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/inquiries/1/complete", {
      method: "PATCH",
      body: { completed: true },
    });
  });

  it("completeInquiry는 완료 취소(false)도 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ ...card, content: "x" });
    await completeInquiry(2, false);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/inquiries/2/complete", {
      method: "PATCH",
      body: { completed: false },
    });
  });

  it("deleteInquiry는 DELETE를 호출한다", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteInquiry(3);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/inquiries/3", { method: "DELETE" });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/lib/api/inquiries.admin.test.ts`
Expected: FAIL — `Failed to resolve import "./inquiries.admin"`

- [ ] **Step 3: 최소 구현**

`src/lib/api/inquiries.admin.ts`:

```ts
// 어드민 문의 관리 API. client 컴포넌트 전용(authFetch/apiMutate 체인 → RSC 번들 금지).
// 정렬은 백엔드 기본(createdAt,desc)에 맡긴다 — sort를 보내지 않는다.
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import { apiMutate } from "@/lib/admin/apiMutate";
import type { Page } from "@/lib/page";

// 목록 카드 — 문의 내용(content)은 없다. 내용을 읽으려면 상세를 연다.
export interface InquiryCardResponse {
  id: number;
  name: string;
  phone: string;
  email: string;
  completed: boolean;
  completedAt: string | null; // @JsonInclude(NON_NULL) — 미완료 시 누락 가능
  createdAt: string;
}
export interface InquiryDetailResponse extends InquiryCardResponse {
  content: string;
}
export interface InquiryListParams {
  completed?: boolean; // 미지정=전체, false=미처리, true=완료
  page?: number;
  size?: number;
}

function buildInquiryQuery(p: InquiryListParams): string {
  const sp = new URLSearchParams();
  if (p.completed != null) sp.set("completed", String(p.completed));
  if (p.page != null) sp.set("page", String(p.page));
  if (p.size != null) sp.set("size", String(p.size));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// authFetch는 path를 그대로 받는다(내부에서 apiUrl 적용) — members.admin.ts와 동일.
export async function listInquiries(p: InquiryListParams): Promise<Page<InquiryCardResponse>> {
  const res = await authFetch(`/api/admin/inquiries${buildInquiryQuery(p)}`);
  return parseJson<Page<InquiryCardResponse>>(res);
}

export async function getInquiry(id: number): Promise<InquiryDetailResponse> {
  const res = await authFetch(`/api/admin/inquiries/${id}`);
  return parseJson<InquiryDetailResponse>(res);
}

export function completeInquiry(id: number, completed: boolean): Promise<InquiryDetailResponse> {
  return apiMutate<InquiryDetailResponse>(`/api/admin/inquiries/${id}/complete`, {
    method: "PATCH",
    body: { completed },
  });
}

export function deleteInquiry(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/inquiries/${id}`, { method: "DELETE" });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/lib/api/inquiries.admin.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api/inquiries.admin.ts src/lib/api/inquiries.admin.test.ts
git commit -m "feat : 어드민 문의 목록·상세·완료·삭제 API 연동 추가 #90"
```

---

### Task 3: 권한 라벨 · 관리 허브 카드 · 과다 제출(429) 문구

**Files:**
- Modify: `src/constants/permissions.ts`
- Modify: `src/lib/admin/manageDomains.ts`
- Modify: `src/lib/auth/handleApiError.ts`
- Test: `src/lib/auth/handleApiError.test.ts` (기존 파일에 케이스 추가)

**Interfaces:**
- Produces: `MANAGE_DOMAINS`에 `{ key: "inquiries", ... }` 항목, `MANAGE_CATEGORIES`에 `inbox` 카테고리, `ManageCategory` 유니온에 `"inbox"` 추가. `handleApiError`가 `RATE_LIMIT_EXCEEDED`를 전용 문구로 토스트.

**`inbox` 카테고리를 새로 만드는 이유**: 기존 4개(콘텐츠·미디어·조직·회원권한)는 전부 "교회가 **내보내는** 것"이다. 문의는 "**들어오는** 것"이라 어디에 끼워도 의미가 어긋난다. 관리자가 가장 자주 확인할 항목이라 허브 맨 위에 둔다. 카드가 1개인 카테고리는 기존 `ManageHub` 로직이 이미 허용한다(보유 권한 0이면 제목째 숨김).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/auth/handleApiError.test.ts` 파일 끝의 `describe` 블록 안에 케이스를 추가한다(파일 상단의 기존 import·mock 재사용):

```ts
  it("RATE_LIMIT_EXCEEDED는 과다 제출 안내를 토스트한다", () => {
    handleApiError(
      new ApiError(429, "RATE_LIMIT_EXCEEDED", undefined, "Too Many Requests"),
      {},
    );
    expect(errorMock).toHaveBeenCalledWith(
      "문의가 너무 많이 접수되었습니다. 잠시 후 다시 시도해 주세요.",
    );
  });
```

> 기존 테스트의 토스트 mock 변수명이 `errorMock`이 아닐 수 있다. 파일 상단을 읽어 **그 파일이 이미 쓰는 mock 이름과 `ApiError` 생성자 인자 순서**를 그대로 따른다(`ApiError(status, errorCode, detail, title, instance, errors, references)`).

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/lib/auth/handleApiError.test.ts`
Expected: FAIL — default 분기가 타서 `"Too Many Requests"`가 토스트됨(기대 문구와 불일치)

- [ ] **Step 3: 구현 — 429 분기 추가**

`src/lib/auth/handleApiError.ts`의 `switch` 안, `FILE_SIZE_EXCEEDED` case 아래에 추가:

```ts
    case "RATE_LIMIT_EXCEEDED":
      // 문의 등록 IP 제한(1시간 5건). 재시도 시점을 알려줘야 방문자가 막힌 줄 알고 이탈하지 않는다.
      notify.error("문의가 너무 많이 접수되었습니다. 잠시 후 다시 시도해 주세요.");
      break;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/lib/auth/handleApiError.test.ts`
Expected: PASS

- [ ] **Step 5: 권한 라벨 추가**

`src/constants/permissions.ts`의 `PERMISSION_LABELS`에 한 줄 추가(기존 항목 사이, `MEMBER_MANAGE` 위):

```ts
  INQUIRY_MANAGE: "문의 관리",
```

- [ ] **Step 6: 관리 허브 카드·카테고리 추가**

`src/lib/admin/manageDomains.ts` 세 곳을 수정한다.

1) 타입 유니온:

```ts
export type ManageCategory = "inbox" | "content" | "media" | "org" | "governance";
```

2) `MANAGE_CATEGORIES` 배열 **맨 앞**에:

```ts
  { key: "inbox", label: "문의" }, // 교회가 '받는' 것 — 나머지 카테고리는 전부 '내보내는' 것이라 분리
```

3) `MANAGE_DOMAINS` 배열 **맨 앞**에:

```ts
  { key: "inquiries", label: "문의 관리", permission: "INQUIRY_MANAGE", href: "/mypage/manage/inquiries", kind: "manage", category: "inbox" },
```

- [ ] **Step 7: 전체 테스트·타입 검증**

Run: `pnpm test src/components/mypage/ManageHub.test.tsx && npx tsc --noEmit`
Expected: PASS / 타입 에러 없음. (`ManageHub.test.tsx`가 카테고리 개수·순서를 단언한다면 그 단언을 새 카테고리에 맞게 갱신한다 — 기존 도메인 카드의 라벨·순서는 건드리지 않는다.)

- [ ] **Step 8: 커밋**

```bash
git add src/constants/permissions.ts src/lib/admin/manageDomains.ts src/lib/auth/handleApiError.ts src/lib/auth/handleApiError.test.ts src/components/mypage/ManageHub.test.tsx
git commit -m "feat : 문의 관리 권한 라벨·관리 허브 카드 및 과다 제출 안내 추가 #90"
```

---

### Task 4: 공개 문의 폼 — `InquirySection`

**Files:**
- Create: `src/components/about/inquirySchema.ts`
- Create: `src/components/about/InquirySection.tsx`
- Test: `src/components/about/InquirySection.test.tsx`
- Modify: `src/app/(site)/about/location/page.tsx`

**Interfaces:**
- Consumes: `createInquiry`, `InquiryCreateRequest` (Task 1) · `Input`·`Textarea`·`Checkbox`·`Button` (`@/components/ui/*`) · `TermsDialog` (`@/components/auth/TermsDialog`) · `formatPhone` (`@/components/auth/formatPhone`) · `PRIVACY_POLICY` (`@/constants/terms`) · `Container` (`@/components/shell/Container`) · `Reveal` (`@/components/main/Reveal`) · `handleApiError`·`ApiError` (`@/lib/auth/*`) · `phoneSchema` (`@/components/auth/schemas`)
- Produces: `export function InquirySection()` — `/about/location` 세 번째 섹션

`SignupForm`의 RHF + zod + `TermsDialog` 조합을 그대로 따른다. **성공은 폼 자리를 접수 완료 패널로 교체한다** — 토스트만 띄우면 고령 사용자가 놓친다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/about/InquirySection.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { createMock, notifyError } = vi.hoisted(() => ({ createMock: vi.fn(), notifyError: vi.fn() }));
vi.mock("@/lib/api/inquiries", () => ({ createInquiry: createMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: notifyError } }));

import { InquirySection } from "./InquirySection";

afterEach(() => vi.clearAllMocks());

// 유효한 폼을 채운다(이메일은 선택이라 생략 가능).
function fillValidForm() {
  fireEvent.change(screen.getByLabelText("이름"), { target: { value: "홍길동" } });
  fireEvent.change(screen.getByLabelText("연락처"), { target: { value: "01012345678" } });
  fireEvent.change(screen.getByLabelText("문의 내용"), { target: { value: "예배 시간이 궁금합니다." } });
  fireEvent.click(screen.getByLabelText("개인정보 수집·이용 동의 (필수)"));
}

describe("InquirySection", () => {
  it("연락처 입력은 자동 하이픈으로 표시된다", () => {
    render(<InquirySection />);
    const phone = screen.getByLabelText("연락처") as HTMLInputElement;
    fireEvent.change(phone, { target: { value: "01012345678" } });
    expect(phone.value).toBe("010-1234-5678");
  });

  it("문의 내용이 10자 미만이면 제출을 막고 안내한다", async () => {
    render(<InquirySection />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "홍길동" } });
    fireEvent.change(screen.getByLabelText("연락처"), { target: { value: "01012345678" } });
    fireEvent.change(screen.getByLabelText("문의 내용"), { target: { value: "짧아요" } });
    fireEvent.click(screen.getByLabelText("개인정보 수집·이용 동의 (필수)"));
    fireEvent.click(screen.getByRole("button", { name: "문의 남기기" }));

    await waitFor(() => expect(screen.getByText("문의 내용을 10자 이상 입력해 주세요.")).toBeDefined());
    expect(createMock).not.toHaveBeenCalled();
  });

  it("개인정보 미동의면 제출을 막는다", async () => {
    render(<InquirySection />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "홍길동" } });
    fireEvent.change(screen.getByLabelText("연락처"), { target: { value: "01012345678" } });
    fireEvent.change(screen.getByLabelText("문의 내용"), { target: { value: "예배 시간이 궁금합니다." } });
    fireEvent.click(screen.getByRole("button", { name: "문의 남기기" }));

    await waitFor(() => expect(screen.getByText("개인정보 수집·이용에 동의해 주세요.")).toBeDefined());
    expect(createMock).not.toHaveBeenCalled();
  });

  it("제출 성공 시 createInquiry를 호출하고 접수번호 패널로 바뀐다", async () => {
    createMock.mockResolvedValue({ id: 12 });
    render(<InquirySection />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "문의 남기기" }));

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({
        name: "홍길동",
        phone: "010-1234-5678",
        email: undefined,
        content: "예배 시간이 궁금합니다.",
        privacyAgreed: true,
      }),
    );
    await waitFor(() => expect(screen.getByText("문의가 접수되었습니다")).toBeDefined());
    expect(screen.getByText("접수번호 12")).toBeDefined();
    // 폼은 사라진다(중복 제출 방지 + 접수 확인이 확실히 보이게)
    expect(screen.queryByRole("button", { name: "문의 남기기" })).toBeNull();
  });

  it("'다시 문의하기'를 누르면 빈 폼으로 돌아간다", async () => {
    createMock.mockResolvedValue({ id: 12 });
    render(<InquirySection />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "문의 남기기" }));
    await waitFor(() => expect(screen.getByText("문의가 접수되었습니다")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "다시 문의하기" }));

    const name = screen.getByLabelText("이름") as HTMLInputElement;
    expect(name.value).toBe("");
  });

  it("서버 오류는 handleApiError로 위임한다(토스트)", async () => {
    const { ApiError } = await import("@/lib/auth/apiError");
    createMock.mockRejectedValue(new ApiError(429, "RATE_LIMIT_EXCEEDED", undefined, "Too Many Requests"));
    render(<InquirySection />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "문의 남기기" }));

    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith("문의가 너무 많이 접수되었습니다. 잠시 후 다시 시도해 주세요."),
    );
    // 실패 시 폼은 그대로 남는다(입력 유실 방지)
    expect(screen.getByRole("button", { name: "문의 남기기" })).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/components/about/InquirySection.test.tsx`
Expected: FAIL — `Failed to resolve import "./InquirySection"`

- [ ] **Step 3: zod 스키마 구현**

`src/components/about/inquirySchema.ts`:

```ts
import { z } from "zod";
import { phoneSchema } from "@/components/auth/schemas";

// API 제약(api-docs InquiryCreateRequest)과 1:1 — 이름 ≤50 · 연락처 ≤20 · 이메일 ≤100 · 내용 10~2000.
export const inquirySchema = z.object({
  name: z.string().min(1, "이름을 입력해 주세요.").max(50, "이름은 50자 이하로 입력해 주세요."),
  phone: phoneSchema, // 하이픈 허용·자릿수 검증(가입 폼과 공유)
  // 선택 입력: 빈 문자열 허용(제출 시 undefined로 변환), 값이 있으면 형식 검증
  email: z.union([z.literal(""), z.email("이메일 형식을 확인해 주세요.")]),
  content: z
    .string()
    .min(10, "문의 내용을 10자 이상 입력해 주세요.")
    .max(2000, "문의 내용은 2000자 이하로 입력해 주세요."),
  privacyAgreed: z.boolean().refine((v) => v === true, "개인정보 수집·이용에 동의해 주세요."),
});
export type InquiryFormValues = z.infer<typeof inquirySchema>;
```

- [ ] **Step 4: 폼 컴포넌트 구현**

`src/components/about/InquirySection.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { TermsDialog } from "@/components/auth/TermsDialog";
import { formatPhone } from "@/components/auth/formatPhone";
import { PRIVACY_POLICY } from "@/constants/terms";
import { ApiError } from "@/lib/auth/apiError";
import { handleApiError } from "@/lib/auth/handleApiError";
import { createInquiry } from "@/lib/api/inquiries";
import { inquirySchema, type InquiryFormValues } from "./inquirySchema";

// 서버 errors[].field 화이트리스트 — 그 외 필드명은 무시(토스트 폴백).
const SERVER_FIELDS = ["name", "phone", "email", "content", "privacyAgreed"] as const;
type InquiryField = (typeof SERVER_FIELDS)[number];
const isInquiryField = (f: string): f is InquiryField =>
  (SERVER_FIELDS as readonly string[]).includes(f);

// 흰 캔버스 — 연락처 페이지의 세 번째 채널(전화·이메일 다음). 비로그인 방문자도 제출한다.
export function InquirySection() {
  // 접수번호를 들고 있으면 완료 패널을 렌더한다 — 토스트만으로는 고령 사용자가 접수를 놓친다.
  const [ticketId, setTicketId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { name: "", phone: "", email: "", content: "", privacyAgreed: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await createInquiry({
        name: values.name,
        phone: values.phone,
        email: values.email === "" ? undefined : values.email, // 빈 문자열은 보내지 않는다(선택 필드)
        content: values.content,
        privacyAgreed: values.privacyAgreed,
      });
      setTicketId(res.id);
    } catch (e) {
      if (e instanceof ApiError) {
        handleApiError(e, {
          onFieldErrors: (fieldErrors) => {
            for (const fe of fieldErrors) {
              if (isInquiryField(fe.field)) setError(fe.field, { message: fe.reason });
            }
          },
        });
      } else {
        handleApiError(new ApiError(0, undefined, "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."));
      }
    }
  });

  const restart = () => {
    reset();
    setTicketId(null);
  };

  return (
    <Container as="section" className="break-keep py-section">
      <Reveal>
        <h2 className={cn(typo.displayMd, "text-ink")}>문의 남기기</h2>
        <p className={cn(typo.bodyLg, "mt-base text-body")}>
          궁금한 점을 남겨 주시면 담당자가 연락처로 회신드립니다.
        </p>

        {/* 폼 읽기 컬럼 폭 — 마이페이지·계정 폼과 같은 토큰(t-shirt max-w-*는 spacing 토큰과 충돌해 금지). */}
        <div className="mt-xxl max-w-[var(--container-narrow)]">
          {ticketId != null ? (
            <div className="flex flex-col items-start gap-base rounded-xl border border-hairline bg-surface-soft p-xl">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary text-on-primary">
                <Check size={24} aria-hidden />
              </span>
              <h3 className={cn(typo.titleMd, "text-ink")}>문의가 접수되었습니다</h3>
              <p className={cn(typo.bodyMd, "text-body")}>
                남겨주신 연락처로 담당자가 회신드립니다.
              </p>
              <p className={cn(typo.datetime, "text-muted")}>{`접수번호 ${ticketId}`}</p>
              <Button type="button" variant="secondary" onClick={restart}>
                다시 문의하기
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-base" noValidate>
              <div className="flex flex-col gap-xxs">
                <label htmlFor="inquiry-name" className={cn(typo.bodySm, "text-ink")}>
                  이름
                </label>
                <Input id="inquiry-name" autoComplete="name" error={errors.name?.message} {...register("name")} />
              </div>

              <div className="flex flex-col gap-xxs">
                <label htmlFor="inquiry-phone" className={cn(typo.bodySm, "text-ink")}>
                  연락처
                </label>
                <Input
                  id="inquiry-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  error={errors.phone?.message}
                  {...register("phone")}
                  // 자동 하이픈 — 가입·로그인 폼과 동일한 입력 경험.
                  onChange={(e) => setValue("phone", formatPhone(e.target.value))}
                />
              </div>

              <div className="flex flex-col gap-xxs">
                <label htmlFor="inquiry-email" className={cn(typo.bodySm, "text-ink")}>
                  이메일 (선택)
                </label>
                <Input id="inquiry-email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
              </div>

              <div className="flex flex-col gap-xxs">
                <label htmlFor="inquiry-content" className={cn(typo.bodySm, "text-ink")}>
                  문의 내용
                </label>
                <Textarea id="inquiry-content" rows={8} error={errors.content?.message} {...register("content")} />
              </div>

              <div className="flex items-start justify-between gap-sm">
                <Checkbox
                  label="개인정보 수집·이용 동의 (필수)"
                  error={errors.privacyAgreed?.message}
                  {...register("privacyAgreed")}
                />
                <TermsDialog doc={PRIVACY_POLICY} />
              </div>

              <Button type="submit" loading={isSubmitting} className="self-start">
                문의 남기기
              </Button>
            </form>
          )}
        </div>
      </Reveal>
    </Container>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm test src/components/about/InquirySection.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 6: 연락처 페이지에 배치**

`src/app/(site)/about/location/page.tsx`:

```tsx
import { LocationContact } from "@/components/about/LocationContact";
import { LocationDirections } from "@/components/about/LocationDirections";
import { InquirySection } from "@/components/about/InquirySection";

// 연락처·오시는 길 — 정적 생성(공개 콘텐츠는 상수 주입, API 호출 없음).
// 문의 폼은 제출(POST)만 하는 client 섹션이라 페이지의 정적 생성을 깨지 않는다.
export default function LocationPage() {
  return (
    <>
      <LocationContact />
      <LocationDirections />
      <InquirySection />
    </>
  );
}
```

- [ ] **Step 7: 타입·린트·빌드 검증**

Run: `npx tsc --noEmit && pnpm lint && pnpm build`
Expected: 에러 없음. `/about/location`이 여전히 정적(○ 또는 ●)으로 표시되는지 빌드 출력에서 확인한다.

- [ ] **Step 8: 커밋**

```bash
git add src/components/about/inquirySchema.ts src/components/about/InquirySection.tsx src/components/about/InquirySection.test.tsx "src/app/(site)/about/location/page.tsx"
git commit -m "feat : 연락처 페이지 공개 문의 접수 폼 추가 #90"
```

---

### Task 5: 어드민 상세 다이얼로그 — `InquiryDetailDialog`

**Files:**
- Create: `src/components/admin/inquiries/InquiryDetailDialog.tsx`
- Test: `src/components/admin/inquiries/InquiryDetailDialog.test.tsx`

**Interfaces:**
- Consumes: `getInquiry`·`completeInquiry`·`deleteInquiry`·`InquiryDetailResponse` (Task 2) · `adminKeys` (`@/lib/admin/queryKeys`) · `adminOnError` (`@/lib/admin/mutationHandlers`) · `DeleteConfirmDialog`·`Dialog*`·`Badge`·`Skeleton`·`Button` · `formatDate` (`@/lib/date`) · `notify`
- Produces: `export function InquiryDetailDialog({ id, open, onOpenChange }: { id: number | null; open: boolean; onOpenChange: (v: boolean) => void })`

`MemberDetailDialog` 동형. **시드는 `useQuery` 파생**(`useState` + effect `setState`는 lint 에러). 본문은 방문자가 쓴 평문이라 **마크다운으로 렌더하지 않고** `whitespace-pre-wrap`으로 그대로 보여준다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/admin/inquiries/InquiryDetailDialog.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getMock, completeMock, deleteMock, notifySuccess } = vi.hoisted(() => ({
  getMock: vi.fn(),
  completeMock: vi.fn(),
  deleteMock: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/inquiries.admin", () => ({
  getInquiry: getMock,
  completeInquiry: completeMock,
  deleteInquiry: deleteMock,
}));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));

import { InquiryDetailDialog } from "./InquiryDetailDialog";

const detail = {
  id: 7,
  name: "홍길동",
  phone: "010-1234-5678",
  email: "a@b.com",
  content: "예배 시간이 궁금합니다.",
  completed: false,
  completedAt: null,
  createdAt: "2026-07-14T10:00:00",
};

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => vi.clearAllMocks());

const renderDialog = (id: number | null = 7) =>
  render(
    <QueryClientProvider client={qc}>
      <InquiryDetailDialog id={id} open onOpenChange={() => {}} />
    </QueryClientProvider>,
  );

describe("InquiryDetailDialog", () => {
  it("문의 내용과 연락처를 렌더한다", async () => {
    getMock.mockResolvedValue(detail);
    renderDialog();
    await waitFor(() => expect(screen.getByText("예배 시간이 궁금합니다.")).toBeDefined());
    expect(screen.getByText("010-1234-5678")).toBeDefined();
    expect(screen.getByText("a@b.com")).toBeDefined();
    expect(screen.getByText("미처리")).toBeDefined();
  });

  it("'완료 처리'를 누르면 completeInquiry(id, true)를 호출한다", async () => {
    getMock.mockResolvedValue(detail);
    completeMock.mockResolvedValue({ ...detail, completed: true, completedAt: "2026-07-14T11:00:00" });
    renderDialog();
    await waitFor(() => expect(screen.getByRole("button", { name: "완료 처리" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "완료 처리" }));

    await waitFor(() => expect(completeMock).toHaveBeenCalledWith(7, true));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());
  });

  it("완료된 문의는 '완료 취소'를 노출하고 completeInquiry(id, false)를 호출한다", async () => {
    getMock.mockResolvedValue({ ...detail, completed: true, completedAt: "2026-07-14T11:00:00" });
    completeMock.mockResolvedValue({ ...detail, completed: false, completedAt: null });
    renderDialog();
    await waitFor(() => expect(screen.getByRole("button", { name: "완료 취소" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "완료 취소" }));

    await waitFor(() => expect(completeMock).toHaveBeenCalledWith(7, false));
  });

  it("삭제는 확인 다이얼로그를 거쳐 deleteInquiry를 호출한다", async () => {
    getMock.mockResolvedValue(detail);
    deleteMock.mockResolvedValue(undefined);
    renderDialog();
    await waitFor(() => expect(screen.getByRole("button", { name: "삭제" })).toBeDefined());

    // 1차: 상세의 삭제 버튼 → 확인 다이얼로그 오픈
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(screen.getByText("문의를 삭제할까요?")).toBeDefined());

    // 2차: 확인 다이얼로그의 삭제 버튼(마지막으로 렌더된 것)
    const confirmButtons = screen.getAllByRole("button", { name: "삭제" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(7));
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/components/admin/inquiries/InquiryDetailDialog.test.tsx`
Expected: FAIL — `Failed to resolve import "./InquiryDetailDialog"`

- [ ] **Step 3: 구현**

`src/components/admin/inquiries/InquiryDetailDialog.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { ACTION } from "@/constants/actionButton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminKeys } from "@/lib/admin/queryKeys";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { formatDate } from "@/lib/date";
import { getInquiry, completeInquiry, deleteInquiry } from "@/lib/api/inquiries.admin";

interface Props {
  id: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// 목록에 content가 없어 내용 확인과 처리를 같은 자리에서 한다(오조작 방지 — 읽지 않고 체크할 수 없다).
export function InquiryDetailDialog({ id, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const detail = useQuery({
    queryKey: adminKeys.detail("inquiries", id ?? 0),
    queryFn: () => getInquiry(id as number),
    enabled: open && id != null,
    retry: false,
  });

  // 조회 실패는 토스트로 알리고 닫는다(빈 상세와 혼동 방지). notify는 setState 아님.
  useEffect(() => {
    if (detail.isError) {
      adminOnError()(detail.error);
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.isError, detail.error]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: adminKeys.listAll("inquiries") });
    if (id != null) qc.invalidateQueries({ queryKey: adminKeys.detail("inquiries", id) });
  };

  const toggle = useMutation({
    mutationFn: (completed: boolean) => completeInquiry(id as number, completed),
    onError: adminOnError(),
    onSuccess: (updated) => {
      invalidate();
      notify.success(updated.completed ? "완료 처리했습니다." : "완료를 취소했습니다.");
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteInquiry(id as number),
    onError: adminOnError(),
    onSuccess: () => {
      invalidate();
      notify.success("삭제했습니다.");
      setDeleteOpen(false);
      onOpenChange(false);
    },
  });

  const q = detail.data;
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{q ? q.name : "문의 상세"}</DialogTitle>
          </DialogHeader>

          {detail.isPending && open ? (
            <div className="flex flex-col gap-sm">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : q ? (
            <div className="flex flex-col gap-lg">
              <div className="flex flex-wrap items-center gap-xs">
                <Badge variant={q.completed ? "primary" : "default"}>{q.completed ? "완료" : "미처리"}</Badge>
                <span className={cn(typo.datetime, "text-muted")}>접수 {formatDate(q.createdAt)}</span>
                {q.completedAt ? (
                  <span className={cn(typo.datetime, "text-muted")}>완료 {formatDate(q.completedAt)}</span>
                ) : null}
              </div>

              {/* 회신 수단이라 바로 걸 수 있게 링크로 — 답변은 담당자가 전화·메일로 직접 발송한다. */}
              <dl className="flex flex-col gap-xs">
                <div className="flex gap-sm">
                  <dt className={cn(typo.bodySm, "w-20 shrink-0 text-muted")}>연락처</dt>
                  <dd className={cn(typo.bodyMd, "text-ink")}>
                    <a href={`tel:${q.phone}`} className="hover:text-primary">
                      {q.phone}
                    </a>
                  </dd>
                </div>
                {q.email ? (
                  <div className="flex gap-sm">
                    <dt className={cn(typo.bodySm, "w-20 shrink-0 text-muted")}>이메일</dt>
                    <dd className={cn(typo.bodyMd, "break-all text-ink")}>
                      <a href={`mailto:${q.email}`} className="hover:text-primary">
                        {q.email}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>

              <hr className="border-0 border-t border-hairline" aria-hidden />

              {/* 방문자가 쓴 평문 — 마크다운으로 해석하지 않는다(불필요한 렌더 위험). */}
              <p className={cn(typo.bodyMd, "whitespace-pre-wrap text-ink")}>{q.content}</p>

              <DialogFooter>
                <Button type="button" variant="tertiary" onClick={() => setDeleteOpen(true)}>
                  <ACTION.delete.Icon size={18} aria-hidden />
                  {ACTION.delete.label}
                </Button>
                <Button
                  type="button"
                  variant={q.completed ? "secondary" : "primary"}
                  loading={toggle.isPending}
                  onClick={() => toggle.mutate(!q.completed)}
                >
                  {q.completed ? "완료 취소" : "완료 처리"}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="문의를 삭제할까요?"
        warning="삭제한 문의는 목록에서 즉시 사라지며 되돌릴 수 없습니다."
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/components/admin/inquiries/InquiryDetailDialog.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/components/admin/inquiries/InquiryDetailDialog.tsx src/components/admin/inquiries/InquiryDetailDialog.test.tsx
git commit -m "feat : 어드민 문의 상세 다이얼로그(완료 처리·삭제) 추가 #90"
```

---

### Task 6: 어드민 목록 화면 — `InquiryManager` + 페이지

**Files:**
- Create: `src/components/admin/inquiries/InquiryManager.tsx`
- Test: `src/components/admin/inquiries/InquiryManager.test.tsx`
- Create: `src/app/(site)/mypage/manage/inquiries/page.tsx`

**Interfaces:**
- Consumes: `listInquiries`·`InquiryCardResponse`·`InquiryListParams` (Task 2) · `InquiryDetailDialog` (Task 5) · `DataTable`·`Column` · `Pagination` · `Tabs*` · `Badge` · `adminKeys` · `adminOnError` · `formatDate` · `RequirePermission`·`EditAccessDenied`·`Container`
- Produces: `export function InquiryManager()` · `/mypage/manage/inquiries` 라우트

`MemberManager` 동형(URL 구동 파라미터 + `keepPreviousData` + `Pagination`). 필터 탭 값은 `all | pending | done` ↔ URL `?completed=`(미지정 | `false` | `true`)로 매핑한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/admin/inquiries/InquiryManager.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { listMock, pushMock, searchParamsRef } = vi.hoisted(() => ({
  listMock: vi.fn(),
  pushMock: vi.fn(),
  searchParamsRef: { current: new URLSearchParams("") },
}));
vi.mock("@/lib/api/inquiries.admin", () => ({ listInquiries: listMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/mypage/manage/inquiries",
  useSearchParams: () => searchParamsRef.current,
}));
vi.mock("./InquiryDetailDialog", () => ({
  InquiryDetailDialog: ({ id }: { id: number | null }) => <div>detail:{id ?? "none"}</div>,
}));

import { InquiryManager } from "./InquiryManager";

const card = {
  id: 7,
  name: "홍길동",
  phone: "010-1234-5678",
  email: "a@b.com",
  completed: false,
  completedAt: null,
  createdAt: "2026-07-14T10:00:00",
};
const page = (content: unknown[], totalPages = 1) => ({
  content,
  page: { size: 10, number: 0, totalElements: content.length, totalPages },
});

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  searchParamsRef.current = new URLSearchParams("");
});
afterEach(() => vi.clearAllMocks());
const renderManager = () =>
  render(
    <QueryClientProvider client={qc}>
      <InquiryManager />
    </QueryClientProvider>,
  );

describe("InquiryManager", () => {
  it("목록(이름·연락처·상태 Badge)을 렌더한다", async () => {
    listMock.mockResolvedValue(page([card]));
    renderManager();
    await waitFor(() => expect(screen.getByText("홍길동")).toBeDefined());
    expect(screen.getByText("010-1234-5678")).toBeDefined();
    expect(screen.getByText("미처리")).toBeDefined();
  });

  it("기본(전체) 진입 시 completed 없이 조회한다", async () => {
    listMock.mockResolvedValue(page([card]));
    renderManager();
    await waitFor(() => expect(listMock).toHaveBeenCalledWith({ completed: undefined, page: 0, size: 10 }));
  });

  it("'미처리' 탭을 누르면 ?completed=false 로 URL을 갱신한다", async () => {
    listMock.mockResolvedValue(page([card]));
    renderManager();
    await waitFor(() => expect(screen.getByText("홍길동")).toBeDefined());

    fireEvent.click(screen.getByRole("tab", { name: "미처리" }));

    expect(pushMock).toHaveBeenCalledWith("/mypage/manage/inquiries?completed=false");
  });

  it("URL에 completed=true가 있으면 완료만 조회한다", async () => {
    searchParamsRef.current = new URLSearchParams("completed=true");
    listMock.mockResolvedValue(page([{ ...card, completed: true, completedAt: "2026-07-14T11:00:00" }]));
    renderManager();
    await waitFor(() => expect(listMock).toHaveBeenCalledWith({ completed: true, page: 0, size: 10 }));
    await waitFor(() => expect(screen.getByText("완료")).toBeDefined());
  });

  it("행을 클릭하면 상세 다이얼로그에 id를 넘긴다", async () => {
    listMock.mockResolvedValue(page([card]));
    renderManager();
    await waitFor(() => expect(screen.getByText("홍길동")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "홍길동 문의 상세" }));

    await waitFor(() => expect(screen.getByText("detail:7")).toBeDefined());
  });

  it("빈 목록이면 안내를 렌더한다", async () => {
    listMock.mockResolvedValue(page([]));
    renderManager();
    await waitFor(() => expect(screen.getByText("접수된 문의가 없습니다.")).toBeDefined());
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/components/admin/inquiries/InquiryManager.test.tsx`
Expected: FAIL — `Failed to resolve import "./InquiryManager"`

- [ ] **Step 3: 구현**

`src/components/admin/inquiries/InquiryManager.tsx`:

```tsx
"use client";
import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Pagination } from "@/components/common/Pagination";
import { adminKeys } from "@/lib/admin/queryKeys";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { formatDate } from "@/lib/date";
import { listInquiries, type InquiryCardResponse, type InquiryListParams } from "@/lib/api/inquiries.admin";
import { InquiryDetailDialog } from "./InquiryDetailDialog";

// 한 화면 10건 — 문의는 건수가 많지 않고 한 건씩 열어 처리한다.
const PAGE_SIZE = 10;

// 탭 값 ↔ URL(?completed=) 매핑. 전체는 파라미터 자체를 생략한다(백엔드 규약).
type FilterKey = "all" | "pending" | "done";
const FILTERS: { key: FilterKey; label: string; completed?: boolean }[] = [
  { key: "all", label: "전체" },
  { key: "pending", label: "미처리", completed: false },
  { key: "done", label: "완료", completed: true },
];
function filterFromParam(raw: string | null): FilterKey {
  if (raw === "false") return "pending";
  if (raw === "true") return "done";
  return "all";
}

export function InquiryManager() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filter = filterFromParam(searchParams.get("completed"));
  const params: InquiryListParams = {
    completed: FILTERS.find((f) => f.key === filter)?.completed,
    page: Number(searchParams.get("page") ?? "0") || 0,
    size: PAGE_SIZE,
  };

  const inquiries = useQuery({
    queryKey: adminKeys.list("inquiries", params),
    queryFn: () => listInquiries(params),
    placeholderData: keepPreviousData,
    retry: false,
  });

  // 조회 실패는 토스트로 알린다(빈 목록과 혼동 방지). notify 호출이라 effect 내 setState 아님.
  useEffect(() => {
    if (inquiries.isError) adminOnError()(inquiries.error);
  }, [inquiries.isError, inquiries.error]);

  const [selected, setSelected] = useState<number | null>(null);

  // 필터 변경 시 page를 리셋한다 — 3페이지에서 '완료' 탭으로 옮기면 빈 페이지가 나온다.
  const onFilterChange = (key: string) => {
    const next = FILTERS.find((f) => f.key === key);
    const sp = new URLSearchParams();
    if (next?.completed != null) sp.set("completed", String(next.completed));
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const columns: Column<InquiryCardResponse>[] = [
    {
      key: "name",
      header: "이름",
      // 행 전체 클릭은 <tr>에 핸들러를 다는 방식이라 키보드 접근이 끊긴다 — 이름 셀을 버튼으로.
      cell: (q) => (
        <button
          type="button"
          aria-label={`${q.name} 문의 상세`}
          onClick={() => setSelected(q.id)}
          className="text-ink underline-offset-4 hover:text-primary hover:underline"
        >
          {q.name}
        </button>
      ),
    },
    { key: "phone", header: "연락처", cell: (q) => <span className={typo.datetime}>{q.phone}</span> },
    { key: "createdAt", header: "접수일", cell: (q) => <span className={typo.datetime}>{formatDate(q.createdAt)}</span> },
    {
      key: "completed",
      header: "상태",
      cell: (q) => <Badge variant={q.completed ? "primary" : "default"}>{q.completed ? "완료" : "미처리"}</Badge>,
    },
  ];

  const pageMeta = inquiries.data?.page;
  return (
    <>
      <Tabs value={filter} onValueChange={onFilterChange}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.key} value={f.key}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-base">
        <DataTable
          columns={columns}
          rows={inquiries.data?.content ?? []}
          rowKey={(q) => q.id}
          loading={inquiries.isPending}
          empty={<p className={cn(typo.bodyMd, "text-muted")}>접수된 문의가 없습니다.</p>}
        />
      </div>

      {pageMeta && pageMeta.totalPages > 1 ? (
        <div className="mt-xl">
          <Pagination page={pageMeta} />
        </div>
      ) : null}

      <InquiryDetailDialog
        id={selected}
        open={selected != null}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      />
    </>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/components/admin/inquiries/InquiryManager.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: 관리 페이지 라우트 추가**

`src/app/(site)/mypage/manage/inquiries/page.tsx`:

```tsx
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { InquiryManager } from "@/components/admin/inquiries/InquiryManager";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 운영 전용 화면(manage-hub → kind:"manage"). 부모 manage/layout이 로그인 가드, 여기서 INQUIRY_MANAGE 게이트.
export default function ManageInquiriesPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>문의 관리</h1>
      <div className="mt-xl">
        <RequirePermission permission="INQUIRY_MANAGE" fallback={<EditAccessDenied />}>
          <InquiryManager />
        </RequirePermission>
      </div>
    </Container>
  );
}
```

- [ ] **Step 6: 타입·린트·빌드 검증**

Run: `npx tsc --noEmit && pnpm lint && pnpm build`
Expected: 에러 없음

- [ ] **Step 7: 커밋**

```bash
git add src/components/admin/inquiries/InquiryManager.tsx src/components/admin/inquiries/InquiryManager.test.tsx "src/app/(site)/mypage/manage/inquiries/page.tsx"
git commit -m "feat : 어드민 문의 관리 화면(목록·필터·페이지네이션) 추가 #90"
```

---

### Task 7: 디자인 시스템 문서 등록 · 전체 검증

**Files:**
- Modify: `.claude/rules/DESIGN.md`

**Interfaces:** 없음(문서).

DESIGN.md 규칙: "새 컴포넌트가 필요하면 이 문서의 components 블록에 항목을 추가한 뒤 구현한다."

- [ ] **Step 1: 공개 폼 컴포넌트 등록**

`.claude/rules/DESIGN.md`의 `### 폼` 섹션 끝(검증 메시지 줄 위)에 추가:

```markdown
- **`inquiry-form`**: 공개 문의 접수 폼(`/about/location` 세 번째 섹션). `text-input`·`Textarea`·`checkbox`(+`TermsDialog` 전문 보기) 조합에 48px `button-primary`. 제출 성공 시 폼을 접수 완료 패널로 교체한다(`{rounded.xl}` + `{colors.surface-soft}` + `{rounded.full}` 체크 플레이트 + 접수번호 `{typography.datetime}`) — 토스트만으로는 고령 사용자가 접수 사실을 놓친다. 비회원 제출이라 인증 없음.
```

- [ ] **Step 2: 어드민 컴포넌트 등록**

`.claude/rules/DESIGN.md`의 `### 어드민 공용 (Admin Shared)` 목록 끝에 추가:

```markdown
- **`inquiry-manager`**: 문의 목록·처리 화면(`/mypage/manage/inquiries`). `Tabs`(전체·미처리·완료 → URL `?completed=`) + `DataTable`(이름·연락처·접수일·상태 `Badge`) + `Pagination`(URL 구동, 10건). 목록에 문의 내용이 없어 이름 셀 버튼으로 상세를 연다. 공개 소비자 없음 — ISR 무효화 불요, `["admin","inquiries",...]` 클라 쿼리만 무효화.
- **`inquiry-detail-dialog`**: 문의 상세 Dialog. 상태 `Badge` + 연락처(`tel:`)·이메일(`mailto:`) + 본문(`whitespace-pre-wrap` — 방문자 평문이라 마크다운 변환 안 함) + 완료 처리/완료 취소 + `DeleteConfirmDialog` 삭제. `getInquiry` 시드(useQuery 파생), version 없음(낙관락 미적용 도메인).
```

- [ ] **Step 3: 전체 검증**

Run: `pnpm test && npx tsc --noEmit && pnpm lint && pnpm build`
Expected: 전부 그린. 테스트 실패 0, 타입 에러 0, lint 에러 0, 빌드 성공.

- [ ] **Step 4: 검수 기준 수동 확인**

`pnpm dev` 후 확인(백엔드가 붙어 있는 환경에서):
1. 비로그인 `/about/location` → 문의 제출 → 접수번호 패널 표시.
2. 10자 미만 내용·미동의 → 제출 차단, 인라인 안내.
3. `INQUIRY_MANAGE` 미보유 계정 → `/mypage/manage/inquiries` 접근 시 접근 거부 UI.
4. 보유 계정 → 마이페이지 관리 허브 최상단 "문의" 카테고리에 카드 노출 → 목록 → 상세 → 완료 처리 → 목록 Badge 즉시 갱신.
5. 완료 취소·삭제 동작(삭제는 확인 다이얼로그 경유).

- [ ] **Step 5: 커밋**

```bash
git add .claude/rules/DESIGN.md
git commit -m "docs : 문의 폼·문의 관리 컴포넌트 디자인 시스템 등록 #90"
```

---

## Self-Review

**스펙 커버리지**

| 스펙 항목 | 담당 태스크 |
|---|---|
| 4.1 공개 등록 API(비인증) | Task 1 |
| 4.2 어드민 API 4종 | Task 2 |
| 5 공개 문의 폼(검증·성공 패널·에러) | Task 4 |
| 6 어드민 목록·필터·페이지·상세 다이얼로그 | Task 5, 6 |
| 7 권한 라벨·관리 허브 카드(`inbox`)·429 문구·페이지 배치 | Task 3, 4(배치), 6(라우트) |
| 8 테스트 5종 | Task 1·2·4·5·6에 각각 포함 |
| 9 검수 기준 | Task 7 Step 3~4 |

**타입 일관성**: `InquiryCardResponse`(Task 2) → `InquiryManager`(Task 6) 소비, `InquiryDetailResponse` → `InquiryDetailDialog`(Task 5) 소비, `InquiryCreateRequest`(Task 1) → `InquirySection`(Task 4) 소비. `completeInquiry(id, completed)` 시그니처는 Task 2 정의 = Task 5 호출 일치. `adminKeys.list/listAll/detail` 도메인 문자열은 전부 `"inquiries"`로 통일.

**사전 확인 완료**: `authFetch`는 path를 그대로 받는다(`members.admin.ts` 확인 — 내부에서 `apiUrl` 적용). 폼 폭은 기존 `--container-narrow`(42rem) 토큰을 쓴다(`globals.css:77`). 미해결 항목 없음.
