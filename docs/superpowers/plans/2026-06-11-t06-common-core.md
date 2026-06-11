# T06 공통 코어 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전 도메인이 공유하는 응답 봉투 타입·errorCode→UI 라우터·페이지네이션/태그필터·마크다운 렌더·날짜 파서를 TDD로 구현한다.

**Architecture:** T05의 `ApiError`/`parseJson`/`notify` 위에 쌓는다. 에러 봉투를 7필드 완전체로 확장하고, 핸들러 주입+토스트 폴백 라우터를 추가한다. 순수 유틸(page·markdown·date)과 표현형 공통 컴포넌트(Pagination·TagFilter·EmptyState·Skeleton·MarkdownContent)를 분리한다. 마크다운은 `marked`+`isomorphic-dompurify`(서버/클라 자동), raw HTML은 allowlist로 제거한다.

**Tech Stack:** Next.js 16.2.9(App Router) · TypeScript · vitest(jsdom) · @testing-library/react · marked · isomorphic-dompurify · Tailwind v4

**Spec:** `docs/superpowers/specs/2026-06-11-t06-common-core-design.md`

---

## 커밋 정책

프로젝트 규칙상 **커밋은 사용자 명시 요청 시에만** 한다. 각 태스크는 커밋 스텝을 두지 않고 RED→GREEN→체크포인트로 끝낸다. 테스트 실행은 `pnpm test <파일경로>`(= `vitest run <경로>`).

## 파일 구조

| 파일 | 책임 | 신규/수정 |
|---|---|---|
| `src/lib/auth/apiError.ts` | 봉투 서브타입 + `ApiError` 완전체 + `parseJson` 채움 | 수정 |
| `src/lib/auth/handleApiError.ts` | `ApiErrorHandlers` + `handleApiError` | 신규 |
| `src/lib/page.ts` | `Page<T>`·`PageMeta` + `buildListQuery` | 신규 |
| `src/lib/markdown.ts` | `renderMarkdown` (allowlist) | 신규 |
| `src/lib/date.ts` | `parseServerDate` (+09:00) | 신규 |
| `src/components/common/EmptyState.tsx` | 빈 목록 표시 | 신규 |
| `src/components/common/Skeleton.tsx` | 로딩 표시 | 신규 |
| `src/components/common/MarkdownContent.tsx` | `renderMarkdown` 래퍼 + prose | 신규 |
| `src/app/globals.css` | `.prose-church` 블록 | 수정 |
| `src/components/common/Pagination.tsx` | 페이지네이션(Suspense 래핑) | 신규 |
| `src/components/common/TagFilter.tsx` | 태그 필터(Suspense 래핑) | 신규 |
| `docs/church-frontend-guide.md` | 15.1 표에 isomorphic-dompurify 행 | 수정 |

각 `*.test.ts(x)`는 대상 파일과 같은 디렉터리에 둔다(T05 패턴).

---

## Task 1: 의존성 추가 + 가이드 15.1 갱신

**Files:**
- Modify: `package.json` (의존성)
- Modify: `docs/church-frontend-guide.md:1052-1053` (15.1 표)

- [ ] **Step 1: 프로덕션 의존성 설치**

Run:
```bash
pnpm add marked isomorphic-dompurify
```
Expected: `package.json` dependencies에 `marked`·`isomorphic-dompurify` 추가, 설치 성공.

- [ ] **Step 2: 설치 확인**

Run:
```bash
node -e "console.log(require('marked/package.json').version, require('isomorphic-dompurify/package.json').version)"
```
Expected: 두 버전 문자열 출력(에러 없음).

- [ ] **Step 3: 가이드 15.1 표에 행 추가**

`docs/church-frontend-guide.md`에서 마크다운 행(`| 마크다운 | **marked + DOMPurify** | 5.3 파이프라인 그대로. 우회 렌더링 금지 |`) 바로 아래에 추가:

```markdown
| 마크다운 새니타이즈 SSR | **isomorphic-dompurify** | 공개 콘텐츠 상세는 서버 컴포넌트+ISR이라 DOMPurify가 Node에서 실행돼야 함(서버=jsdom·클라=window 자동). DOMPurify config는 마크다운 산출 태그 allowlist로 조여 raw HTML 제거(가이드 5.1·이슈 T06 §7) |
```

- [ ] **Step 4: 빌드로 의존성 해석 확인**

Run: `pnpm build`
Expected: 빌드 성공(새 의존성 import 없이도 통과 — 설치만 검증).

---

## Task 2: 에러 봉투 완전체 확장 (`apiError.ts`)

**Files:**
- Modify: `src/lib/auth/apiError.ts`
- Test: `src/lib/auth/apiError.test.ts` (기존 3개 유지 + 신규)

- [ ] **Step 1: 실패하는 테스트 추가**

`src/lib/auth/apiError.test.ts`의 `describe("parseJson", ...)` 블록 안, 마지막 `it` 뒤에 추가:

