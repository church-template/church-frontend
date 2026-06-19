# 회원 관리 및 약관 일괄 리셋 (07B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/mypage/manage/members` 어드민 화면 — 회원 목록·검색·상세, 정보 수정, 역할 부여·회수(=승인), 비밀번호 초기화(임시값 1회), 전역 약관 일괄 리셋을 제공한다.

**Architecture:** 단일 client island(`MemberManager`)가 `MEMBER_MANAGE` 게이트 안에서 URL 구동 검색·페이지네이션 + `DataTable` 목록 + 상세 다이얼로그를 배선한다. 상세 다이얼로그가 프로필 인라인 편집·역할 섹션(`ROLE_MANAGE`)·비번 초기화 섹션을 조합한다. 전역 약관 리셋은 회원과 분리된 별도 패널. 기존 어드민 매니저 패턴(MediaLibrary·RoleManager)과 공용 primitive를 재사용한다.

**Tech Stack:** Next.js(App Router) · TypeScript · TanStack Query · react-hook-form + zod(v4) · Tailwind(토큰) · vitest + @testing-library/react · pnpm.

## Global Constraints

- 패키지 매니저 **pnpm**. 검증 게이트: `pnpm test`(전체 통과) · `npx tsc --noEmit`(0 에러) · `pnpm lint`(0). 커버리지 80%+.
- **읽기 경로는 admin 미접두** `/api/members*`, **쓰기는** `/api/admin/members*`, 약관은 `/api/admin/agreements/reset`(스펙 §1 사실 #7). GET에 admin 접두를 붙이면 404.
- **약관 리셋은 200(본문 없음)** → `apiMutate`(204만 가드) 사용 금지. `authFetch` 직접 호출 후 `if (!res.ok) await parseJson(res)`.
- **역할 부여/회수 가드 strict**: `canAssignRole = role.priority < maxPriority`(동급 차단). 07A `canManageRole`(`<=`, `!isSystem`) **재사용 금지**.
- **권한 게이트 2분**: 페이지·정보수정·비번초기화·약관리셋 = `MEMBER_MANAGE`(페이지 `RequirePermission`). 역할 부여/회수 = `ROLE_MANAGE`(`MemberRolesSection` 내부 `useHasPermission`).
- 토큰만 사용: hex·px 인라인 금지, 텍스트는 `typo.*`. UI 이모지 금지, 아이콘 `lucide-react`(`currentColor`). JSX 조건부는 삼항(`{cond ? <X/> : null}`).
- zod v4(4.4.3): `invalid_type_error`/`required_error` 인자 금지. 이메일은 `z.email()`(top-level), `z.string().email()` 아님. number↔"" 매핑은 `Controller`.
- 답변·주석은 한국어(WHY 중심, 주변 스타일에 맞춤).
- **커밋**: Co-Authored-By 태그 금지. 사용자가 명시 요청할 때만 커밋(자동 금지). 각 태스크 끝의 commit 스텝은 체크포인트이며, 최종적으로 기능 단위로 그룹핑(마이크로 커밋 후 squash 허용, 프로젝트 관례).
- 테스트 관례(프론트): vitest `globals:false` → `describe/it/expect/vi` 명시 import. jest-dom 없음 → `.toBeDefined()`·`(el as HTMLButtonElement).disabled`. `vi.hoisted` + `vi.mock`로 의존 격리.

---

## File Structure

생성:
- `src/lib/api/members.admin.ts` — 회원 어드민 API(타입 + read `/api/members*` + write `/api/admin/members*`)
- `src/lib/api/agreements.admin.ts` — 전역 약관 리셋 API
- `src/lib/admin/memberGuards.ts` — `canAssignRole`(strict)
- `src/components/admin/members/schema.ts` — `memberUpdateSchema`
- `src/components/admin/members/MemberProfileForm.tsx` — 다이얼로그 내 인라인 편집
- `src/components/admin/members/MemberRolesSection.tsx` — 역할 chips·부여·회수(`ROLE_MANAGE`)
- `src/components/admin/members/ResetPasswordSection.tsx` — 비번 초기화 1회·휘발
- `src/components/admin/members/MemberDetailDialog.tsx` — 상세 패칭 + 섹션 조합
- `src/components/admin/members/AgreementResetPanel.tsx` — 전역 약관/개인정보 리셋
- `src/components/admin/members/MemberManager.tsx` — 검색·목록·페이지네이션·다이얼로그 오케스트레이터
- `src/app/(site)/mypage/manage/members/page.tsx` — 라우트(RSC + Suspense + RequirePermission)
- 각 모듈 옆 `*.test.ts(x)`

수정:
- `src/components/auth/schemas.ts` — `phoneSchema`에 `export` 추가(회원 폼 재사용, 1줄)
- `.claude/rules/DESIGN.md` — 어드민 공용 블록 07 구획에 컴포넌트 6종 등록

무변경(이미 정합): `src/lib/admin/manageDomains.ts`(`members` 카드 존재), `src/constants/permissions.ts`(`MEMBER_MANAGE`·`ROLE_MANAGE` 라벨).

---

## Task 1: 회원 어드민 API (`members.admin.ts`)

**Files:**
- Create: `src/lib/api/members.admin.ts`
- Test: `src/lib/api/members.admin.test.ts`

**Interfaces:**
- Consumes: `authFetch`(@/lib/auth/authFetch), `parseJson`(@/lib/auth/apiError), `apiMutate`(@/lib/admin/apiMutate), `Page<T>`(@/lib/page).
- Produces:
  - `MemberCardResponse { uuid, name, phone, position, roles: string[], approved, createdAt }`
  - `MemberDetailResponse { uuid, name, phone, email, position, roles: string[], permissions: string[], approved, termsAgreed, privacyAgreed, agreedAt: string|null, createdAt }`
  - `AdminMemberUpdateRequest { name?, phone?, email? }`, `MemberListParams { q?, page?, size?, sort? }`, `ResetPasswordResponse { temporaryPassword }`
  - `listMembers(p?: MemberListParams): Promise<Page<MemberCardResponse>>` · `getMember(uuid: string): Promise<MemberDetailResponse>`
  - `updateMember(uuid, body): Promise<MemberDetailResponse>` · `grantRole(uuid, roleId: number): Promise<MemberDetailResponse>` · `revokeRole(uuid, roleId: number): Promise<void>` · `resetPassword(uuid): Promise<ResetPasswordResponse>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/api/members.admin.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { authFetchMock, parseJsonMock, apiMutateMock } = vi.hoisted(() => ({
  authFetchMock: vi.fn(), parseJsonMock: vi.fn(), apiMutateMock: vi.fn(),
}));
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));
vi.mock("@/lib/auth/apiError", () => ({ parseJson: parseJsonMock }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { listMembers, getMember, updateMember, grantRole, revokeRole, resetPassword } from "./members.admin";

afterEach(() => vi.clearAllMocks());

describe("회원 어드민 API", () => {
  it("listMembers는 GET /api/members 에 q·page 쿼리를 조립한다(admin 미접두)", async () => {
    const res = {} as Response;
    authFetchMock.mockResolvedValue(res);
    parseJsonMock.mockResolvedValue({ content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } });
    await listMembers({ q: "010", page: 2 });
    expect(authFetchMock).toHaveBeenCalledWith("/api/members?q=010&page=2");
    expect(parseJsonMock).toHaveBeenCalledWith(res);
  });
  it("listMembers는 파라미터가 없으면 쿼리 없이 호출한다", async () => {
    authFetchMock.mockResolvedValue({} as Response);
    parseJsonMock.mockResolvedValue({ content: [], page: {} });
    await listMembers();
    expect(authFetchMock).toHaveBeenCalledWith("/api/members");
  });
  it("getMember는 GET /api/members/{uuid}", async () => {
    authFetchMock.mockResolvedValue({} as Response);
    parseJsonMock.mockResolvedValue({ uuid: "u1" });
    await getMember("u1");
    expect(authFetchMock).toHaveBeenCalledWith("/api/members/u1");
  });
  it("updateMember는 PATCH /api/admin/members/{uuid}", async () => {
    apiMutateMock.mockResolvedValue({ uuid: "u1" });
    await updateMember("u1", { name: "새이름", phone: "010-1111-2222", email: "" });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/members/u1", { method: "PATCH", body: { name: "새이름", phone: "010-1111-2222", email: "" } });
  });
  it("grantRole는 POST .../roles {roleId}", async () => {
    apiMutateMock.mockResolvedValue({ uuid: "u1" });
    await grantRole("u1", 5);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/members/u1/roles", { method: "POST", body: { roleId: 5 } });
  });
  it("revokeRole는 DELETE .../roles/{roleId}", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await revokeRole("u1", 5);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/members/u1/roles/5", { method: "DELETE" });
  });
  it("resetPassword는 POST .../reset-password, temporaryPassword 반환", async () => {
    apiMutateMock.mockResolvedValue({ temporaryPassword: "Temp!234" });
    const out = await resetPassword("u1");
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/members/u1/reset-password", { method: "POST" });
    expect(out.temporaryPassword).toBe("Temp!234");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/api/members.admin.test.ts`
Expected: FAIL — `Failed to resolve import "./members.admin"`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/api/members.admin.ts
// 어드민 회원 관리 API. client 컴포넌트 전용(authFetch/apiMutate 체인 → RSC 번들 금지).
// ⚠️ 읽기는 admin 미접두(/api/members*), 쓰기는 /api/admin/members* — 경로 비대칭(스펙 §1 사실 #7).
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import { apiMutate } from "@/lib/admin/apiMutate";
import type { Page } from "@/lib/page";

export interface MemberCardResponse {
  uuid: string;
  name: string;
  phone: string;
  position: string;
  roles: string[];
  approved: boolean;
  createdAt: string;
}
export interface MemberDetailResponse {
  uuid: string;
  name: string;
  phone: string;
  email: string;
  position: string;
  roles: string[];
  permissions: string[];
  approved: boolean;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  agreedAt: string | null; // @JsonInclude(NON_NULL) — 미동의 시 누락 가능
  createdAt: string;
}
export interface AdminMemberUpdateRequest { name?: string; phone?: string; email?: string }
export interface MemberListParams { q?: string; page?: number; size?: number; sort?: string }
export interface ResetPasswordResponse { temporaryPassword: string }

function buildMemberQuery(p: MemberListParams): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.page != null) sp.set("page", String(p.page));
  if (p.size != null) sp.set("size", String(p.size));
  if (p.sort) sp.set("sort", p.sort);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// 읽기 — admin 미접두 /api/members*
