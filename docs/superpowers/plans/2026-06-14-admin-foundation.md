# 어드민 기반 인프라 (01-core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 어드민 트랙 02~07이 공유할 공통 토대(권한 게이트·쓰기 헬퍼·오류 매핑·삭제 다이얼로그·관리 허브)를 기존 자산을 확장해 구축한다.

**Architecture:** 신규 코드는 `src/lib/admin/`·`src/components/admin/`로 격리한다. 어드민 쓰기는 `apiMutate`(JSON) + 공용 `adminOnError` 핸들러 + 도메인별 `useMutation`(접근 C). 권한 게이팅은 `useMe()` 라이브 `permissions` 단일 기준. 프리미티브(DataTable·MarkdownEditor·TagMultiSelect·DateTimePicker·MediaUploader)는 첫 소비 도메인으로 이연한다.

**Tech Stack:** Next.js 16 App Router, TypeScript, TanStack Query v5, react-hook-form+zod, Radix(shadcn 재스킨), sonner, vitest+RTL+jsdom.

**커밋 정책:** 프로젝트 규칙상 커밋은 사용자 명시 요청 시에만. 각 Task는 테스트 통과까지만 하고, 커밋 step은 두지 않는다. 전 Task 완료·검증 후 사용자 요청 시 일괄 커밋한다.

**스펙:** `docs/superpowers/specs/2026-06-14-admin-foundation-design.md`

---

## File Structure

신규/수정 파일과 책임:

| 파일 | 책임 | 신규/수정 |
|---|---|---|
| `src/lib/auth/handleApiError.ts` | errorCode 분기에 5종 추가 | 수정 |
| `src/lib/auth/handleApiError.test.ts` | default→case 전환 테스트 갱신 + 신규 5종 | 수정 |
| `src/lib/admin/apiMutate.ts` | JSON 쓰기 헬퍼(204 처리) | 신규 |
| `src/lib/admin/apiMutate.test.ts` | apiMutate 테스트 | 신규 |
| `src/lib/admin/queryKeys.ts` | `adminKeys` 쿼리키 규약 | 신규 |
| `src/lib/admin/queryKeys.test.ts` | 키 형태 테스트 | 신규 |
| `src/lib/admin/mutationHandlers.ts` | `adminOnError`·`isOptimisticLockConflict` | 신규 |
| `src/lib/admin/mutationHandlers.test.ts` | 핸들러 테스트 | 신규 |
| `src/lib/auth/useMe.ts` | `useHasPermission`(별칭)·`useHasAnyPermission` 추가 | 수정 |
| `src/lib/auth/useMe.test.tsx` | 신규 훅 테스트 | 수정 |
| `src/components/admin/RequirePermission.tsx` | 권한 게이트 컴포넌트 | 신규 |
| `src/components/admin/RequirePermission.test.tsx` | 게이트 테스트 | 신규 |
| `src/components/admin/DeleteConfirmDialog.tsx` | 삭제 확인 다이얼로그 | 신규 |
| `src/components/admin/DeleteConfirmDialog.test.tsx` | 다이얼로그 테스트 | 신규 |
| `src/lib/admin/manageDomains.ts` | 도메인↔권한↔경로 매핑 상수 | 신규 |
| `src/components/mypage/ManageHub.tsx` | 관리 허브 섹션 | 신규 |
| `src/components/mypage/ManageHub.test.tsx` | 허브 테스트 | 신규 |
| `src/app/(site)/mypage/manage/layout.tsx` | 로그인 가드 셸 | 신규 |
| `src/app/(site)/mypage/manage/page.tsx` | `/mypage` 리다이렉트 인덱스 | 신규 |
| `src/components/mypage/MypageContent.tsx` | ManageHub 조립 | 수정 |
| `src/components/mypage/MypageContent.test.tsx` | 허브 노출 검수 | 수정 |
| `.claude/rules/DESIGN.md` | `manage-hub` components 등록 | 수정 |

**테스트 실행 규약:** `pnpm vitest run <파일>` (단일), `pnpm vitest run` (전체). 타입체크 `npx tsc --noEmit`, lint `pnpm lint` (메모리: lint≠tsc). 테스트 관례(메모리 `frontend-test-conventions`): `vitest`에서 `describe/it/expect` 명시 import, jest-dom 없음(`getAttribute`/`toBeNull`/`toBeDefined`), notify는 `vi.mock`.

---

## Task 1: handleApiError errorCode 5종 확장

기존 `handleApiError`는 7종 처리 + default(title 토스트). `ROLE_IN_USE`·`DEPARTMENT_HAS_CHILDREN`·`FILE_SIZE_EXCEEDED`는 사용자 친화 고정 메시지가 필요하다. `FILE_STORAGE_ERROR`·`INTERNAL_ERROR`는 default(서버 title ?? 일반)로 충분하므로 case를 추가하지 않는다 — 단, 의도를 테스트로 고정한다.

기존 테스트 중 두 개가 `ROLE_IN_USE`·`INTERNAL_ERROR`를 "default 분기" 예시로 쓰고 있어, `ROLE_IN_USE` 테스트는 신규 case 동작으로 갱신하고 default 예시는 진짜 미정의 코드로 바꾼다.

**Files:**
- Modify: `src/lib/auth/handleApiError.ts`
- Test: `src/lib/auth/handleApiError.test.ts`

- [ ] **Step 1: 기존 테스트 갱신 + 신규 case 테스트 추가 (RED)**