```ts
  it("봉투 7필드(title·instance·errors·references)를 모두 채운다", async () => {
    const body = {
      errorCode: "INVALID_INPUT_VALUE",
      title: "유효하지 않은 입력값",
      status: 400,
      detail: "입력값이 유효성 검사를 통과하지 못했습니다",
      instance: "/api/auth/login",
      errors: [{ field: "phone", reason: "전화번호 형식이 올바르지 않습니다" }],
    };
    const res = new Response(JSON.stringify(body), { status: 400 });
    await expect(parseJson(res)).rejects.toMatchObject({
      status: 400,
      errorCode: "INVALID_INPUT_VALUE",
      title: "유효하지 않은 입력값",
      instance: "/api/auth/login",
      errors: [{ field: "phone", reason: "전화번호 형식이 올바르지 않습니다" }],
    });
  });

  it("MEDIA_IN_USE면 references를 채운다", async () => {
    const body = {
      errorCode: "MEDIA_IN_USE",
      title: "미디어 사용 중",
      status: 409,
      detail: "참조 중",
      references: [{ type: "SERMON", id: 7, title: "주일설교" }],
    };
    const res = new Response(JSON.stringify(body), { status: 409 });
    await expect(parseJson(res)).rejects.toMatchObject({
      errorCode: "MEDIA_IN_USE",
      references: [{ type: "SERMON", id: 7, title: "주일설교" }],
    });
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/lib/auth/apiError.test.ts`
Expected: FAIL — 신규 2개는 `title`/`errors`/`references`가 `undefined`라 `toMatchObject` 불일치. 기존 3개는 PASS.

- [ ] **Step 3: 최소 구현 — `apiError.ts` 교체**

`src/lib/auth/apiError.ts` 전체를 다음으로 교체:

```ts
// fetch는 4xx/5xx에 throw하지 않으므로, 비-2xx를 여기서 ApiError로 변환한다.

// RFC 7807 봉투(가이드 4.1 / api-docs ErrorResponse). @JsonInclude(NON_NULL)이라 조건부 키는 빠질 수 있다.
export interface FieldError {
  field: string;
  reason: string;
}
export interface MediaReference {
  type: string;
  id: number;
  title: string;
}
export interface ErrorBody {
  errorCode?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: FieldError[];      // INVALID_INPUT_VALUE 시에만
  references?: MediaReference[]; // MEDIA_IN_USE 시에만
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly errorCode: string | undefined,
    readonly detail: string | undefined,
    readonly title?: string,
    readonly instance?: string,
    readonly errors?: FieldError[],
    readonly references?: MediaReference[],
  ) {
    super(detail ?? title ?? `HTTP ${status}`);
    this.name = "ApiError";
  }
}

export async function parseJson<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  // 본문이 RFC7807 ErrorResponse가 아닐 수도 있어 방어적으로 파싱.
  const body = await res
    .clone()
    .json()
    .catch(() => ({}) as ErrorBody);
  throw new ApiError(
    res.status,
    body.errorCode,
    body.detail,
    body.title,
    body.instance,
    body.errors,
    body.references,
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/lib/auth/apiError.test.ts`
Expected: PASS(기존 3 + 신규 2 = 5개 모두).

- [ ] **Step 5: 회귀 확인(전체 인증 테스트)**

Run: `pnpm test src/lib/auth`
Expected: PASS — 기존 `authApi`/`useMe` 등 ApiError 3-인자 사용처가 깨지지 않음.

---

## Task 3: 에러 라우터 (`handleApiError.ts`)