export async function listMembers(p: MemberListParams = {}): Promise<Page<MemberCardResponse>> {
  const res = await authFetch(`/api/members${buildMemberQuery(p)}`);
  return parseJson<Page<MemberCardResponse>>(res);
}
export async function getMember(uuid: string): Promise<MemberDetailResponse> {
  const res = await authFetch(`/api/members/${uuid}`);
  return parseJson<MemberDetailResponse>(res);
}

// 쓰기 — /api/admin/members*
export function updateMember(uuid: string, body: AdminMemberUpdateRequest): Promise<MemberDetailResponse> {
  return apiMutate<MemberDetailResponse>(`/api/admin/members/${uuid}`, { method: "PATCH", body });
}
export function grantRole(uuid: string, roleId: number): Promise<MemberDetailResponse> {
  return apiMutate<MemberDetailResponse>(`/api/admin/members/${uuid}/roles`, { method: "POST", body: { roleId } });
}
export function revokeRole(uuid: string, roleId: number): Promise<void> {
  return apiMutate<void>(`/api/admin/members/${uuid}/roles/${roleId}`, { method: "DELETE" });
}
export function resetPassword(uuid: string): Promise<ResetPasswordResponse> {
  // 본문 없는 POST. apiMutate는 body undefined면 JSON.stringify 생략(Content-Type만 부착).
  return apiMutate<ResetPasswordResponse>(`/api/admin/members/${uuid}/reset-password`, { method: "POST" });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/api/members.admin.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/members.admin.ts src/lib/api/members.admin.test.ts
git commit -m "feat: 회원 어드민 API(목록·상세·수정·역할·비번)"
```

---

## Task 2: 전역 약관 리셋 API (`agreements.admin.ts`)

**Files:**
- Create: `src/lib/api/agreements.admin.ts`
- Test: `src/lib/api/agreements.admin.test.ts`

**Interfaces:**
- Consumes: `authFetch`, `parseJson`.
- Produces: `AgreementTarget = "terms" | "privacy"` · `resetAgreements(target: AgreementTarget): Promise<void>`

> ⚠️ 이 엔드포인트는 **200 + 본문 없음**이다. `parseJson`은 `res.ok`면 `res.json()`을 호출해 빈 본문에 throw하고, `apiMutate`는 204만 가드한다. 그래서 `apiMutate`를 쓰지 않고 `authFetch` 직접 호출 후 비-2xx만 `parseJson`으로 변환한다.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/api/agreements.admin.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { authFetchMock, parseJsonMock } = vi.hoisted(() => ({ authFetchMock: vi.fn(), parseJsonMock: vi.fn() }));
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));
vi.mock("@/lib/auth/apiError", () => ({ parseJson: parseJsonMock }));

import { resetAgreements } from "./agreements.admin";

afterEach(() => vi.clearAllMocks());

describe("약관 어드민 API", () => {
  it("resetAgreements는 POST /api/admin/agreements/reset 에 {target}를 보낸다", async () => {
    authFetchMock.mockResolvedValue({ ok: true } as Response);
    await resetAgreements("terms");
    expect(authFetchMock).toHaveBeenCalledWith("/api/admin/agreements/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "terms" }),
    });
  });
  it("200 본문 없음이어도 파싱하지 않고 통과한다", async () => {
    authFetchMock.mockResolvedValue({ ok: true } as Response);
    await expect(resetAgreements("privacy")).resolves.toBeUndefined();
    expect(parseJsonMock).not.toHaveBeenCalled();
  });
  it("비-2xx면 parseJson으로 ApiError를 던진다", async () => {
    authFetchMock.mockResolvedValue({ ok: false } as Response);
    parseJsonMock.mockRejectedValue(new Error("400"));
    await expect(resetAgreements("terms")).rejects.toThrow();
    expect(parseJsonMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/api/agreements.admin.test.ts`
Expected: FAIL — import 해결 실패.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/api/agreements.admin.ts
// 어드민 약관 재동의 사이클 API. client 전용. 전역(전체 회원) 플래그 일괄 초기화.
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";

export type AgreementTarget = "terms" | "privacy";

// 전체 회원의 지정 동의 항목을 false로 초기화(200, 본문 없음) → 다음 로그인 시 재동의 유도.
// 200 빈 본문이라 apiMutate(parseJson 경유)를 쓰지 않는다 — 2xx면 본문 파싱 생략, 비-2xx만 ApiError로.
export async function resetAgreements(target: AgreementTarget): Promise<void> {
  const res = await authFetch("/api/admin/agreements/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target }),
  });
  if (!res.ok) await parseJson<void>(res);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/api/agreements.admin.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/agreements.admin.ts src/lib/api/agreements.admin.test.ts
git commit -m "feat: 전역 약관 재동의 리셋 API"
```

---

## Task 3: 역할 부여/회수 가드 (`memberGuards.ts`)

**Files:**
- Create: `src/lib/admin/memberGuards.ts`
- Test: `src/lib/admin/memberGuards.test.ts`

**Interfaces:**
- Consumes: `RoleResponse`(@/lib/api/roles.admin).
- Produces: `canAssignRole(role: RoleResponse, maxPriority: number): boolean` (`role.priority < maxPriority`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/admin/memberGuards.test.ts
import { describe, it, expect } from "vitest";
import { canAssignRole } from "./memberGuards";
import type { RoleResponse } from "@/lib/api/roles.admin";

const role = (priority: number, isSystem = false): RoleResponse => ({ id: 1, name: "R", priority, isSystem, description: "", permissions: [] });

describe("canAssignRole(strict, 동급 차단)", () => {
  it("내 등급보다 낮으면 부여 가능", () => expect(canAssignRole(role(40), 50)).toBe(true));
  it("동급은 차단", () => expect(canAssignRole(role(50), 50)).toBe(false));
  it("상위는 차단", () => expect(canAssignRole(role(70), 50)).toBe(false));
  it("isSystem이어도 priority로만 판정(MEMBER 승인 허용)", () => expect(canAssignRole(role(10, true), 50)).toBe(true));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/admin/memberGuards.test.ts`
Expected: FAIL — import 해결 실패.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/admin/memberGuards.ts
import type { RoleResponse } from "@/lib/api/roles.admin";

// 회원 역할 부여/회수 가드: 대상 역할 우선순위가 내 최대 등급보다 '엄격히 낮을' 때만(동급 차단).
// 백엔드 validateGrantable과 일치(ADMIN은 동급 ADMIN 위임/회수 불가, SUPER_ADMIN만 가능).
// isSystem은 제외하지 않는다 — MEMBER(시스템 역할) 부여가 곧 교인 승인이므로.
// 07A canManageRole(!isSystem && priority<=max, 역할 정의 편집용)과 의도·부등호가 다르다 → 재사용 금지.
export function canAssignRole(role: RoleResponse, maxPriority: number): boolean {
  return role.priority < maxPriority;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/admin/memberGuards.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/memberGuards.ts src/lib/admin/memberGuards.test.ts
git commit -m "feat: 회원 역할 부여/회수 위계 가드(strict)"
```

---

## Task 4: 회원 수정 스키마 (`schema.ts`) + `phoneSchema` export

**Files:**
- Modify: `src/components/auth/schemas.ts` (line 4 `const phoneSchema` → `export const phoneSchema`)
- Create: `src/components/admin/members/schema.ts`
- Test: `src/components/admin/members/schema.test.ts`

**Interfaces:**
- Consumes: `phoneSchema`(@/components/auth/schemas — 이번 태스크에서 export), `z`.
- Produces: `memberUpdateSchema`(name·phone·email) · `MemberFormValues = z.infer<...>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/admin/members/schema.test.ts
import { describe, it, expect } from "vitest";
import { memberUpdateSchema } from "./schema";

const base = { name: "홍길동", phone: "010-1234-5678", email: "a@b.com" };

describe("memberUpdateSchema", () => {
  it("정상 값 통과", () => expect(memberUpdateSchema.safeParse(base).success).toBe(true));
  it("이메일 빈 문자열 통과(선택)", () => expect(memberUpdateSchema.safeParse({ ...base, email: "" }).success).toBe(true));
  it("이름 빈값 실패", () => expect(memberUpdateSchema.safeParse({ ...base, name: "" }).success).toBe(false));
  it("이메일 형식 오류 실패", () => expect(memberUpdateSchema.safeParse({ ...base, email: "not-email" }).success).toBe(false));
  it("전화 자릿수 오류 실패", () => expect(memberUpdateSchema.safeParse({ ...base, phone: "010-1" }).success).toBe(false));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/admin/members/schema.test.ts`
Expected: FAIL — import 해결 실패.

- [ ] **Step 3a: Export `phoneSchema`**

`src/components/auth/schemas.ts` 4번째 줄을 수정한다(나머지 본문은 손대지 않는다):

```ts
// 변경 전: const phoneSchema = z
// 변경 후:
export const phoneSchema = z
  .string()
  .min(1, "전화번호를 입력해 주세요.")
  .regex(/^[0-9-]+$/, "전화번호는 숫자와 하이픈만 입력할 수 있습니다.")
  .refine((v) => {
    const digits = v.replace(/-/g, "").length;
    return digits >= 9 && digits <= 11;
  }, "전화번호 자릿수를 확인해 주세요.");
```

- [ ] **Step 3b: Write minimal implementation**

```ts
// src/components/admin/members/schema.ts
import { z } from "zod";
import { phoneSchema } from "@/components/auth/schemas";

// PATCH지만 폼은 세 필드 전체 제출. 전화 규칙은 가입 폼과 동일(phoneSchema 재사용).
// 이메일은 선택(빈 문자열 허용) — zod v4 top-level z.email() 사용(z.string().email() 아님).
export const memberUpdateSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(50, "50자 이내로 입력해 주세요."),
  phone: phoneSchema,
  email: z.union([z.literal(""), z.email("이메일 형식을 확인해 주세요.")]),
});
export type MemberFormValues = z.infer<typeof memberUpdateSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/admin/members/schema.test.ts src/components/auth/schemas.test.ts`
Expected: PASS (회원 5 + 기존 auth 스키마 테스트 회귀 없음).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/members/schema.ts src/components/admin/members/schema.test.ts src/components/auth/schemas.ts
git commit -m "feat: 회원 수정 스키마(phoneSchema 재사용)"
```

---

## Task 5: DESIGN.md 어드민 07 구획 등록 (선-등록)

**Files:**
- Modify: `.claude/rules/DESIGN.md` (어드민 공용 블록 07 구획 — `role-permissions-modal` 항목 **아래에** 추가, 다른 구획 라인은 건드리지 않는다)

> DESIGN 규칙: 새 컴포넌트는 문서 등록 후 구현한다(Implementation Notes #4). 컴포넌트 구현(Task 6~11) 전에 먼저 등록한다. 테스트 없음(문서).

- [ ] **Step 1: Append 6 component entries**

`.claude/rules/DESIGN.md`의 `role-permissions-modal` 항목 바로 아래에 다음 6줄을 추가한다:

```markdown
- **`member-manager`**: 회원 목록·검색·CRUD 오케스트레이터(트랙 07B). `DataTable`(이름·전화·직분·역할·승인·가입일) + URL 구동 검색·`Pagination`(MediaLibrary 동형) + 상세 다이얼로그 + 전역 약관 패널. 페이지 게이트 `MEMBER_MANAGE`. 공개 소비자 없음 — 클라 쿼리만 무효화.
- **`agreement-reset-panel`**: 전역 약관/개인정보 재동의 리셋(트랙 07B). 안내 배너(lucide `Info`) + `DeleteConfirmDialog`(button-destructive) 강한 확인창. 전체 회원 영향이라 회원 카드 무효화 없음(notify만).
- **`member-detail-dialog`**: 회원 상세 Dialog(트랙 07B). 승인 Badge·직분·역할 chips·권한 수·동의상태(약관/개인정보 Badge + agreedAt) + 인라인 편집·역할·비번 섹션 조합. `getMember`(no-store 성격, retry false) 시드.
- **`member-profile-form`**: 상세 다이얼로그 내 인라인 편집(이름·전화·이메일, 트랙 07B). `formatPhone` 입력 정규화, 전화 중복 시 phone 인라인 에러. 자기 수정 시 `["me"]` 무효화.
- **`member-roles-section`**: 보유 역할 chips·회수(×) + 부여(native select, `getRoles` 재사용 필터, 트랙 07B). `canAssignRole`(strict)·자기 가드, `useHasPermission("ROLE_MANAGE")`로 상호작용/읽기전용 전환.
- **`reset-password-section`**: 인라인 확인 → 임시 비밀번호 1회 표시(복사, 트랙 07B). 캐시 미저장, 다이얼로그 닫힘 시 언마운트로 휘발.
```

- [ ] **Step 2: Verify lint/format unaffected**

Run: `npx tsc --noEmit`
Expected: 0 에러(문서 변경, 코드 영향 없음).

- [ ] **Step 3: Commit**

```bash
git add .claude/rules/DESIGN.md
git commit -m "docs: DESIGN.md 07B 회원 관리 컴포넌트 6종 등록"
```

---

## Task 6: 프로필 인라인 편집 (`MemberProfileForm.tsx`)

**Files:**
- Create: `src/components/admin/members/MemberProfileForm.tsx`
- Test: `src/components/admin/members/MemberProfileForm.test.tsx`

**Interfaces:**
- Consumes: `updateMember`·`MemberDetailResponse`(Task 1), `memberUpdateSchema`·`MemberFormValues`(Task 4), `useMe`, `formatPhone`, `adminOnError`, `adminKeys`, `notify`, `Input`, `Button`.
- Produces: `MemberProfileForm({ member: MemberDetailResponse })`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/members/MemberProfileForm.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { updateMock, notifySuccess, useMeMock } = vi.hoisted(() => ({
  updateMock: vi.fn(), notifySuccess: vi.fn(), useMeMock: vi.fn(),
}));
vi.mock("@/lib/api/members.admin", () => ({ updateMember: updateMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }));

import { MemberProfileForm } from "./MemberProfileForm";

const member = { uuid: "u1", name: "홍길동", phone: "010-1234-5678", email: "a@b.com", position: "성도", roles: [], permissions: [], approved: true, termsAgreed: true, privacyAgreed: true, agreedAt: null, createdAt: "2026-01-01T00:00:00" };

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // updateMember 미수정 회원(admin과 uuid 다름) → ["me"] 무효화 없음. setQueryData/invalidate는 실제 qc에서 무해.
  useMeMock.mockReturnValue({ data: { uuid: "admin-uuid", maxPriority: 100 } });
});
afterEach(() => vi.clearAllMocks());
const renderForm = () => render(<QueryClientProvider client={qc}><MemberProfileForm member={member} /></QueryClientProvider>);

describe("MemberProfileForm", () => {
  it("read view에서 정보를 표시하고 수정 버튼으로 폼 전환", () => {
    renderForm();
    expect(screen.getByText("a@b.com")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    expect(screen.getByLabelText("이름")).toBeDefined();
  });
  it("저장 시 updateMember 호출 + 성공 토스트", async () => {
    updateMock.mockResolvedValue({ ...member, name: "임꺽정" });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "임꺽정" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledWith("u1", expect.objectContaining({ name: "임꺽정" })));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/admin/members/MemberProfileForm.test.tsx`
Expected: FAIL — import 해결 실패.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/admin/members/MemberProfileForm.tsx
"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { adminKeys } from "@/lib/admin/queryKeys";
import { notify } from "@/lib/notify";
import { useMe } from "@/lib/auth/useMe";
import { formatPhone } from "@/components/auth/formatPhone";
import { updateMember, type MemberDetailResponse } from "@/lib/api/members.admin";
import { memberUpdateSchema, type MemberFormValues } from "./schema";

export function MemberProfileForm({ member }: { member: MemberDetailResponse }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [editing, setEditing] = useState(false);

  const seed = { name: member.name, phone: member.phone, email: member.email ?? "" };
  const { register, handleSubmit, reset, setValue, setError, formState: { errors } } = useForm<MemberFormValues>({
    resolver: zodResolver(memberUpdateSchema),
    defaultValues: seed,
  });

  const mutation = useMutation({
    mutationFn: (v: MemberFormValues) => updateMember(member.uuid, { name: v.name, phone: v.phone, email: v.email }),
    onError: adminOnError({
      onDuplicate: () => setError("phone", { message: "이미 사용 중인 전화번호입니다." }),
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof MemberFormValues, { message: fe.reason })),
    }),
    onSuccess: (updated) => {
      qc.setQueryData(adminKeys.detail("members", member.uuid), updated);
      qc.invalidateQueries({ queryKey: ["admin", "members", "list"] });
      // 운영자가 자기 프로필을 고치면 useMe 스냅샷도 갱신.
      if (member.uuid === me?.uuid) qc.invalidateQueries({ queryKey: ["me"] });
      notify.success("저장했습니다.");
      setEditing(false);
    },
  });

  if (!editing) {
    return (
      <section className="flex flex-col gap-xs">
        <div className="flex items-center justify-between">
          <h3 className={cn(typo.titleSm, "text-ink")}>기본 정보</h3>
          <Button type="button" variant="tertiary" onClick={() => { reset(seed); setEditing(true); }}>수정</Button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-base gap-y-xxs">
          <dt className={cn(typo.bodySm, "text-muted")}>이름</dt><dd className={typo.bodyMd}>{member.name}</dd>
          <dt className={cn(typo.bodySm, "text-muted")}>전화</dt><dd className={typo.datetime}>{member.phone}</dd>
          <dt className={cn(typo.bodySm, "text-muted")}>이메일</dt><dd className={typo.bodyMd}>{member.email || "—"}</dd>
        </dl>
      </section>
    );
  }
  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-base">
      <div className="flex flex-col gap-xxs">
        <label htmlFor="member-name" className={cn(typo.bodySm, "text-body")}>이름</label>
        <Input id="member-name" error={errors.name?.message} {...register("name")} />
      </div>
      <div className="flex flex-col gap-xxs">
        <label htmlFor="member-phone" className={cn(typo.bodySm, "text-body")}>전화번호</label>
        <Input
          id="member-phone"
          inputMode="numeric"
          error={errors.phone?.message}
          {...register("phone", { onChange: (e) => setValue("phone", formatPhone(e.target.value)) })}
        />
      </div>
      <div className="flex flex-col gap-xxs">
        <label htmlFor="member-email" className={cn(typo.bodySm, "text-body")}>이메일(선택)</label>
        <Input id="member-email" type="email" error={errors.email?.message} {...register("email")} />
      </div>
      <div className="flex justify-end gap-sm">
        <Button type="button" variant="secondary" onClick={() => setEditing(false)}>취소</Button>
        <Button type="submit" variant="primary" loading={mutation.isPending}>저장</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/admin/members/MemberProfileForm.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/members/MemberProfileForm.tsx src/components/admin/members/MemberProfileForm.test.tsx
git commit -m "feat: 회원 프로필 인라인 편집 폼"
```

---

## Task 7: 역할 부여/회수 섹션 (`MemberRolesSection.tsx`)

**Files:**
- Create: `src/components/admin/members/MemberRolesSection.tsx`
- Test: `src/components/admin/members/MemberRolesSection.test.tsx`

**Interfaces:**
- Consumes: `grantRole`·`revokeRole`·`MemberDetailResponse`(Task 1), `canAssignRole`(Task 3), `getRoles`·`RoleResponse`(roles.admin), `useMe`·`useHasPermission`, `adminKeys`, `adminOnError`, `notify`, `Button`.
- Produces: `MemberRolesSection({ member: MemberDetailResponse })`.

> 역할 섹션은 `useHasPermission("ROLE_MANAGE")`로 상호작용/읽기전용을 가른다. 부여 후보·회수 가능은 `canAssignRole`(strict) + 미보유. me 미로딩·자기 자신은 변경 비활성.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/members/MemberRolesSection.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getRolesMock, grantMock, revokeMock, useMeMock, useHasPermMock, notifySuccess } = vi.hoisted(() => ({
  getRolesMock: vi.fn(), grantMock: vi.fn(), revokeMock: vi.fn(), useMeMock: vi.fn(), useHasPermMock: vi.fn(), notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/roles.admin", () => ({ getRoles: getRolesMock }));
vi.mock("@/lib/api/members.admin", () => ({ grantRole: grantMock, revokeRole: revokeMock }));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock, useHasPermission: useHasPermMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));

import { MemberRolesSection } from "./MemberRolesSection";

const roles = [
  { id: 1, name: "MEMBER", priority: 10, isSystem: true, description: "", permissions: [] },
  { id: 2, name: "콘텐츠관리", priority: 40, isSystem: false, description: "", permissions: [] },
  { id: 3, name: "ADMIN", priority: 90, isSystem: false, description: "", permissions: [] },
];
const member = { uuid: "u1", name: "홍길동", phone: "", email: "", position: "", roles: ["MEMBER"], permissions: [], approved: true, termsAgreed: true, privacyAgreed: true, agreedAt: null, createdAt: "2026-01-01T00:00:00" };

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useMeMock.mockReturnValue({ data: { uuid: "admin-uuid", maxPriority: 50 } });
  useHasPermMock.mockReturnValue(true);
  getRolesMock.mockResolvedValue(roles);
});
afterEach(() => vi.clearAllMocks());
const renderSection = (m = member) => render(<QueryClientProvider client={qc}><MemberRolesSection member={m} /></QueryClientProvider>);

describe("MemberRolesSection", () => {
  it("부여 후보는 내 등급 미만 && 미보유만(동급 ADMIN 제외, 보유 MEMBER 제외)", async () => {
    renderSection();
    await waitFor(() => expect(screen.getByRole("option", { name: "콘텐츠관리" })).toBeDefined());
    expect(screen.queryByRole("option", { name: "ADMIN" })).toBeNull(); // priority 90 >= 50 → 제외
    expect(screen.queryByRole("option", { name: "MEMBER" })).toBeNull(); // 이미 보유 → 제외
  });
  it("부여 선택 후 부여 버튼 → grantRole 호출", async () => {
    grantMock.mockResolvedValue({ ...member, roles: ["MEMBER", "콘텐츠관리"] });
    renderSection();
    await waitFor(() => expect(screen.getByRole("option", { name: "콘텐츠관리" })).toBeDefined());
    fireEvent.change(screen.getByLabelText("부여할 역할"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "부여" }));
    await waitFor(() => expect(grantMock).toHaveBeenCalledWith("u1", 2));
  });
  it("ROLE_MANAGE 미보유면 부여 컨트롤을 렌더하지 않는다", async () => {
    useHasPermMock.mockReturnValue(false);
    renderSection();
    await waitFor(() => expect(screen.getByText("MEMBER")).toBeDefined());
    expect(screen.queryByLabelText("부여할 역할")).toBeNull();
  });
  it("자기 자신이면 변경 비활성", async () => {
    useMeMock.mockReturnValue({ data: { uuid: "u1", maxPriority: 50 } }); // member.uuid와 동일
    renderSection();
    await waitFor(() => expect(screen.getByText("자기 자신의 역할은 변경할 수 없습니다.")).toBeDefined());
    expect((screen.getByRole("button", { name: "부여" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/admin/members/MemberRolesSection.test.tsx`
Expected: FAIL — import 해결 실패.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/admin/members/MemberRolesSection.tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { adminKeys } from "@/lib/admin/queryKeys";
import { notify } from "@/lib/notify";
import { useMe, useHasPermission } from "@/lib/auth/useMe";
import { getRoles } from "@/lib/api/roles.admin";
import { grantRole, revokeRole, type MemberDetailResponse } from "@/lib/api/members.admin";
import { canAssignRole } from "@/lib/admin/memberGuards";

export function MemberRolesSection({ member }: { member: MemberDetailResponse }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const canManageRoles = useHasPermission("ROLE_MANAGE");
  const maxPriority = me?.maxPriority;
  const isSelf = member.uuid === me?.uuid;
  const canMutate = canManageRoles && maxPriority !== undefined && !isSelf;

  const { data: roles = [] } = useQuery({ queryKey: adminKeys.list("roles"), queryFn: getRoles });
  const [selectedRoleId, setSelectedRoleId] = useState<number | "">("");

  const invalidateList = () => qc.invalidateQueries({ queryKey: ["admin", "members", "list"] });

  const grant = useMutation({
    mutationFn: (roleId: number) => grantRole(member.uuid, roleId),
    onError: adminOnError(),
    onSuccess: (updated) => {
      qc.setQueryData(adminKeys.detail("members", member.uuid), updated);
      invalidateList();
      setSelectedRoleId("");
      notify.success("역할을 부여했습니다.");
    },
  });
  const revoke = useMutation({
    mutationFn: (roleId: number) => revokeRole(member.uuid, roleId),
    onError: adminOnError(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.detail("members", member.uuid) });
      invalidateList();
      notify.success("역할을 회수했습니다.");
    },
  });

  // 부여 후보: 내 등급 미만(strict) && 미보유. maxPriority 미정이면 후보 없음.
  const assignable = roles.filter((r) => maxPriority !== undefined && canAssignRole(r, maxPriority) && !member.roles.includes(r.name));

  return (
    <section className="flex flex-col gap-sm">
      <h3 className={cn(typo.titleSm, "text-ink")}>역할</h3>
      <p className={cn(typo.caption, "text-muted")}>권한 {member.permissions.length}개</p>
      {isSelf ? <p className={cn(typo.caption, "text-muted")}>자기 자신의 역할은 변경할 수 없습니다.</p> : null}
      <div className="flex flex-wrap gap-xs">
        {member.roles.length === 0 ? <span className={cn(typo.bodySm, "text-muted")}>부여된 역할이 없습니다.</span> : null}
        {member.roles.map((name) => {
          const role = roles.find((r) => r.name === name);
          const removable = canMutate && role != null && canAssignRole(role, maxPriority as number);
          return (
            <span key={name} className="inline-flex items-center gap-xxs rounded-sm bg-surface-strong py-1 pl-3 pr-1">
              <span className={typo.captionStrong}>{name}</span>
              {canManageRoles ? (
                <button
                  type="button"
                  aria-label={`${name} 회수`}
                  disabled={!removable}
                  title={removable ? undefined : "회수할 수 없는 역할입니다"}
                  onClick={() => { if (role) revoke.mutate(role.id); }}
                  className="rounded-sm p-xxs text-muted hover:text-ink disabled:opacity-40 disabled:pointer-events-none"
                >
                  <X size={14} aria-hidden />
                </button>
              ) : null}
            </span>
          );
        })}
      </div>
      {canManageRoles ? (
        <div className="flex items-center gap-xs">
          <select
            aria-label="부여할 역할"
            disabled={!canMutate || assignable.length === 0}
            value={selectedRoleId === "" ? "" : String(selectedRoleId)}
            onChange={(e) => setSelectedRoleId(e.target.value === "" ? "" : Number(e.target.value))}
            className={cn(typo.bodyMd, "h-12 rounded-md border border-hairline bg-canvas px-4 text-ink outline-hidden focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary")}
          >
            <option value="">역할 선택</option>
            {assignable.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <Button
            type="button"
            variant="secondary"
            loading={grant.isPending}
            disabled={!canMutate || selectedRoleId === ""}
            onClick={() => { if (selectedRoleId !== "") grant.mutate(selectedRoleId); }}
          >부여</Button>
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/admin/members/MemberRolesSection.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/members/MemberRolesSection.tsx src/components/admin/members/MemberRolesSection.test.tsx
git commit -m "feat: 회원 역할 부여/회수 섹션"
```

---

## Task 8: 비밀번호 초기화 섹션 (`ResetPasswordSection.tsx`)

**Files:**
- Create: `src/components/admin/members/ResetPasswordSection.tsx`
- Test: `src/components/admin/members/ResetPasswordSection.test.tsx`

**Interfaces:**
- Consumes: `resetPassword`(Task 1), `adminOnError`, `notify`, `Button`.
- Produces: `ResetPasswordSection({ uuid: string })`.

> 임시 비번은 로컬 state로만 보관(캐시 미저장). 다이얼로그 닫힘 시 컴포넌트 언마운트로 소멸. 인라인 2단 확인(중첩 다이얼로그 회피).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/members/ResetPasswordSection.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { resetMock, notifySuccess } = vi.hoisted(() => ({ resetMock: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@/lib/api/members.admin", () => ({ resetPassword: resetMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
// useMutation은 실제 동작이 필요 없으므로 react-query를 그대로 쓰되 Provider로 감싼다.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ResetPasswordSection } from "./ResetPasswordSection";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
const renderSection = () => render(<QueryClientProvider client={qc}><ResetPasswordSection uuid="u1" /></QueryClientProvider>);

describe("ResetPasswordSection", () => {
  it("인라인 확인 → 초기화 → 임시 비번 1회 표시", async () => {
    resetMock.mockResolvedValue({ temporaryPassword: "Temp!234" });
    renderSection();
    fireEvent.click(screen.getByRole("button", { name: "비밀번호 초기화" }));
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    await waitFor(() => expect(resetMock).toHaveBeenCalledWith("u1"));
    await waitFor(() => expect(screen.getByText("Temp!234")).toBeDefined());
  });
  it("취소하면 초기화하지 않는다", () => {
    renderSection();
    fireEvent.click(screen.getByRole("button", { name: "비밀번호 초기화" }));
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(resetMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/admin/members/ResetPasswordSection.test.tsx`
Expected: FAIL — import 해결 실패.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/admin/members/ResetPasswordSection.tsx
"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { resetPassword } from "@/lib/api/members.admin";

export function ResetPasswordSection({ uuid }: { uuid: string }) {
  const [confirming, setConfirming] = useState(false);
  const [temp, setTemp] = useState<string | null>(null); // 캐시 미저장 — 닫히면 언마운트로 휘발

  const reset = useMutation({
    mutationFn: () => resetPassword(uuid),
    onError: adminOnError(),
    onSuccess: (res) => { setTemp(res.temporaryPassword); setConfirming(false); },
  });

  const copy = () => {
    if (temp) void navigator.clipboard?.writeText(temp).then(() => notify.success("복사했습니다."));
  };

  return (
    <section className="flex flex-col gap-sm">
      <h3 className={cn(typo.titleSm, "text-ink")}>비밀번호</h3>
      {temp ? (
        <div className="flex flex-col gap-xxs rounded-md border border-hairline bg-surface-soft p-base">
          <p className={cn(typo.caption, "text-muted")}>임시 비밀번호입니다. 본인에게 직접 전달하세요. 이 창을 닫으면 다시 볼 수 없습니다.</p>
          <div className="flex items-center gap-xs">
            <code className={cn(typo.datetime, "text-ink")}>{temp}</code>
            <Button type="button" variant="tertiary" onClick={copy} aria-label="임시 비밀번호 복사"><Copy size={16} aria-hidden /></Button>
          </div>
        </div>
      ) : confirming ? (
        <div className="flex items-center gap-xs">
          <span className={cn(typo.bodySm, "text-body")}>비밀번호를 임시값으로 초기화할까요?</span>
          <Button type="button" variant="destructive" loading={reset.isPending} onClick={() => reset.mutate()}>초기화</Button>
          <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>취소</Button>
        </div>
      ) : (
        <div><Button type="button" variant="secondary" onClick={() => setConfirming(true)}>비밀번호 초기화</Button></div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/admin/members/ResetPasswordSection.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/members/ResetPasswordSection.tsx src/components/admin/members/ResetPasswordSection.test.tsx
git commit -m "feat: 회원 비밀번호 초기화 섹션(임시값 1회)"
```

---

## Task 9: 상세 다이얼로그 (`MemberDetailDialog.tsx`)

**Files:**
- Create: `src/components/admin/members/MemberDetailDialog.tsx`
- Test: `src/components/admin/members/MemberDetailDialog.test.tsx`

**Interfaces:**
- Consumes: `getMember`(Task 1), `MemberProfileForm`(Task 6), `MemberRolesSection`(Task 7), `ResetPasswordSection`(Task 8), `adminKeys`, `adminOnError`, `formatDate`, `Dialog*`, `Badge`, `Skeleton`.
- Produces: `MemberDetailDialog({ uuid: string|null, open: boolean, onOpenChange: (v:boolean)=>void })`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/members/MemberDetailDialog.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getMemberMock } = vi.hoisted(() => ({ getMemberMock: vi.fn() }));
vi.mock("@/lib/api/members.admin", () => ({ getMember: getMemberMock }));
// 하위 섹션은 단위 테스트에서 스텁(자체 테스트 보유).
vi.mock("./MemberProfileForm", () => ({ MemberProfileForm: () => <div>profile-form</div> }));
vi.mock("./MemberRolesSection", () => ({ MemberRolesSection: () => <div>roles-section</div> }));
vi.mock("./ResetPasswordSection", () => ({ ResetPasswordSection: () => <div>reset-section</div> }));

import { MemberDetailDialog } from "./MemberDetailDialog";

const detail = { uuid: "u1", name: "홍길동", phone: "010-1234-5678", email: "a@b.com", position: "성도", roles: ["MEMBER"], permissions: ["GALLERY_VIEW"], approved: true, termsAgreed: true, privacyAgreed: false, agreedAt: "2026-02-01T00:00:00", createdAt: "2026-01-01T00:00:00" };

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
const renderDialog = (uuid: string | null) => render(<QueryClientProvider client={qc}><MemberDetailDialog uuid={uuid} open={uuid !== null} onOpenChange={() => {}} /></QueryClientProvider>);

describe("MemberDetailDialog", () => {
  it("상세를 패칭해 승인 Badge·동의 상태·섹션을 렌더", async () => {
    getMemberMock.mockResolvedValue(detail);
    renderDialog("u1");
    await waitFor(() => expect(screen.getByText("profile-form")).toBeDefined());
    expect(screen.getByText("승인")).toBeDefined();
    expect(screen.getByText("개인정보 미동의")).toBeDefined();
    expect(screen.getByText("roles-section")).toBeDefined();
    expect(screen.getByText("reset-section")).toBeDefined();
  });
  it("닫힘(uuid null)이면 getMember를 호출하지 않는다", () => {
    renderDialog(null);
    expect(getMemberMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/admin/members/MemberDetailDialog.test.tsx`
Expected: FAIL — import 해결 실패.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/admin/members/MemberDetailDialog.tsx
"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/common/Skeleton";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { adminKeys } from "@/lib/admin/queryKeys";
import { formatDate } from "@/lib/date";
import { getMember } from "@/lib/api/members.admin";
import { MemberProfileForm } from "./MemberProfileForm";
import { MemberRolesSection } from "./MemberRolesSection";
import { ResetPasswordSection } from "./ResetPasswordSection";

interface Props { uuid: string | null; open: boolean; onOpenChange: (v: boolean) => void }

export function MemberDetailDialog({ uuid, open, onOpenChange }: Props) {
  const detail = useQuery({
    queryKey: adminKeys.detail("members", uuid ?? ""),
    queryFn: () => getMember(uuid as string),
    enabled: open && !!uuid,
    retry: false,
  });

  // 조회 실패는 토스트로 알리고 닫는다(빈 상세와 혼동 방지). notify는 setState 아님.
  useEffect(() => {
    if (detail.isError) { adminOnError()(detail.error); onOpenChange(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.isError, detail.error]);

  const m = detail.data;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m ? m.name : "회원 상세"}</DialogTitle>
        </DialogHeader>
        {detail.isPending && open ? (
          <div className="flex flex-col gap-sm"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-2/3" /></div>
        ) : m ? (
          <div className="flex flex-col gap-lg">
            <div className="flex flex-wrap items-center gap-xs">
              <Badge variant={m.approved ? "primary" : "default"}>{m.approved ? "승인" : "대기"}</Badge>
              {m.position ? <span className={cn(typo.bodySm, "text-muted")}>{m.position}</span> : null}
              <span className={cn(typo.datetime, "text-muted")}>가입 {formatDate(m.createdAt)}</span>
            </div>
            <MemberProfileForm member={m} />
            <MemberRolesSection member={m} />
            <section className="flex flex-col gap-xs">
              <h3 className={cn(typo.titleSm, "text-ink")}>약관 동의</h3>
              <div className="flex flex-wrap items-center gap-xs">
                {/* 단일 텍스트 노드로 — split node면 getByText 매칭이 깨진다 */}
                <Badge variant={m.termsAgreed ? "primary" : "default"}>{`약관 ${m.termsAgreed ? "동의" : "미동의"}`}</Badge>
                <Badge variant={m.privacyAgreed ? "primary" : "default"}>{`개인정보 ${m.privacyAgreed ? "동의" : "미동의"}`}</Badge>
                {m.agreedAt ? <span className={cn(typo.datetime, "text-muted")}>{formatDate(m.agreedAt)}</span> : null}
              </div>
            </section>
            <ResetPasswordSection uuid={m.uuid} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/admin/members/MemberDetailDialog.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/members/MemberDetailDialog.tsx src/components/admin/members/MemberDetailDialog.test.tsx
git commit -m "feat: 회원 상세 다이얼로그(섹션 조합)"
```

---

## Task 10: 전역 약관 리셋 패널 (`AgreementResetPanel.tsx`)

**Files:**
- Create: `src/components/admin/members/AgreementResetPanel.tsx`
- Test: `src/components/admin/members/AgreementResetPanel.test.tsx`

**Interfaces:**
- Consumes: `resetAgreements`·`AgreementTarget`(Task 2), `DeleteConfirmDialog`, `adminOnError`, `notify`, `Button`.
- Produces: `AgreementResetPanel()`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/members/AgreementResetPanel.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { resetMock, notifySuccess } = vi.hoisted(() => ({ resetMock: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@/lib/api/agreements.admin", () => ({ resetAgreements: resetMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));

import { AgreementResetPanel } from "./AgreementResetPanel";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
const renderPanel = () => render(<QueryClientProvider client={qc}><AgreementResetPanel /></QueryClientProvider>);

describe("AgreementResetPanel", () => {
  it("개인정보 리셋 → 확인창 → resetAgreements('privacy')", async () => {
    resetMock.mockResolvedValue(undefined);
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "개인정보 동의 리셋" }));
    await waitFor(() => expect(screen.getByText("개인정보 동의를 초기화할까요?")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    await waitFor(() => expect(resetMock).toHaveBeenCalledWith("privacy"));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());
  });
  it("전체 회원 영향 경고문을 노출한다", () => {
    renderPanel();
    expect(screen.getByText(/전체 회원의 동의를 초기화합니다/)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/admin/members/AgreementResetPanel.test.tsx`
Expected: FAIL — import 해결 실패.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/admin/members/AgreementResetPanel.tsx
"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { resetAgreements, type AgreementTarget } from "@/lib/api/agreements.admin";

const LABEL: Record<AgreementTarget, string> = { terms: "약관", privacy: "개인정보" };

export function AgreementResetPanel() {
  const [target, setTarget] = useState<AgreementTarget | null>(null);

  const reset = useMutation({
    mutationFn: (t: AgreementTarget) => resetAgreements(t),
    onError: adminOnError(),
    onSuccess: (_d, t) => { notify.success(`전체 회원의 ${LABEL[t]} 동의를 초기화했습니다.`); setTarget(null); },
  });

  return (
    <section className="flex flex-col gap-base rounded-xl border border-hairline p-xl">
      <h2 className={cn(typo.titleMd, "text-ink")}>약관 재동의 사이클</h2>
      <div className="flex items-start gap-xs rounded-xl bg-surface-soft p-base">
        <Info size={20} aria-hidden className="mt-xxs shrink-0 text-muted" />
        <p className={cn(typo.bodySm, "text-body")}>전체 회원의 동의를 초기화합니다. 다음 로그인 시 재동의를 요구합니다. 되돌릴 수 없습니다.</p>
      </div>
      <div className="flex flex-wrap gap-xs">
        <Button type="button" variant="secondary" onClick={() => setTarget("terms")}>약관 동의 리셋</Button>
        <Button type="button" variant="secondary" onClick={() => setTarget("privacy")}>개인정보 동의 리셋</Button>
      </div>
      <DeleteConfirmDialog
        open={target !== null}
        onOpenChange={(v) => { if (!v) setTarget(null); }}
        title={target ? `${LABEL[target]} 동의를 초기화할까요?` : "동의를 초기화할까요?"}
        warning="전체 회원에 적용되며 되돌릴 수 없습니다. 영향 회원은 다음 로그인 시 재동의해야 합니다."
        confirmLabel="초기화"
        pending={reset.isPending}
        onConfirm={() => { if (target) reset.mutate(target); }}
      />
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/admin/members/AgreementResetPanel.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/members/AgreementResetPanel.tsx src/components/admin/members/AgreementResetPanel.test.tsx
git commit -m "feat: 전역 약관 재동의 리셋 패널"
```

---

## Task 11: 매니저 오케스트레이터 (`MemberManager.tsx`)

**Files:**
- Create: `src/components/admin/members/MemberManager.tsx`
- Test: `src/components/admin/members/MemberManager.test.tsx`

**Interfaces:**
- Consumes: `listMembers`·`MemberCardResponse`·`MemberListParams`(Task 1), `AgreementResetPanel`(Task 10), `MemberDetailDialog`(Task 9), `DataTable`·`Column`, `Pagination`, `EmptyState`, `Input`, `Button`, `Badge`, `adminKeys`, `adminOnError`, `formatDate`, next/navigation.
- Produces: `MemberManager()`.

> URL 구동(MediaLibrary 동형): `q`·`page`를 searchParams에서 읽어 `listMembers`. 검색 폼 제출 → `setParam("q")`(page 리셋). 상세는 로컬 `selected` state.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/members/MemberManager.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { listMock, pushMock, searchParamsRef } = vi.hoisted(() => ({ listMock: vi.fn(), pushMock: vi.fn(), searchParamsRef: { current: new URLSearchParams("") } }));
vi.mock("@/lib/api/members.admin", () => ({ listMembers: listMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/mypage/manage/members",
  useSearchParams: () => searchParamsRef.current,
}));
vi.mock("./AgreementResetPanel", () => ({ AgreementResetPanel: () => <div>agreement-panel</div> }));
vi.mock("./MemberDetailDialog", () => ({ MemberDetailDialog: ({ uuid }: { uuid: string | null }) => <div>detail:{uuid ?? "none"}</div> }));

import { MemberManager } from "./MemberManager";

const page = (content: unknown[], totalPages = 1) => ({ content, page: { size: 20, number: 0, totalElements: content.length, totalPages } });
const card = { uuid: "u1", name: "홍길동", phone: "010-1234-5678", position: "성도", roles: ["MEMBER"], approved: true, createdAt: "2026-01-01T00:00:00" };

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  searchParamsRef.current = new URLSearchParams("");
});
afterEach(() => vi.clearAllMocks());
const renderManager = () => render(<QueryClientProvider client={qc}><MemberManager /></QueryClientProvider>);

describe("MemberManager", () => {
  it("목록(이름·승인 Badge)을 렌더하고 약관 패널을 포함한다", async () => {
    listMock.mockResolvedValue(page([card]));
    renderManager();
    await waitFor(() => expect(screen.getByText("홍길동")).toBeDefined());
    expect(screen.getByText("승인")).toBeDefined();
    expect(screen.getByText("agreement-panel")).toBeDefined();
  });
  it("검색 제출 시 ?q= 로 URL을 갱신한다(page 리셋)", async () => {
    listMock.mockResolvedValue(page([card]));
    renderManager();
    await waitFor(() => expect(screen.getByText("홍길동")).toBeDefined());
    // ASCII 검색어로 URL 인코딩을 결정적으로 — 한글은 퍼센트 인코딩이라 어서션이 깨지기 쉽다.
    fireEvent.change(screen.getByLabelText("이름 또는 전화번호 검색"), { target: { value: "01012" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    expect(pushMock).toHaveBeenCalledWith("/mypage/manage/members?q=01012");
  });
  it("상세 액션 클릭 시 다이얼로그에 uuid를 전달한다", async () => {
    listMock.mockResolvedValue(page([card]));
    renderManager();
    await waitFor(() => expect(screen.getByText("홍길동")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "홍길동 상세" }));
    await waitFor(() => expect(screen.getByText("detail:u1")).toBeDefined());
  });
  it("빈 목록 안내", async () => {
    listMock.mockResolvedValue(page([]));
    renderManager();
    await waitFor(() => expect(screen.getByText("조회된 회원이 없습니다.")).toBeDefined());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/admin/members/MemberManager.test.tsx`
Expected: FAIL — import 해결 실패.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/admin/members/MemberManager.tsx
"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { adminKeys } from "@/lib/admin/queryKeys";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { formatDate } from "@/lib/date";
import { listMembers, type MemberCardResponse, type MemberListParams } from "@/lib/api/members.admin";
import { AgreementResetPanel } from "./AgreementResetPanel";
import { MemberDetailDialog } from "./MemberDetailDialog";

export function MemberManager() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const params: MemberListParams = {
    q: searchParams.get("q") || undefined,
    page: Number(searchParams.get("page") ?? "0") || 0,
  };
  const members = useQuery({
    queryKey: adminKeys.list("members", params),
    queryFn: () => listMembers(params),
    retry: false,
  });
  useEffect(() => {
    if (members.isError) adminOnError()(members.error);
  }, [members.isError, members.error]);

  const [qInput, setQInput] = useState(searchParams.get("q") ?? "");
  const [selected, setSelected] = useState<string | null>(null);

  // 검색·필터 변경 시 page 리셋하며 URL 갱신(Pagination이 URL 구동 — page는 URL에 둔다).
  function setParam(key: string, value: string | undefined) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  const columns: Column<MemberCardResponse>[] = [
    { key: "name", header: "이름", cell: (m) => m.name },
    { key: "phone", header: "전화", cell: (m) => m.phone, className: cn(typo.datetime) },
    { key: "position", header: "직분", cell: (m) => m.position || "—", className: "hidden sm:table-cell" },
    { key: "roles", header: "역할", cell: (m) => (m.roles.length ? <span className="flex flex-wrap gap-xxs">{m.roles.map((r) => <Badge key={r}>{r}</Badge>)}</span> : "—"), className: "hidden md:table-cell" },
    { key: "approved", header: "승인", cell: (m) => <Badge variant={m.approved ? "primary" : "default"}>{m.approved ? "승인" : "대기"}</Badge> },
    { key: "createdAt", header: "가입일", cell: (m) => formatDate(m.createdAt), className: cn(typo.datetime, "hidden sm:table-cell") },
  ];

  return (
    <div className="flex flex-col gap-xl">
      <AgreementResetPanel />
      <div className="flex flex-col gap-base">
        <form onSubmit={(e) => { e.preventDefault(); setParam("q", qInput.trim() || undefined); }} className="flex items-start gap-xs">
          <Input aria-label="이름 또는 전화번호 검색" placeholder="이름 또는 전화번호" value={qInput} onChange={(e) => setQInput(e.target.value)} />
          <Button type="submit" variant="secondary">검색</Button>
        </form>
        <DataTable
          columns={columns}
          rows={members.data?.content ?? []}
          rowKey={(m) => m.uuid}
          loading={members.isPending}
          empty={<EmptyState message="조회된 회원이 없습니다." />}
          actions={(m) => (
            <Button type="button" variant="tertiary" aria-label={`${m.name} 상세`} onClick={() => setSelected(m.uuid)}>상세</Button>
          )}
        />
        {members.data && members.data.page.totalPages > 1 ? <Pagination page={members.data.page} /> : null}
      </div>
      <MemberDetailDialog uuid={selected} open={selected !== null} onOpenChange={(v) => { if (!v) setSelected(null); }} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/admin/members/MemberManager.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/members/MemberManager.tsx src/components/admin/members/MemberManager.test.tsx
git commit -m "feat: 회원 관리 매니저(검색·목록·상세 배선)"
```

---

## Task 12: 라우트 (`page.tsx`)

**Files:**
- Create: `src/app/(site)/mypage/manage/members/page.tsx`

**Interfaces:**
- Consumes: `Container`(@/components/shell/Container), `RequirePermission`, `EditAccessDenied`(@/components/admin/EditGate), `MemberManager`(Task 11).
- Produces: 라우트 `/mypage/manage/members`.

> `MemberManager`가 `useSearchParams`를 쓰므로 정적 프리렌더 빌드를 위해 `Suspense` 경계 필수(media page 선례). 부모 `manage/layout`이 로그인 가드, 여기서 `MEMBER_MANAGE` 게이트.

- [ ] **Step 1: Write the route**

```tsx
// src/app/(site)/mypage/manage/members/page.tsx
import { Suspense } from "react";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { MemberManager } from "@/components/admin/members/MemberManager";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 운영 전용 화면(manage-hub → kind:"manage"). 부모 manage/layout이 로그인 가드, 여기서 MEMBER_MANAGE 게이트.
export default function ManageMembersPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>회원 관리</h1>
      <div className="mt-xl">
        <RequirePermission permission="MEMBER_MANAGE" fallback={<EditAccessDenied />}>
          {/* MemberManager는 useSearchParams 사용 → 정적 프리렌더 빌드 위해 Suspense 경계 필수(media/page 선례) */}
          <Suspense fallback={null}>
            <MemberManager />
          </Suspense>
        </RequirePermission>
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: Verify build·types·lint green**

Run: `npx tsc --noEmit && pnpm lint && pnpm build`
Expected: 타입 0 · lint 0 · 빌드 성공(`/mypage/manage/members` 라우트 생성).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(site)/mypage/manage/members/page.tsx"
git commit -m "feat: 회원 관리 라우트(/mypage/manage/members)"
```

---

## Final Verification

- [ ] **전체 스위트·타입·린트 게이트**

Run: `pnpm test && npx tsc --noEmit && pnpm lint`
Expected: 전체 테스트 통과(신규 ~28 케이스 포함) · 타입 0 · lint 0. 커버리지 80%+.

- [ ] **수동 점검(선택, dev 서버)**

`pnpm dev` 후 `MEMBER_MANAGE` 보유 계정으로 `/mypage/manage/members` 진입 — 목록·검색(URL `?q=`)·상세 다이얼로그(정보 수정·역할 부여/회수·비번 초기화)·약관 리셋 확인. `MEMBER_MANAGE` 미보유 계정은 `EditAccessDenied` 노출.

- [ ] **커밋 그룹핑(사용자 요청 시)**

마이크로 커밋을 기능 단위(데이터/가드/스키마 · 컴포넌트 · 라우트)로 squash. Co-Authored-By 금지.