`src/lib/auth/handleApiError.test.ts`에서 99~101행의 `"미정의 코드(default): title 토스트"` 테스트를 다음으로 교체(미정의 코드를 `ROLE_IN_USE`가 아닌 진짜 미정의 코드로):

```ts
  it("미정의 코드(default): title 토스트", () => {
    handleApiError(err("SOME_UNKNOWN_CODE", { status: 409, title: "알 수 없는 오류" }));
    expect(notify.error).toHaveBeenCalledWith("알 수 없는 오류");
  });
```

그리고 `describe` 블록 끝(137행 `});` 직전)에 신규 case 테스트를 추가:

```ts
  it("ROLE_IN_USE: 고정 안내 토스트", () => {
    handleApiError(err("ROLE_IN_USE", { status: 409 }));
    expect(notify.error).toHaveBeenCalledWith(
      "회원에게 할당된 역할이라 삭제할 수 없습니다.",
    );
  });

  it("DEPARTMENT_HAS_CHILDREN: 고정 안내 토스트", () => {
    handleApiError(err("DEPARTMENT_HAS_CHILDREN", { status: 409 }));
    expect(notify.error).toHaveBeenCalledWith(
      "하위 부서가 있어 삭제할 수 없습니다. 하위 부서를 먼저 정리해 주세요.",
    );
  });

  it("FILE_SIZE_EXCEEDED: 한도 안내 토스트", () => {
    handleApiError(err("FILE_SIZE_EXCEEDED", { status: 413 }));
    expect(notify.error).toHaveBeenCalledWith(
      "파일 용량이 한도를 초과했습니다. 더 작은 파일을 선택해 주세요.",
    );
  });

  it("FILE_STORAGE_ERROR: default 일반 오류 토스트(title 폴백)", () => {
    handleApiError(err("FILE_STORAGE_ERROR", { status: 500, title: "저장 실패" }));
    expect(notify.error).toHaveBeenCalledWith("저장 실패");
  });
```

134~137행의 `"default: title 없으면 기본 메시지"` 테스트는 `INTERNAL_ERROR`를 그대로 두되(여전히 default 동작), 변경 불필요.

- [ ] **Step 2: 테스트 실패 확인 (RED)**

Run: `pnpm vitest run src/lib/auth/handleApiError.test.ts`
Expected: FAIL — `ROLE_IN_USE`/`DEPARTMENT_HAS_CHILDREN`/`FILE_SIZE_EXCEEDED` 신규 테스트가 현재 default(title 또는 "오류가 발생했습니다")를 호출하므로 기대 메시지 불일치로 실패.

- [ ] **Step 3: case 3종 추가 (GREEN)**

`src/lib/auth/handleApiError.ts`의 `case "DUPLICATE_RESOURCE":` 블록(45~48행)과 `default:`(49행) 사이에 추가:

```ts
    case "ROLE_IN_USE":
      notify.error("회원에게 할당된 역할이라 삭제할 수 없습니다.");
      break;
    case "DEPARTMENT_HAS_CHILDREN":
      notify.error("하위 부서가 있어 삭제할 수 없습니다. 하위 부서를 먼저 정리해 주세요.");
      break;
    case "FILE_SIZE_EXCEEDED":
      notify.error("파일 용량이 한도를 초과했습니다. 더 작은 파일을 선택해 주세요.");
      break;
```

`FILE_STORAGE_ERROR`·`INTERNAL_ERROR`는 별도 case 없이 default(`notify.error(error.title ?? "오류가 발생했습니다.")`)가 처리한다.

- [ ] **Step 4: 테스트 통과 확인 (GREEN)**

Run: `pnpm vitest run src/lib/auth/handleApiError.test.ts`
Expected: PASS (전체 그린)

---

## Task 2: apiMutate (JSON 쓰기 헬퍼)

`authFetch`(Response 반환) + `parseJson`(비-2xx면 ApiError throw)을 조합한 얇은 쓰기 헬퍼. `parseJson`은 `res.ok`면 `res.json()`을 직접 호출하므로 **204 No Content(DELETE)에서 빈 본문 파싱 에러**가 난다 → apiMutate가 204를 먼저 가로채 `undefined`를 반환한다.

**Files:**
- Create: `src/lib/admin/apiMutate.ts`
- Test: `src/lib/admin/apiMutate.test.ts`

- [ ] **Step 1: 실패 테스트 작성 (RED)**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiMutate } from "./apiMutate";
import { ApiError } from "@/lib/auth/apiError";
import { useAuthStore } from "@/lib/auth/authStore";

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ accessToken: "a1", refreshToken: "r1", member: null });
});
afterEach(() => vi.unstubAllGlobals());