**Files:**
- Create: `src/lib/auth/handleApiError.ts`
- Test: `src/lib/auth/handleApiError.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/auth/handleApiError.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "./apiError";
import { handleApiError } from "./handleApiError";

// notify는 'use client'(sonner) — 토스트 부수효과를 모킹으로 격리.
vi.mock("@/lib/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));
import { notify } from "@/lib/notify";

const err = (code: string, extra: Partial<ApiError> = {}) =>
  new ApiError(
    extra.status ?? 400,
    code,
    extra.detail,
    extra.title,
    undefined,
    extra.errors,
    extra.references,
  );

beforeEach(() => vi.clearAllMocks());

describe("handleApiError", () => {
  it("AUTHENTICATION_FAILED: onAuthFailed 없으면 토스트 폴백", () => {
    handleApiError(err("AUTHENTICATION_FAILED"));
    expect(notify.error).toHaveBeenCalledWith(
      "전화번호 또는 비밀번호가 올바르지 않습니다.",
    );
  });

  it("AUTHENTICATION_FAILED: onAuthFailed 제공 시 콜백 호출(토스트 안 함)", () => {
    const onAuthFailed = vi.fn();
    handleApiError(err("AUTHENTICATION_FAILED"), { onAuthFailed });
    expect(onAuthFailed).toHaveBeenCalledWith(
      "전화번호 또는 비밀번호가 올바르지 않습니다.",
    );
    expect(notify.error).not.toHaveBeenCalled();
  });

  it("INVALID_TOKEN: 핸들러 있으면 리다이렉트", () => {
    const onRedirectToLogin = vi.fn();
    handleApiError(err("INVALID_TOKEN", { status: 401 }), { onRedirectToLogin });
    expect(onRedirectToLogin).toHaveBeenCalledOnce();
    expect(notify.error).not.toHaveBeenCalled();
  });

  it("INVALID_TOKEN: 핸들러 없으면 토스트 폴백(침묵 금지)", () => {
    handleApiError(err("INVALID_TOKEN", { status: 401 }));
    expect(notify.error).toHaveBeenCalledWith(
      "세션이 만료되었습니다. 다시 로그인해 주세요.",
    );
  });

  it("ACCESS_DENIED: detail 토스트", () => {
    handleApiError(err("ACCESS_DENIED", { status: 403, detail: "위계 위반" }));
    expect(notify.error).toHaveBeenCalledWith("위계 위반");
  });

  it("INVALID_INPUT_VALUE: errors 있고 onFieldErrors 있으면 필드 인라인", () => {
    const onFieldErrors = vi.fn();
    const errors = [{ field: "phone", reason: "형식 오류" }];
    handleApiError(err("INVALID_INPUT_VALUE", { errors }), { onFieldErrors });
    expect(onFieldErrors).toHaveBeenCalledWith(errors);
    expect(notify.error).not.toHaveBeenCalled();
  });

  it("INVALID_INPUT_VALUE: errors 없으면 detail 토스트", () => {
    handleApiError(err("INVALID_INPUT_VALUE", { detail: "본문 파싱 실패" }), {
      onFieldErrors: vi.fn(),
    });
    expect(notify.error).toHaveBeenCalledWith("본문 파싱 실패");
  });

  it("MEDIA_IN_USE: onMediaReferences로 참조 전달", () => {
    const onMediaReferences = vi.fn();
    const references = [{ type: "SERMON", id: 7, title: "주일설교" }];
    handleApiError(err("MEDIA_IN_USE", { status: 409, references }), {
      onMediaReferences,
    });
    expect(onMediaReferences).toHaveBeenCalledWith(references);
  });

  it("OPTIMISTIC_LOCK_CONFLICT: 토스트 + onReedit", () => {
    const onReedit = vi.fn();
    handleApiError(err("OPTIMISTIC_LOCK_CONFLICT", { status: 409 }), { onReedit });
    expect(notify.error).toHaveBeenCalledOnce();
    expect(onReedit).toHaveBeenCalledOnce();
  });

  it("DUPLICATE_RESOURCE: onDuplicate 콜백", () => {
    const onDuplicate = vi.fn();
    const e = err("DUPLICATE_RESOURCE", { status: 409 });
    handleApiError(e, { onDuplicate });
    expect(onDuplicate).toHaveBeenCalledWith(e);
  });

  it("미정의 코드(default): title 토스트", () => {
    handleApiError(err("ROLE_IN_USE", { status: 409, title: "역할 사용 중" }));
    expect(notify.error).toHaveBeenCalledWith("역할 사용 중");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/lib/auth/handleApiError.test.ts`
Expected: FAIL — `handleApiError`/`handleApiError.ts` 없음.

- [ ] **Step 3: 최소 구현 작성**

`src/lib/auth/handleApiError.ts`:

```ts
import { notify } from "@/lib/notify";
import type { ApiError, FieldError, MediaReference } from "./apiError";

// 컨텍스트 의존 효과(라우터·RHF·모달)는 소비측(T14+)이 콜백으로 주입한다.
// 미제공 콜백은 notify 토스트로 폴백한다(가이드 4.2 / 스펙 D2·D7).
export interface ApiErrorHandlers {
  onFieldErrors?: (errors: FieldError[]) => void;      // INVALID_INPUT_VALUE → RHF setError
  onRedirectToLogin?: () => void;                       // INVALID_TOKEN
  onReedit?: () => void | Promise<void>;                // OPTIMISTIC_LOCK_CONFLICT
  onMediaReferences?: (refs: MediaReference[]) => void; // MEDIA_IN_USE
  onDuplicate?: (error: ApiError) => void;              // DUPLICATE_RESOURCE
  onAuthFailed?: (message: string) => void;             // AUTHENTICATION_FAILED(가입여부 비노출)
}

// 회원·어드민(클라이언트) 흐름 전용 — notify가 client seam이다.
// 공개 서버 페이지의 비-2xx는 notFound()/에러 바운더리가 처리(이 함수 호출 안 함).
export function handleApiError(error: ApiError, handlers: ApiErrorHandlers = {}): void {
  switch (error.errorCode) {
    case "AUTHENTICATION_FAILED": {
      const message = "전화번호 또는 비밀번호가 올바르지 않습니다.";
      if (handlers.onAuthFailed) handlers.onAuthFailed(message);
      else notify.error(message);
      break;
    }
    case "INVALID_TOKEN":
      // 여기 도달 = authFetch가 refresh 실패 후 forceLogout 완료(세션 만료).
      if (handlers.onRedirectToLogin) handlers.onRedirectToLogin();
      else notify.error("세션이 만료되었습니다. 다시 로그인해 주세요.");
      break;
    case "ACCESS_DENIED":
      notify.error(error.detail ?? error.title ?? "접근 권한이 없습니다.");
      break;
    case "INVALID_INPUT_VALUE":
      if (error.errors?.length && handlers.onFieldErrors) handlers.onFieldErrors(error.errors);
      else notify.error(error.detail ?? error.title ?? "입력값을 확인해 주세요.");
      break;
    case "MEDIA_IN_USE":
      if (handlers.onMediaReferences) handlers.onMediaReferences(error.references ?? []);
      else notify.error(error.detail ?? error.title ?? "참조 중이라 삭제할 수 없습니다.");
      break;
    case "OPTIMISTIC_LOCK_CONFLICT":
      notify.error("다른 사용자가 먼저 수정했습니다. 최신 내용을 다시 불러옵니다.");
      void handlers.onReedit?.();
      break;
    case "DUPLICATE_RESOURCE":
      if (handlers.onDuplicate) handlers.onDuplicate(error);
      else notify.error(error.detail ?? error.title ?? "이미 존재하는 값입니다.");
      break;
    default:
      notify.error(error.title ?? "오류가 발생했습니다.");
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/lib/auth/handleApiError.test.ts`
Expected: PASS(11개).

---

## Task 4: 목록 봉투·쿼리 (`page.ts`)

**Files:**
- Create: `src/lib/page.ts`
- Test: `src/lib/page.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/page.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildListQuery } from "./page";

describe("buildListQuery", () => {
  it("page는 0-base로 직렬화", () => {
    expect(buildListQuery({ page: 0 })).toBe("?page=0");
  });

  it("size·sort·tagId 조합", () => {
    expect(buildListQuery({ page: 1, size: 10, sort: "createdAt,desc", tagId: 3 })).toBe(
      "?page=1&size=10&sort=createdAt%2Cdesc&tagId=3",
    );
  });

  it("tagId는 단수 키", () => {
    expect(buildListQuery({ tagId: 7 })).toBe("?tagId=7");
  });

  it("빈 객체면 빈 문자열", () => {
    expect(buildListQuery({})).toBe("");
  });

  it("undefined 필드는 생략(0은 포함)", () => {
    expect(buildListQuery({ page: 0, tagId: undefined })).toBe("?page=0");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/lib/page.test.ts`
Expected: FAIL — `buildListQuery`/`page.ts` 없음.

- [ ] **Step 3: 최소 구현 작성**

`src/lib/page.ts`:

```ts
// Spring PagedModel(VIA_DTO) 직렬화(가이드 3.1). page 하위 키는 정확히 4개.
export interface PageMeta {
  size: number;
  number: number; // 0-base 현재 페이지
  totalElements: number;
  totalPages: number;
}
export interface Page<T> {
  content: T[];
  page: PageMeta;
}

// 표준 목록 쿼리(가이드 3.4): page 0-base, tagId 단수. undefined 필드는 생략한다.
export interface ListQuery {
  page?: number;
  size?: number;
  sort?: string;
  tagId?: number;
}
export function buildListQuery(q: ListQuery): string {
  const sp = new URLSearchParams();
  if (q.page != null) sp.set("page", String(q.page));
  if (q.size != null) sp.set("size", String(q.size));
  if (q.sort) sp.set("sort", q.sort);
  if (q.tagId != null) sp.set("tagId", String(q.tagId));
  const s = sp.toString();
  return s ? `?${s}` : "";
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/lib/page.test.ts`
Expected: PASS(5개).

---

## Task 5: 마크다운 렌더 (`markdown.ts`)

**Files:**
- Create: `src/lib/markdown.ts`
- Test: `src/lib/markdown.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/markdown.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("<script>를 통째로 제거한다", () => {
    const html = renderMarkdown('정상\n\n<script>alert(1)</script>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(1)");
  });

  it("양성 raw HTML(<div>)도 태그를 제거하되 내용은 보존한다", () => {
    const html = renderMarkdown("<div>hello</div>");
    expect(html).not.toContain("<div");
    expect(html).toContain("hello");
  });

  it("마크다운 강조는 보존한다", () => {
    expect(renderMarkdown("**굵게**")).toContain("<strong>굵게</strong>");
  });

  it("media:{id}를 공개 서빙 URL로 치환한다", () => {
    const html = renderMarkdown("![포스터](media:42)");
    expect(html).toContain('src="/api/media/42"');
  });

  it("media:420이 media:42로 오탐되지 않는다(경계)", () => {
    // media:420은 전체가 매칭돼 /api/media/420이 되고, /api/media/42 + 잔여 "0"으로 쪼개지지 않아야 한다.
    const html = renderMarkdown("[링크](media:420)");
    expect(html).toContain("/api/media/420");
    expect(html).not.toContain('/api/media/42"');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/lib/markdown.test.ts`
Expected: FAIL — `renderMarkdown`/`markdown.ts` 없음.

- [ ] **Step 3: 최소 구현 작성**