describe("apiMutate", () => {
  it("2xx + 본문이면 파싱해 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ id: 7, title: "새 설교" }), { status: 201 })),
    );
    const result = await apiMutate<{ id: number; title: string }>("/api/admin/sermons", {
      method: "POST",
      body: { title: "새 설교" },
    });
    expect(result.id).toBe(7);
  });

  it("204면 undefined를 반환한다(빈 본문 파싱 에러 없이)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
    const result = await apiMutate<void>("/api/admin/sermons/7", { method: "DELETE" });
    expect(result).toBeUndefined();
  });

  it("비-2xx면 ApiError를 throw한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ errorCode: "ACCESS_DENIED" }), { status: 403 })),
    );
    await expect(
      apiMutate("/api/admin/sermons", { method: "POST", body: {} }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인 (RED)**

Run: `pnpm vitest run src/lib/admin/apiMutate.test.ts`
Expected: FAIL — `apiMutate`가 존재하지 않음(모듈 해석 실패).

- [ ] **Step 3: 구현 (GREEN)**

```ts
// src/lib/admin/apiMutate.ts
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";

type Method = "POST" | "PUT" | "PATCH" | "DELETE";

// 어드민 JSON 쓰기 공용 헬퍼. authFetch(401 refresh·큐잉) + parseJson(비-2xx → ApiError).
// 204(DELETE 등)는 본문이 없어 parseJson의 res.json()이 빈 본문에 throw하므로 여기서 먼저 처리.
// FormData 업로드는 Content-Type 수동설정 금지라 이 헬퍼를 쓰지 않는다(05 업로더 별도).
export async function apiMutate<T>(
  path: string,
  opts: { method: Method; body?: unknown },
): Promise<T> {
  const res = await authFetch(path, {
    method: opts.method,
    headers: { "Content-Type": "application/json" },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  if (res.status === 204) return undefined as T;
  return parseJson<T>(res);
}
```

- [ ] **Step 4: 테스트 통과 확인 (GREEN)**

Run: `pnpm vitest run src/lib/admin/apiMutate.test.ts`
Expected: PASS

---

## Task 3: adminKeys 쿼리키 규약

어드민 관리 쿼리키를 `"admin"` 네임스페이스로 분리(공개/회원 키와 충돌 방지). 도메인 이슈가 `invalidateQueries({ queryKey: adminKeys.list(domain) })`로 사용.

**Files:**
- Create: `src/lib/admin/queryKeys.ts`
- Test: `src/lib/admin/queryKeys.test.ts`

- [ ] **Step 1: 실패 테스트 작성 (RED)**

```ts
import { describe, it, expect } from "vitest";
import { adminKeys } from "./queryKeys";

describe("adminKeys", () => {
  it("list 키는 admin·domain·list·params 순서다", () => {
    expect(adminKeys.list("sermons", { page: 0 })).toEqual(["admin", "sermons", "list", { page: 0 }]);
  });

  it("list 키는 params 없이도 생성된다", () => {
    expect(adminKeys.list("tags")).toEqual(["admin", "tags", "list", undefined]);
  });

  it("detail 키는 admin·domain·detail·id 순서다", () => {
    expect(adminKeys.detail("sermons", 7)).toEqual(["admin", "sermons", "detail", 7]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인 (RED)**

Run: `pnpm vitest run src/lib/admin/queryKeys.test.ts`
Expected: FAIL — `adminKeys` 없음.

- [ ] **Step 3: 구현 (GREEN)**

```ts
// src/lib/admin/queryKeys.ts
// 어드민 관리 쿼리키 규약. 공개/회원 키(["me"]·["albums",...])와 "admin" prefix로 분리.
export const adminKeys = {
  list: (domain: string, params?: unknown) => ["admin", domain, "list", params] as const,
  detail: (domain: string, id: number | string) => ["admin", domain, "detail", id] as const,
};
```

- [ ] **Step 4: 테스트 통과 확인 (GREEN)**

Run: `pnpm vitest run src/lib/admin/queryKeys.test.ts`
Expected: PASS

---

## Task 4: adminMutationHandlers (onError + 낙관락 판별)

`useMutation`의 `onError`를 통일하는 팩토리. `ApiError`면 `handleApiError`로 위임, 아니면(네트워크 등) 일반 토스트. 낙관락 충돌은 도메인이 분기할 수 있게 판별 헬퍼 제공.

**Files:**
- Create: `src/lib/admin/mutationHandlers.ts`
- Test: `src/lib/admin/mutationHandlers.test.ts`

- [ ] **Step 1: 실패 테스트 작성 (RED)**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/lib/auth/apiError";
import { adminOnError, isOptimisticLockConflict } from "./mutationHandlers";

vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn() } }));
import { notify } from "@/lib/notify";
vi.mock("@/lib/auth/handleApiError", () => ({ handleApiError: vi.fn() }));
import { handleApiError } from "@/lib/auth/handleApiError";

beforeEach(() => vi.clearAllMocks());

describe("adminOnError", () => {
  it("ApiError면 handleApiError로 위임한다", () => {
    const e = new ApiError(403, "ACCESS_DENIED", undefined);
    const handlers = { onReedit: vi.fn() };
    adminOnError(handlers)(e);
    expect(handleApiError).toHaveBeenCalledWith(e, handlers);
    expect(notify.error).not.toHaveBeenCalled();
  });

  it("ApiError가 아니면 일반 네트워크 오류 토스트", () => {
    adminOnError()(new Error("network down"));
    expect(notify.error).toHaveBeenCalledWith(
      "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    );
    expect(handleApiError).not.toHaveBeenCalled();
  });
});

describe("isOptimisticLockConflict", () => {
  it("OPTIMISTIC_LOCK_CONFLICT ApiError면 true", () => {
    expect(isOptimisticLockConflict(new ApiError(409, "OPTIMISTIC_LOCK_CONFLICT", undefined))).toBe(true);
  });
  it("다른 ApiError·일반 오류면 false", () => {
    expect(isOptimisticLockConflict(new ApiError(403, "ACCESS_DENIED", undefined))).toBe(false);
    expect(isOptimisticLockConflict(new Error("x"))).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인 (RED)**

Run: `pnpm vitest run src/lib/admin/mutationHandlers.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현 (GREEN)**

```ts
// src/lib/admin/mutationHandlers.ts
import { ApiError } from "@/lib/auth/apiError";
import { handleApiError, type ApiErrorHandlers } from "@/lib/auth/handleApiError";
import { notify } from "@/lib/notify";

// useMutation onError 통일: ApiError는 errorCode 분기(handleApiError), 그 외는 네트워크 오류 토스트.
export function adminOnError(handlers?: ApiErrorHandlers): (e: unknown) => void {
  return (e: unknown) => {
    if (e instanceof ApiError) handleApiError(e, handlers);
    else notify.error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  };
}

// 낙관락 충돌(가이드 8장) 도메인 분기용 — onReedit로 최신본 재조회를 유도할 때 판별.
export function isOptimisticLockConflict(e: unknown): boolean {
  return e instanceof ApiError && e.errorCode === "OPTIMISTIC_LOCK_CONFLICT";
}
```

- [ ] **Step 4: 테스트 통과 확인 (GREEN)**

Run: `pnpm vitest run src/lib/admin/mutationHandlers.test.ts`
Expected: PASS

---

## Task 5: useHasPermission(별칭) · useHasAnyPermission

기존 `usePermission`(단일)을 `useHasPermission`로도 노출(이름 일관성)하고, 복수 권한용 `useHasAnyPermission`을 추가. 기존 `hasAnyPermission`(permissions.ts) 재사용 — 중복 구현 금지.

**Files:**
- Modify: `src/lib/auth/useMe.ts`
- Test: `src/lib/auth/useMe.test.tsx`

- [ ] **Step 1: 실패 테스트 추가 (RED)**

`src/lib/auth/useMe.test.tsx`의 `import { useMe } from "./useMe";`(5행)를 다음으로 교체:

```ts
import { useMe, useHasPermission, useHasAnyPermission } from "./useMe";
```

그리고 파일 끝(`describe("useMe", ...)` 닫는 `});` 다음)에 추가:

```tsx
function permWrapper(perms: string[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("useHasPermission / useHasAnyPermission", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            uuid: "u1", name: "관리자", phone: "01000000000", email: "", position: "목사",
            roles: ["ADMIN"], permissions: ["SERMON_WRITE", "NOTICE_WRITE"], maxPriority: 100,
            termsAgreed: true, privacyAgreed: true, agreedAt: "2026-01-01T00:00:00",
          }),
          { status: 200 },
        ),
      ),
    );
  });

  it("useHasPermission: 보유 권한이면 true, 미보유면 false", async () => {
    const { result } = renderHook(
      () => ({ a: useHasPermission("SERMON_WRITE"), b: useHasPermission("MEDIA_MANAGE") }),
      { wrapper: permWrapper([]) },
    );
    await waitFor(() => expect(result.current.a).toBe(true));
    expect(result.current.b).toBe(false);
  });

  it("useHasAnyPermission: 하나라도 보유면 true", async () => {
    const { result } = renderHook(
      () => ({
        any: useHasAnyPermission(["MEDIA_MANAGE", "NOTICE_WRITE"]),
        none: useHasAnyPermission(["MEDIA_MANAGE", "ROLE_MANAGE"]),
      }),
      { wrapper: permWrapper([]) },
    );
    await waitFor(() => expect(result.current.any).toBe(true));
    expect(result.current.none).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인 (RED)**

Run: `pnpm vitest run src/lib/auth/useMe.test.tsx`
Expected: FAIL — `useHasPermission`/`useHasAnyPermission` export 없음.

- [ ] **Step 3: 구현 (GREEN)**

`src/lib/auth/useMe.ts`의 import(5행)를 교체:

```ts
import { hasPermission, hasAnyPermission } from "./permissions";
```

그리고 파일 끝(`usePermission` 다음)에 추가:

```ts
// 단일 권한 분기 훅. 기존 usePermission과 동일 동작 — 이름 일관성용 별칭.
export const useHasPermission = usePermission;

// 복수 권한 분기 훅(하나라도 보유 시 true). 컴포넌트 게이트는 RequirePermission, 로직 분기는 이 훅.
export function useHasAnyPermission(perms: string[]): boolean {
  const { data } = useMe();
  return hasAnyPermission(perms, data);
}
```

- [ ] **Step 4: 테스트 통과 확인 (GREEN)**

Run: `pnpm vitest run src/lib/auth/useMe.test.tsx`
Expected: PASS

---

## Task 6: RequirePermission 게이트 컴포넌트

`useMe()`를 1회 구독해 단일(`permission`) 또는 복수(`perms`+`mode`) 권한을 판정. 로딩 중·미보유 시 `fallback`(기본 null). 보안 경계가 아니라 UX 게이트(서버 2단 방어 존재).

**Files:**
- Create: `src/components/admin/RequirePermission.tsx`
- Test: `src/components/admin/RequirePermission.test.tsx`

- [ ] **Step 1: 실패 테스트 작성 (RED)**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RequirePermission } from "./RequirePermission";

vi.mock("@/lib/auth/useMe", () => ({ useMe: vi.fn() }));
import { useMe } from "@/lib/auth/useMe";

const mockMe = (over: Partial<{ data: unknown; isLoading: boolean }>) =>
  (useMe as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: undefined, isLoading: false, ...over });

beforeEach(() => vi.clearAllMocks());

describe("RequirePermission", () => {
  it("권한 보유 시 children 렌더", () => {
    mockMe({ data: { permissions: ["SERMON_WRITE"] } });
    render(<RequirePermission permission="SERMON_WRITE"><button>등록</button></RequirePermission>);
    expect(screen.queryByText("등록")).not.toBeNull();
  });

  it("권한 미보유 시 children 비렌더(fallback 기본 null)", () => {
    mockMe({ data: { permissions: ["GALLERY_VIEW"] } });
    render(<RequirePermission permission="SERMON_WRITE"><button>등록</button></RequirePermission>);
    expect(screen.queryByText("등록")).toBeNull();
  });

  it("로딩 중이면 비렌더(깜빡임 방지)", () => {
    mockMe({ data: undefined, isLoading: true });
    render(<RequirePermission permission="SERMON_WRITE"><button>등록</button></RequirePermission>);
    expect(screen.queryByText("등록")).toBeNull();
  });

  it("perms + mode=any: 하나라도 보유면 렌더", () => {
    mockMe({ data: { permissions: ["NOTICE_WRITE"] } });
    render(
      <RequirePermission perms={["SERMON_WRITE", "NOTICE_WRITE"]} mode="any">
        <button>액션</button>
      </RequirePermission>,
    );
    expect(screen.queryByText("액션")).not.toBeNull();
  });

  it("perms + mode=all: 전부 보유해야 렌더", () => {
    mockMe({ data: { permissions: ["NOTICE_WRITE"] } });
    render(
      <RequirePermission perms={["SERMON_WRITE", "NOTICE_WRITE"]} mode="all">
        <button>액션</button>
      </RequirePermission>,
    );
    expect(screen.queryByText("액션")).toBeNull();
  });

  it("미보유 시 fallback 렌더", () => {
    mockMe({ data: { permissions: [] } });
    render(
      <RequirePermission permission="SERMON_WRITE" fallback={<span>권한 없음</span>}>
        <button>등록</button>
      </RequirePermission>,
    );
    expect(screen.queryByText("권한 없음")).not.toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인 (RED)**

Run: `pnpm vitest run src/components/admin/RequirePermission.test.tsx`
Expected: FAIL — 컴포넌트 없음.

- [ ] **Step 3: 구현 (GREEN)**

```tsx
// src/components/admin/RequirePermission.tsx
"use client";
import type { ReactNode } from "react";
import { useMe } from "@/lib/auth/useMe";
import { hasPermission, hasAnyPermission } from "@/lib/auth/permissions";

interface Props {
  permission?: string;        // 단일 권한
  perms?: string[];           // 복수 권한
  mode?: "all" | "any";       // perms 사용 시, 기본 "any"
  fallback?: ReactNode;       // 미보유 시 렌더(기본 null)
  children: ReactNode;
}

// 권한 게이트(UX 최적화). 판정 소스는 useMe()의 라이브 permissions(토큰 아님 — 가이드 1.5·2.1).
// 보안 경계 아님: 서버가 /api/admin/** 2단 방어. 로딩 중·미보유는 children 비렌더.
export function RequirePermission({ permission, perms, mode = "any", fallback = null, children }: Props) {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <>{fallback}</>;
  const ok = permission
    ? hasPermission(permission, me)
    : perms
      ? mode === "all"
        ? perms.every((p) => hasPermission(p, me))
        : hasAnyPermission(perms, me)
      : false;
  return ok ? <>{children}</> : <>{fallback}</>;
}
```

- [ ] **Step 4: 테스트 통과 확인 (GREEN)**

Run: `pnpm vitest run src/components/admin/RequirePermission.test.tsx`
Expected: PASS

---

## Task 7: DeleteConfirmDialog

`Dialog`(T04) + `Button variant="destructive"`(기존) + `PasswordInput`(기존) 조합. controlled(`open`/`onOpenChange`). `requirePassword` 시 비번 입력·미입력 확정 비활성. 닫을 때 비번 초기화(민감정보).

**Files:**
- Create: `src/components/admin/DeleteConfirmDialog.tsx`
- Test: `src/components/admin/DeleteConfirmDialog.test.tsx`

- [ ] **Step 1: 실패 테스트 작성 (RED)**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

function setup(over: Partial<React.ComponentProps<typeof DeleteConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <DeleteConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="설교를 삭제할까요?"
      onConfirm={onConfirm}
      {...over}
    />,
  );
  return { onConfirm, onOpenChange };
}

describe("DeleteConfirmDialog", () => {
  it("열리면 제목을 표시한다", () => {
    setup();
    expect(screen.queryByText("설교를 삭제할까요?")).not.toBeNull();
  });

  it("확정 버튼 클릭 시 onConfirm 호출(비번 불요)", () => {
    const { onConfirm } = setup({ confirmLabel: "삭제" });
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });

  it("requirePassword: 미입력이면 확정 비활성, 입력 후 password 전달", () => {
    const { onConfirm } = setup({ requirePassword: true, confirmLabel: "탈퇴" });
    const confirm = screen.getByRole("button", { name: "탈퇴" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "pw123456" } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith({ password: "pw123456" });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인 (RED)**

Run: `pnpm vitest run src/components/admin/DeleteConfirmDialog.test.tsx`
Expected: FAIL — 컴포넌트 없음.

- [ ] **Step 3: 구현 (GREEN)**

```tsx
// src/components/admin/DeleteConfirmDialog.tsx
"use client";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  warning?: ReactNode;               // 경고문(파괴적 영향 안내)
  requirePassword?: boolean;         // 위험 작업 — 비밀번호 재인증
  confirmLabel?: string;             // 기본 "삭제"
  pending?: boolean;                 // 진행 중(이중 제출 방지)
  onConfirm: (ctx?: { password?: string }) => void;
}

// 파괴적 확인 모달. 친화 장치는 색이 아니라 경고문 + 선택적 비번 재인증(DESIGN button-destructive).
// 차단형 미디어 삭제(references 노출)는 이 컴포넌트 밖(05).
export function DeleteConfirmDialog({
  open, onOpenChange, title, warning,
  requirePassword = false, confirmLabel = "삭제", pending = false, onConfirm,
}: Props) {
  const [password, setPassword] = useState("");
  const canConfirm = !requirePassword || password.length > 0;

  // 닫을 때 비밀번호 잔존 방지(민감정보).
  const handleOpenChange = (next: boolean) => {
    if (!next) setPassword("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {warning ? <DialogDescription>{warning}</DialogDescription> : null}
        </DialogHeader>
        {requirePassword ? (
          <div className="flex flex-col gap-xxs">
            <label htmlFor="delete-confirm-password" className={cn(typo.bodySm, "text-ink")}>
              비밀번호
            </label>
            <PasswordInput
              id="delete-confirm-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            loading={pending}
            disabled={!canConfirm}
            onClick={() => onConfirm(requirePassword ? { password } : undefined)}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

> 주의: `PasswordInput`이 controlled `value`/`onChange`를 받는지 확인(`src/components/ui/PasswordInput.tsx`). 네이티브 input props를 spread하므로 호환되지만, 만약 `error`만 받고 value 전달이 막혀 있으면 register 대신 native `<input type="password">` + 토글로 대체하지 말고 PasswordInput의 props를 따른다.

- [ ] **Step 4: 테스트 통과 확인 (GREEN)**

Run: `pnpm vitest run src/components/admin/DeleteConfirmDialog.test.tsx`
Expected: PASS

---

## Task 8: manageDomains 상수 + ManageHub

도메인↔권한↔경로 매핑을 한 곳에 정의하고, `/mypage`에 들어갈 관리 허브 섹션을 만든다. 권한 보유 도메인만 카드 노출, 보유 0이면 섹션 비노출.

**Files:**
- Create: `src/lib/admin/manageDomains.ts`
- Create: `src/components/mypage/ManageHub.tsx`
- Test: `src/components/mypage/ManageHub.test.tsx`

- [ ] **Step 1: 매핑 상수 작성 (지원 코드, 테스트 전에 필요)**

```ts
// src/lib/admin/manageDomains.ts
// 관리 허브 진입 카드의 단일 정의. 공개 페이지 있는 도메인(inline)은 그 페이지로,
// 운영 도메인(manage)은 /mypage/manage/* 전용 화면으로 링크.
export interface ManageDomain {
  key: string;
  label: string;
  permission: string;
  href: string;
  kind: "inline" | "manage";
}

export const MANAGE_DOMAINS: ManageDomain[] = [
  { key: "sermons", label: "설교 관리", permission: "SERMON_WRITE", href: "/sermons", kind: "inline" },
  { key: "notices", label: "공지 관리", permission: "NOTICE_WRITE", href: "/notices", kind: "inline" },
  { key: "events", label: "일정 관리", permission: "EVENT_WRITE", href: "/events", kind: "inline" },
  { key: "gallery", label: "갤러리 관리", permission: "GALLERY_WRITE", href: "/gallery", kind: "inline" },
  { key: "bulletins", label: "주보 관리", permission: "BULLETIN_WRITE", href: "/bulletins", kind: "inline" },
  { key: "departments", label: "부서 관리", permission: "DEPT_WRITE", href: "/mypage/manage/departments", kind: "manage" },
  { key: "media", label: "미디어 관리", permission: "MEDIA_MANAGE", href: "/mypage/manage/media", kind: "manage" },
  { key: "tags", label: "태그 관리", permission: "TAG_MANAGE", href: "/mypage/manage/tags", kind: "manage" },
  { key: "positions", label: "직분 관리", permission: "POSITION_MANAGE", href: "/mypage/manage/positions", kind: "manage" },
  { key: "members", label: "회원 관리", permission: "MEMBER_MANAGE", href: "/mypage/manage/members", kind: "manage" },
  { key: "roles", label: "역할·권한 관리", permission: "ROLE_MANAGE", href: "/mypage/manage/roles", kind: "manage" },
];
```

- [ ] **Step 2: 실패 테스트 작성 (RED)**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ManageHub } from "./ManageHub";

vi.mock("@/lib/auth/useMe", () => ({ useMe: vi.fn() }));
import { useMe } from "@/lib/auth/useMe";

const mockMe = (perms: string[] | null, isLoading = false) =>
  (useMe as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data: perms ? { permissions: perms } : undefined,
    isLoading,
  });

beforeEach(() => vi.clearAllMocks());

describe("ManageHub", () => {
  it("보유 권한 도메인 카드만 노출한다", () => {
    mockMe(["SERMON_WRITE"]);
    render(<ManageHub />);
    expect(screen.queryByText("설교 관리")).not.toBeNull();
    expect(screen.queryByText("공지 관리")).toBeNull();
    expect(screen.queryByText("역할·권한 관리")).toBeNull();
  });

  it("관리 권한이 하나도 없으면 섹션 자체를 렌더하지 않는다", () => {
    mockMe(["GALLERY_VIEW"]);
    const { container } = render(<ManageHub />);
    expect(container.querySelector("section")).toBeNull();
  });

  it("로딩 중이면 렌더하지 않는다", () => {
    mockMe(null, true);
    const { container } = render(<ManageHub />);
    expect(container.querySelector("section")).toBeNull();
  });
});
```

- [ ] **Step 3: 테스트 실패 확인 (RED)**

Run: `pnpm vitest run src/components/mypage/ManageHub.test.tsx`
Expected: FAIL — 컴포넌트 없음.

- [ ] **Step 4: 구현 (GREEN)**

```tsx
// src/components/mypage/ManageHub.tsx
"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { useMe } from "@/lib/auth/useMe";
import { hasPermission, hasAnyPermission } from "@/lib/auth/permissions";
import { MANAGE_DOMAINS } from "@/lib/admin/manageDomains";

// 마이페이지 관리 허브: 보유 권한 도메인만 카드로. 관리 권한 0이면 섹션 비노출.
// 공개 도메인 카드는 해당 공개 페이지(인라인 액션), 운영 도메인은 /mypage/manage/*로 이동.
export function ManageHub() {
  const { data: me, isLoading } = useMe();
  if (isLoading) return null;
  const allPerms = MANAGE_DOMAINS.map((d) => d.permission);
  if (!hasAnyPermission(allPerms, me)) return null;
  const visible = MANAGE_DOMAINS.filter((d) => hasPermission(d.permission, me));
  return (
    <section className="flex flex-col gap-md">
      <h2 className={cn(typo.titleMd, "text-ink")}>관리</h2>
      <ul className="grid grid-cols-1 gap-sm sm:grid-cols-2">
        {visible.map((d) => (
          <li key={d.key}>
            <Link
              href={d.href}
              className={cn(
                typo.bodyMd,
                "flex rounded-xl border border-hairline bg-surface-card p-base text-ink transition-colors hover:border-primary",
              )}
            >
              {d.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인 (GREEN)**

Run: `pnpm vitest run src/components/mypage/ManageHub.test.tsx`
Expected: PASS

---

## Task 9: /mypage/manage 레이아웃 + 인덱스 리다이렉트

운영 도메인 전용 화면의 부모 라우트. 레이아웃은 로그인 가드만(도메인 권한은 각 page의 RequirePermission). 인덱스는 허브가 단일 진입점이므로 `/mypage`로 리다이렉트.

**Files:**
- Create: `src/app/(site)/mypage/manage/layout.tsx`
- Create: `src/app/(site)/mypage/manage/page.tsx`

- [ ] **Step 1: 레이아웃 구현 (로그인 가드)**

```tsx
// src/app/(site)/mypage/manage/layout.tsx
"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/authStore";

// 관리 영역 부모. 로그인 가드만(비로그인 → 로그인). 도메인별 권한 게이트는 각 page의 <RequirePermission>.
export default function ManageLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const s = useAuthStore.getState();
    if (!s.member || !s.accessToken) router.replace("/login?next=/mypage/manage");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children}</>;
}
```

- [ ] **Step 2: 인덱스 리다이렉트 구현**

```tsx
// src/app/(site)/mypage/manage/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 관리 허브가 단일 진입점이므로 /mypage/manage 직접 진입은 /mypage로 보낸다.
export default function ManageIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/mypage");
  }, [router]);
  return null;
}
```

- [ ] **Step 3: 타입체크·lint 통과 확인**

Run: `npx tsc --noEmit && pnpm lint`
Expected: 에러 없음. (라우트는 런타임 가드라 단위 테스트 대신 타입·lint로 검증. 동작은 Task 11 빌드에서 확인.)

---

## Task 10: MypageContent에 ManageHub 조립

`/mypage` 성공 블록에 관리 허브 섹션을 추가. 기존 마이페이지 검수 테스트에 "권한 보유 시 허브 노출" 케이스를 더한다.

**Files:**
- Modify: `src/components/mypage/MypageContent.tsx`
- Test: `src/components/mypage/MypageContent.test.tsx`

- [ ] **Step 1: 실패 테스트 추가 (RED)**

`src/components/mypage/MypageContent.test.tsx`는 `vi.hoisted`로 `useMeMock`을 만들고 `vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }))`로 모킹하며, 모듈 상수 `me`의 `permissions = []`이 기본값이다. `ManageHub`도 같은 `@/lib/auth/useMe`를 쓰므로 이 모킹을 공유한다(별도 mock 불요). `describe("MypageContent", ...)` 블록 끝(81행 `});` 직전)에 추가:

```tsx
  it("관리 권한 보유 회원에게 관리 허브가 노출된다", () => {
    useMeMock.mockReturnValue({
      data: { ...me, permissions: ["SERMON_WRITE"] },
      isPending: false,
      isError: false,
      refetch,
    });
    renderContent();
    expect(screen.getByText("관리")).toBeDefined();
    expect(screen.getByText("설교 관리")).toBeDefined();
  });

  it("관리 권한이 없으면 관리 허브가 노출되지 않는다", () => {
    renderContent(); // beforeEach 기본 me.permissions = []
    expect(screen.getByRole("heading", { level: 1, name: "마이페이지" })).toBeDefined();
    expect(screen.queryByText("관리")).toBeNull();
  });
```

> `getByText("관리")`는 기본 exact 매칭이라 카드 라벨("설교 관리" 등)과 겹치지 않는다(허브 `<h2>관리</h2>`만 매칭). `ManageHub`는 `isLoading`만 체크하므로 `mockReturnValue`에 `isLoading`이 없어도(undefined=falsy) 정상 렌더된다.

- [ ] **Step 2: 테스트 실패 확인 (RED)**

Run: `pnpm vitest run src/components/mypage/MypageContent.test.tsx`
Expected: FAIL — 허브("관리" 헤딩)가 아직 렌더되지 않음.

- [ ] **Step 3: ManageHub 조립 (GREEN)**

`src/components/mypage/MypageContent.tsx`에 import 추가(19행 `import { WithdrawDialog }` 다음):

```tsx
import { ManageHub } from "./ManageHub";
```

성공 블록의 `<Reveal delay={120}>...</Reveal>`(63~68행) 다음에 허브 Reveal을 삽입:

```tsx
            <Reveal delay={180}>
              <ManageHub />
            </Reveal>
```

(기존 로그아웃/탈퇴 `<Reveal delay={240}>`는 그대로 둔다.)

- [ ] **Step 4: 테스트 통과 확인 (GREEN)**

Run: `pnpm vitest run src/components/mypage/MypageContent.test.tsx`
Expected: PASS

---

## Task 11: DESIGN.md manage-hub 등록 + 최종 검증

신규 공용 컴포넌트는 DESIGN.md `components`에 등록 후 사용(규칙 4). `manage-hub`만 추가(삭제 다이얼로그는 기존 `button-destructive`+Dialog 조합이라 신규 등록 불요).

**Files:**
- Modify: `.claude/rules/DESIGN.md`

- [ ] **Step 1: DESIGN.md에 manage-hub 항목 추가**

`.claude/rules/DESIGN.md`의 `### 폼` 섹션 또는 `## 컴포넌트 (Components)` 블록 적절한 위치에 추가:

```markdown
- **`manage-hub`**: 마이페이지 관리 허브 섹션. `useMe().permissions` 기준 권한 보유 도메인만 카드로 노출(보유 0이면 섹션 비노출). 카드 = `{rounded.xl}`(24px) + 1px 헤어라인, hover 시 보더 primary 전이. 공개 도메인 카드는 해당 공개 페이지로, 운영 도메인은 `/mypage/manage/*`로 링크. 어드민 화면이라 가독성 우선 단순 변형이되 토큰 공유(hex·px 인라인 금지).
```

- [ ] **Step 2: 전체 테스트·타입·lint·빌드 검증**

Run: `pnpm vitest run`
Expected: 전체 PASS

Run: `npx tsc --noEmit`
Expected: 타입 에러 0

Run: `pnpm lint`
Expected: lint 에러 0

Run: `pnpm build`
Expected: 빌드 성공(`/mypage/manage` 라우트 포함). 백엔드 없는 CI 환경이면 공개 페이지 ISR은 `connection()` 처리에 의존 — 본 작업은 회원 영역(클라이언트)이라 영향 없음.

- [ ] **Step 3: 수동 동작 확인(선택)**

`pnpm dev` 후 관리 권한 보유 계정으로 `/mypage` 진입 → "관리" 섹션·보유 도메인 카드 노출 확인, `/mypage/manage` 직접 진입 → `/mypage` 리다이렉트 확인.

---

## Self-Review (작성자 체크 결과)

**스펙 커버리지:** 게이트(Task 5·6) · apiMutate(2) · 핸들러+낙관락(4) · 쿼리키(3) · errorCode 확장(1) · 삭제 다이얼로그(7) · 관리 허브+manage 스캐폴드(8·9·10) · DESIGN 등록(11) — 스펙 8개 포함 항목 전부 매핑됨. 이연 항목(DataTable·MarkdownEditor·TagMultiSelect·DateTimePicker·MediaUploader·인라인 액션 첫 실증)은 의도적으로 비범위.

**스펙 교정 반영:** apiMutate 204 직접 처리(parseJson 빈본문 방어는 비-2xx 한정 — 스펙 본문 정정), handleApiError는 3종 명시 case + 2종 default 충분(기존 테스트가 ROLE_IN_USE/INTERNAL_ERROR를 default로 검증 중이라 ROLE_IN_USE 테스트 갱신·default 예시는 미정의 코드로 치환).

**타입 일관성:** `apiMutate<T>(path, {method, body})`, `adminOnError(handlers?)`, `isOptimisticLockConflict(e)`, `adminKeys.list/detail`, `useHasAnyPermission(perms)`, `RequirePermission({permission|perms,mode,fallback})`, `DeleteConfirmDialog({open,onOpenChange,title,warning,requirePassword,confirmLabel,pending,onConfirm})`, `MANAGE_DOMAINS`/`ManageDomain` — Task 간 시그니처 일치 확인.

**플레이스홀더:** 없음. Task 10은 실제 모킹 구조(`vi.hoisted` `useMeMock`·모듈 상수 `me.permissions`·`renderContent`)를 반영해 구체화 완료. 모든 Task가 정확한 파일 경로·삽입 위치·완전한 코드 블록·실행 명령·기대 결과를 갖춘다.