`src/lib/markdown.ts`:

```ts
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

// 경계 안전: media:42 뒤에 숫자가 이어지면 매칭 안 함(420/421 오탐 방지) — 서버 추적 규약과 동일.
const MEDIA_REF = /media:(\d+)(?!\d)/g;

// 마크다운이 생성하는 태그만 허용. 저자 작성 raw HTML(<div>·<iframe> 등)은 태그가 제거되고(내용은 보존),
// <script>·이벤트 핸들러는 통째 제거된다 → 가이드 5.1 "raw HTML 비허용" + 이슈 §7 "raw HTML 제거" 충족.
const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr",
  "strong", "em", "del", "blockquote", "ul", "ol", "li",
  "a", "img", "code", "pre", "table", "thead", "tbody", "tr", "th", "td",
];
const ALLOWED_ATTR = ["href", "title", "src", "alt"];

export function renderMarkdown(raw: string): string {
  const withUrls = raw.replace(MEDIA_REF, (_, id) => `/api/media/${id}`); // 1) media:{id} → 공개 URL
  const html = marked.parse(withUrls, { async: false }) as string;        // 2) MD → HTML
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });        // 3) 마크다운 태그만 허용(raw HTML 제거)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/lib/markdown.test.ts`
Expected: PASS(5개).

---

## Task 6: 날짜 파서 (`date.ts`)

**Files:**
- Create: `src/lib/date.ts`
- Test: `src/lib/date.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/date.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseServerDate } from "./date";

describe("parseServerDate", () => {
  it("datetime을 KST(+09:00)로 해석한다 — 10:00 KST = 01:00 UTC", () => {
    // getTime()은 런타임 TZ와 무관한 절대 epoch ms → TZ 독립 검증.
    expect(parseServerDate("2026-06-14T10:00:00").getTime()).toBe(
      Date.UTC(2026, 5, 14, 1, 0, 0),
    );
  });

  it("date-only(YYYY-MM-DD)는 KST 자정으로 해석한다", () => {
    expect(parseServerDate("2026-06-14").getTime()).toBe(
      Date.UTC(2026, 5, 13, 15, 0, 0), // 2026-06-14 00:00 KST = 2026-06-13 15:00 UTC
    );
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/lib/date.test.ts`
Expected: FAIL — `parseServerDate`/`date.ts` 없음.

- [ ] **Step 3: 최소 구현 작성**

`src/lib/date.ts`:

```ts
// 서버 datetime은 offset 없는 LocalDateTime("2026-06-14T10:00:00"). JS new Date("...")는 브라우저
// 로컬TZ로 파싱돼 SSR/비KST에서 어긋남 → +09:00 명시 부착 후 파싱(KST 가정, 가이드 15.3 / 백엔드 A).
export function parseServerDate(s: string): Date {
  return /T/.test(s) ? new Date(`${s}+09:00`) : new Date(`${s}T00:00:00+09:00`);
}
```

- [ ] **Step 4: 테스트 통과 확인 (TZ 독립성 포함)**

Run: `pnpm test src/lib/date.test.ts`
Expected: PASS(2개).

Run(다른 TZ에서도 동일 통과): `TZ=America/New_York pnpm test src/lib/date.test.ts`
Expected: PASS(2개) — 절대 ms 비교라 런타임 TZ와 무관.

---

## Task 7: EmptyState 컴포넌트

**Files:**
- Create: `src/components/common/EmptyState.tsx`
- Test: `src/components/common/EmptyState.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/common/EmptyState.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("전달한 메시지를 표시한다", () => {
    render(<EmptyState message="등록된 설교가 없습니다" />);
    expect(screen.getByText("등록된 설교가 없습니다")).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/components/common/EmptyState.test.tsx`
Expected: FAIL — `EmptyState`/파일 없음.

- [ ] **Step 3: 최소 구현 작성**

`src/components/common/EmptyState.tsx`:

```tsx
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface EmptyStateProps {
  /** "등록된 ○○가 없습니다" 패턴 문구 */
  message: string;
  className?: string;
}

// 순수 표시(서버 컴포넌트). 목록 빈 배열(가이드 13.2) 표준 표시.
export function EmptyState({ message, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center py-xxl text-center",
        typo.bodyMd,
        "text-muted",
        className,
      )}
    >
      {message}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/components/common/EmptyState.test.tsx`
Expected: PASS(1개).

---

## Task 8: Skeleton 컴포넌트

**Files:**
- Create: `src/components/common/Skeleton.tsx`
- Test: `src/components/common/Skeleton.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/common/Skeleton.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("펄스 애니메이션 박스를 렌더한다", () => {
    const { container } = render(<Skeleton className="h-10 w-full" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("animate-pulse");
    expect(el.className).toContain("h-10");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/components/common/Skeleton.test.tsx`
Expected: FAIL — 파일 없음.

- [ ] **Step 3: 최소 구현 작성**

`src/components/common/Skeleton.tsx`:

```tsx
import { cn } from "@/lib/utils";

export interface SkeletonProps {
  className?: string;
}

// 순수 표시(서버 컴포넌트). 로딩 자리표시 — surface-strong 펄스, 카드 라운드(md).
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-surface-strong", className)} />;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/components/common/Skeleton.test.tsx`
Expected: PASS(1개).

---

## Task 9: MarkdownContent 컴포넌트 + prose 스타일

**Files:**
- Create: `src/components/common/MarkdownContent.tsx`
- Modify: `src/app/globals.css` (끝에 `.prose-church` 블록 추가)
- Test: `src/components/common/MarkdownContent.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/common/MarkdownContent.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MarkdownContent } from "./MarkdownContent";

describe("MarkdownContent", () => {
  it("마크다운을 렌더하고 prose-church 클래스를 적용한다", () => {
    const { container } = render(<MarkdownContent source="# 제목" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("prose-church");
    expect(root.querySelector("h1")?.textContent).toBe("제목");
  });

  it("<script>는 렌더되지 않는다", () => {
    const { container } = render(
      <MarkdownContent source={'본문\n\n<script>alert(1)</script>'} />,
    );
    expect(container.querySelector("script")).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/components/common/MarkdownContent.test.tsx`
Expected: FAIL — 파일 없음.

- [ ] **Step 3: 컴포넌트 구현**

`src/components/common/MarkdownContent.tsx`:

```tsx
import { renderMarkdown } from "@/lib/markdown";

export interface MarkdownContentProps {
  /** raw 마크다운 본문(sermon.content 등). renderMarkdown이 변환·새니타이즈한다. */
  source: string;
  className?: string;
}

// 순수 표시(서버 컴포넌트 가능) — ISR 시 서버에서 새니타이즈된 HTML을 주입한다.
// 새니타이즈는 renderMarkdown(allowlist)이 책임지므로 dangerouslySetInnerHTML이 안전하다.
export function MarkdownContent({ source, className }: MarkdownContentProps) {
  return (
    <div
      className={className ? `prose-church ${className}` : "prose-church"}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    />
  );
}
```

- [ ] **Step 4: prose 스타일 추가**

`src/app/globals.css` 맨 끝(`@media (prefers-reduced-motion...)` 블록 뒤)에 추가:

```css
/* ============================================================
 * MarkdownContent(T06) — 본문 prose. DESIGN.md body-md(행간 1.7) 기준 커스텀.
 * @tailwindcss/typography(스택 밖) 미사용 — 토큰만 참조.
 * ============================================================ */
.prose-church {
  font-size: var(--text-body-md);
  line-height: var(--text-body-md--line-height);
  color: var(--color-body);
}
.prose-church > * + * {
  margin-top: var(--spacing-base);
}
.prose-church h1,
.prose-church h2,
.prose-church h3 {
  color: var(--color-ink);
  font-weight: 500;
  margin-top: var(--spacing-xl);
  line-height: 1.3;
}
.prose-church h1 { font-size: var(--text-display-md); }
.prose-church h2 { font-size: var(--text-title-lg); }
.prose-church h3 { font-size: var(--text-title-md); }
.prose-church a {
  color: var(--color-primary);
  text-decoration: underline;
}
.prose-church a:hover { color: var(--color-primary-active); }
.prose-church ul,
.prose-church ol {
  padding-left: var(--spacing-lg);
}
.prose-church ul { list-style: disc; }
.prose-church ol { list-style: decimal; }
.prose-church li + li { margin-top: var(--spacing-xs); }
.prose-church blockquote {
  border-left: 3px solid var(--color-hairline);
  padding-left: var(--spacing-base);
  color: var(--color-muted);
}
.prose-church img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-lg);
}
.prose-church code {
  font-size: 0.9em;
  background: var(--color-surface-strong);
  padding: 0 var(--spacing-xxs);
  border-radius: var(--radius-xs);
}
.prose-church pre {
  background: var(--color-surface-soft);
  padding: var(--spacing-base);
  border-radius: var(--radius-md);
  overflow-x: auto;
}
.prose-church pre code { background: transparent; padding: 0; }
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm test src/components/common/MarkdownContent.test.tsx`
Expected: PASS(2개).

---

## Task 10: Pagination 컴포넌트 (Suspense 래핑)

**Files:**
- Create: `src/components/common/Pagination.tsx`
- Test: `src/components/common/Pagination.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/common/Pagination.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// next/navigation·next/link 모킹: 현재 경로/쿼리 고정, Link는 a로 단순화.
vi.mock("next/navigation", () => ({
  usePathname: () => "/sermons",
  useSearchParams: () => new URLSearchParams("tagId=3"),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { pageItems, PaginationControls } from "./Pagination";

describe("pageItems", () => {
  it("7개 이하면 전부 노출", () => {
    expect(pageItems(0, 5)).toEqual([0, 1, 2, 3, 4]);
  });
  it("7개 초과면 말줄임 포함", () => {
    expect(pageItems(5, 10)).toEqual([0, "ellipsis", 4, 5, 6, "ellipsis", 9]);
  });
});

describe("PaginationControls", () => {
  const page = { size: 10, number: 1, totalElements: 95, totalPages: 10 };

  it("page 링크가 기존 쿼리(tagId)를 보존하고 0-base로 교체", () => {
    render(<PaginationControls page={page} />);
    // 표시 '3' = number 2 (0-base). 기존 tagId=3 유지.
    const link = screen.getByRole("link", { name: "3" }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/sermons?tagId=3&page=2");
  });

  it("현재 페이지(number=1, 표시 2)는 aria-current", () => {
    render(<PaginationControls page={page} />);
    const current = screen.getByText("2");
    expect(current.getAttribute("aria-current")).toBe("page");
  });

  it("첫 페이지에서 '이전'은 비활성(링크 아님)", () => {
    render(<PaginationControls page={{ ...page, number: 0 }} />);
    const prev = screen.getByTestId("pagination-prev");
    expect(prev.getAttribute("aria-disabled")).toBe("true");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/components/common/Pagination.test.tsx`
Expected: FAIL — `pageItems`/`PaginationControls`/파일 없음.

- [ ] **Step 3: 최소 구현 작성**

> 구현 직전 `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md` 와 `.../use-pathname.md`, `linking-and-navigating.md`의 `Link` 사용법을 확인한다(AGENTS.md).

`src/components/common/Pagination.tsx`:

```tsx
"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import type { PageMeta } from "@/lib/page";

// 표시할 페이지 토큰 계산(0-base). 7개 초과면 첫·끝 + 현재 주변 + 말줄임.
export function pageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const items: (number | "ellipsis")[] = [0];
  const left = Math.max(1, current - 1);
  const right = Math.min(total - 2, current + 1);
  if (left > 1) items.push("ellipsis");
  for (let i = left; i <= right; i++) items.push(i);
  if (right < total - 2) items.push("ellipsis");
  items.push(total - 1);
  return items;
}

function PaginationControls({ page }: { page: PageMeta }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 기존 쿼리(tagId·sort 등) 보존하며 page만 교체.
  const hrefFor = (n: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(n));
    return `${pathname}?${params.toString()}`;
  };

  const { number, totalPages } = page;
  const isFirst = number <= 0;
  const isLast = number >= totalPages - 1;

  return (
    <nav className={cn("flex items-center justify-center gap-xs", typo.datetime)} aria-label="페이지네이션">
      <Arrow href={hrefFor(number - 1)} disabled={isFirst} dir="prev" />
      {pageItems(number, totalPages).map((it, i) =>
        it === "ellipsis" ? (
          <span key={`e${i}`} className="px-2 text-muted" aria-hidden>
            …
          </span>
        ) : it === number ? (
          <span
            key={it}
            aria-current="page"
            className="inline-flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary"
          >
            {it + 1}
          </span>
        ) : (
          <Link
            key={it}
            href={hrefFor(it)}
            className="inline-flex size-9 items-center justify-center rounded-md text-ink hover:bg-surface-strong"
          >
            {it + 1}
          </Link>
        ),
      )}
      <Arrow href={hrefFor(number + 1)} disabled={isLast} dir="next" />
    </nav>
  );
}

function Arrow({ href, disabled, dir }: { href: string; disabled: boolean; dir: "prev" | "next" }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  const cls = "inline-flex size-9 items-center justify-center rounded-md";
  if (disabled) {
    return (
      <span
        data-testid={`pagination-${dir}`}
        aria-disabled="true"
        className={cn(cls, "text-muted-soft")}
      >
        <Icon size={18} />
      </span>
    );
  }
  return (
    <Link
      data-testid={`pagination-${dir}`}
      href={href}
      aria-label={dir === "prev" ? "이전 페이지" : "다음 페이지"}
      className={cn(cls, "text-ink hover:bg-surface-strong")}
    >
      <Icon size={18} />
    </Link>
  );
}

// 공개 export — useSearchParams가 공개 ISR prerender에서 빌드 실패하지 않도록 Suspense 경계 포함.
export function Pagination({ page }: { page: PageMeta }) {
  return (
    <Suspense fallback={<div className="h-9" aria-hidden />}>
      <PaginationControls page={page} />
    </Suspense>
  );
}

export { PaginationControls };
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/components/common/Pagination.test.tsx`
Expected: PASS(`pageItems` 2개 + `PaginationControls` 3개 = 5개).

---

## Task 11: TagFilter 컴포넌트 (Suspense 래핑)

**Files:**
- Create: `src/components/common/TagFilter.tsx`
- Test: `src/components/common/TagFilter.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/common/TagFilter.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/sermons",
  useSearchParams: () => new URLSearchParams("tagId=3"),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { TagFilterPills } from "./TagFilter";

const tags = [
  { id: 3, name: "주일예배" },
  { id: 5, name: "수요예배" },
];

describe("TagFilterPills", () => {
  it("'전체'는 tagId를 제거한 href", () => {
    render(<TagFilterPills tags={tags} />);
    const all = screen.getByRole("link", { name: "전체" }) as HTMLAnchorElement;
    expect(all.getAttribute("href")).toBe("/sermons");
  });

  it("태그 선택 시 ?tagId= 단수로 재조회(page 리셋)", () => {
    render(<TagFilterPills tags={tags} />);
    const t = screen.getByRole("link", { name: "수요예배" }) as HTMLAnchorElement;
    expect(t.getAttribute("href")).toBe("/sermons?tagId=5");
  });

  it("현재 tagId(3)인 필은 aria-pressed", () => {
    render(<TagFilterPills tags={tags} />);
    const active = screen.getByRole("link", { name: "주일예배" });
    expect(active.getAttribute("aria-pressed")).toBe("true");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/components/common/TagFilter.test.tsx`
Expected: FAIL — `TagFilterPills`/파일 없음.

- [ ] **Step 3: 최소 구현 작성**

`src/components/common/TagFilter.tsx`:

```tsx
"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

// api-docs TagResponse.
export interface Tag {
  id: number;
  name: string;
}

function TagFilterPills({ tags }: { tags: Tag[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("tagId");

  // tagId 교체(또는 제거) + page 리셋. 다른 쿼리(sort 등)는 보존.
  const hrefFor = (tagId: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (tagId == null) params.delete("tagId");
    else params.set("tagId", String(tagId));
    const s = params.toString();
    return s ? `${pathname}?${s}` : pathname;
  };

  const pill = (active: boolean) =>
    cn(
      typo.navLink,
      "inline-flex items-center rounded-pill px-4 py-2 whitespace-nowrap",
      active ? "bg-primary text-on-primary" : "bg-surface-strong text-ink hover:bg-hairline",
    );

  return (
    <div className="flex flex-wrap gap-xs" role="group" aria-label="태그 필터">
      <Link href={hrefFor(null)} aria-pressed={current == null} className={pill(current == null)}>
        전체
      </Link>
      {tags.map((t) => {
        const active = current === String(t.id);
        return (
          <Link key={t.id} href={hrefFor(t.id)} aria-pressed={active} className={pill(active)}>
            {t.name}
          </Link>
        );
      })}
    </div>
  );
}

// 공개 export — useSearchParams Suspense 경계 포함(빌드 게이트).
export function TagFilter({ tags }: { tags: Tag[] }) {
  return (
    <Suspense fallback={<div className="h-10" aria-hidden />}>
      <TagFilterPills tags={tags} />
    </Suspense>
  );
}

export { TagFilterPills };
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/components/common/TagFilter.test.tsx`
Expected: PASS(3개).

---

## Task 12: 전체 검증 (검수 §9)

**Files:** 없음(검증만)

- [ ] **Step 1: 전체 테스트 + 커버리지**

Run: `pnpm test --coverage`
Expected: 모든 테스트 PASS, 신규 파일 statement/branch 커버리지 80%+.

- [ ] **Step 2: 린트**

Run: `pnpm lint`
Expected: 에러 0.

- [ ] **Step 3: 프로덕션 빌드**

Run: `pnpm build`
Expected: 빌드 성공. (Pagination·TagFilter는 Suspense 내부 래핑이라 향후 공개 ISR 페이지에 배치돼도 "Missing Suspense boundary with useSearchParams" 미발생 — 구조적 보장.)

- [ ] **Step 4: 검수 체크리스트 대조**

스펙 §9 항목을 수동 확인:
- [ ] errorCode 분기(필드 인라인/토스트/리다이렉트), INVALID_TOKEN 폴백 → Task 3 테스트 통과
- [ ] `<script>` + raw HTML(`<div>`) 제거, media:420 오탐 없음 → Task 5 테스트 통과
- [ ] 비KST/SSR에서 KST 벽시계 일치 → Task 6 테스트(TZ 독립) 통과
- [ ] 봉투·handleApiError·Pagination·TagFilter·EmptyState·Skeleton·MarkdownContent·parseServerDate 모두 존재 → Task 2~11
- [ ] `pnpm build`·`pnpm lint`·`pnpm test`(80%+) 통과 → Step 1~3

---

## Self-Review 메모(작성자 확인 완료)

- **Spec 커버리지**: D1(isomorphic-dompurify)=T1·T5, D2/D7(핸들러 폴백)=T3, D3(제자리 확장)=T2, D4(prose)=T9, D5(date-fns 미추가)=네이티브 Date(T6), D6(Suspense)=T10·T11. 봉투 7필드=T2, page=T4, markdown allowlist(D8)=T5, parseServerDate=T6, 공통 컴포넌트 5종=T7~T11.
- **타입 일관성**: `PageMeta`/`Page<T>`(T4) → Pagination(T10) 소비. `FieldError`/`MediaReference`/`ApiError`(T2) → handleApiError(T3) 소비. `Tag`(T11) = api-docs TagResponse. `renderMarkdown`(T5) → MarkdownContent(T9) 소비.
- **플레이스홀더 없음**: 모든 스텝에 실제 코드·명령·기대값 포함.
