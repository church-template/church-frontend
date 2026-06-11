# T06 — 공통 응답 / 에러 / 콘텐츠 코어 (설계 스펙)

**작성일:** 2026-06-11
**이슈:** `.issues/T06-common-core.md`
**선행:** T3, T4, **T5(완료)** — `ApiError`·`parseJson`·`authFetch`·`notify` 위에 쌓는다.
**참조:** 가이드 3·4·5장, 15.1·15.2 / `docs/api-docs.json`(ErrorResponse·ValidationError·ContentRef)

---

## 1. 목적

전 도메인이 공유하는 **응답 봉투 타입 · errorCode→UI 라우터 · 페이지네이션/태그필터 · 마크다운 렌더 · 날짜 파서**를 만든다. UI 도메인 페이지(T14+)와 공개 콘텐츠 페이지가 이 코어를 소비한다.

T06은 **인프라/유틸 레이어**다 — 도메인 데이터 패칭이나 페이지 라우트는 포함하지 않는다.

---

## 2. 확정 결정 (브레인스토밍 결과)

| # | 결정 | 근거 |
|---|---|---|
| D1 | 마크다운 새니타이즈 = **`isomorphic-dompurify`** | 공개 콘텐츠 상세는 서버 컴포넌트+ISR → DOMPurify가 Node에서 실행돼야 함. 서버=jsdom·클라=window 자동 분기. 가이드 15.1이 "표에 추가 후 사용" 허용. |
| D2 | 에러 라우터 = **핸들러 주입 + 토스트 폴백** | redirect·fieldErrors·reedit·references는 라우터·RHF·모달 컨텍스트 필요(T14+ 제공). 미제공 콜백은 `notify` 토스트로 폴백. 단일 초크포인트·테스트 용이. |
| D3 | 에러 코드 **`src/lib/auth/` 제자리 확장** | 동작하는 T05 코드를 옮기지 않는다(최소 blast radius). |
| D4 | `MarkdownContent` prose = **globals.css 커스텀 prose 블록** | `@tailwindcss/typography`(스택 밖) 미도입. DESIGN.md body-md·행간 1.7 토큰 기준. |
| D5 | **date-fns 미추가** | T06 deliverable는 `parseServerDate`(네이티브 Date)뿐. 포맷·캘린더는 소비 태스크 몫(YAGNI). |
| D6 | `Pagination`·`TagFilter`는 **내부 `<Suspense>` 경계 포함 export** | `useSearchParams`가 공개 ISR prerender에서 빌드 실패 유발(next 16.2.9 `use-search-params.md:179`). 소비측이 경계를 잊지 못하게 컴포넌트가 자체 소유. (코드리뷰 P1) |
| D7 | `INVALID_TOKEN`은 **핸들러 없으면 토스트 폴백** | 세션 만료를 침묵 처리하지 않음 — D2(미제공=토스트 폴백) 일관. (코드리뷰 P2) |
| D8 | 마크다운 새니타이즈 = **마크다운 산출 태그 allowlist** | 가이드 5.3 `USE_PROFILES html`은 양성 raw HTML 보존 → 이슈 §7 "raw HTML 제거"와 충돌. 파이프라인은 5.3 유지, config만 조임. (코드리뷰 P3) |

---

## 3. 현행 격차 (왜 지금 필요한가)

T05의 `parseJson`은 봉투에서 **`errorCode`·`detail` 2개만** 캡처한다:

```ts
// 현재: src/lib/auth/apiError.ts
const body = await res.clone().json().catch(() => ({} as { errorCode?: string; detail?: string }));
throw new ApiError(res.status, body.errorCode, body.detail);
// → title · instance · errors[] · references[] 유실
```

실제 백엔드 봉투(`docs/api-docs.json` `ErrorResponse`)는 7필드다:

```jsonc
{
  "errorCode": "INVALID_INPUT_VALUE",   // 분기 키 (UPPER_SNAKE)
  "title": "유효하지 않은 입력값",        // 표시용 한글
  "status": 400,
  "detail": "입력값이 유효성 검사를 통과하지 못했습니다",
  "instance": "/api/auth/login",        // 요청 경로
  "errors":     [ { "field": "phone", "reason": "..." } ],  // ValidationError[] — 검증 실패 시에만
  "references": [ { "type": "...", "id": 0, "title": "..." } ] // ContentRef[] — MEDIA_IN_USE 시에만
}
```

- `@JsonInclude(NON_NULL)` + 가이드 4.1: **`errors`와 `references`는 함께 오지 않는다**(Swagger 예시는 스키마라 둘 다 렌더될 뿐).
- 현행으론 `INVALID_INPUT_VALUE`의 필드 인라인도, `MEDIA_IN_USE`의 참조 링크도 만들 수 없다 → **T06이 봉투를 완전체로 확장**한다.

---

## 4. 모듈 구조

```
src/lib/
  auth/apiError.ts       [확장]  FieldError·MediaReference + ApiError 완전체 + parseJson 채움
  auth/handleApiError.ts [신규]  ApiErrorHandlers + handleApiError(error, handlers?)
  page.ts                [신규]  Page<T>·PageMeta + buildListQuery
  markdown.ts            [신규]  renderMarkdown
  date.ts                [신규]  parseServerDate
src/components/common/
  Pagination.tsx         [신규]  'use client' — page 봉투, ?page= 동기화, 7개 초과 말줄임
  TagFilter.tsx          [신규]  'use client' — 필 버튼, ?tagId= 단수, "전체"=tagId 제거
  EmptyState.tsx         [신규]  순수 — "등록된 ○○가 없습니다"
  Skeleton.tsx           [신규]  순수 — 로딩 표시
  MarkdownContent.tsx    [신규]  순수(서버 렌더 OK) — renderMarkdown 래퍼 + prose
src/app/globals.css      [확장]  커스텀 prose 스타일 블록
docs/church-frontend-guide.md [확장] 15.1 표에 isomorphic-dompurify 행 추가
```

**의존 방향(순환 없음):** `handleApiError → apiError, notify` · `Pagination/TagFilter → page, next/navigation` · `MarkdownContent → markdown`.

---

## 5. 컴포넌트 명세

### 5.1 에러 봉투 확장 — `src/lib/auth/apiError.ts`

```ts
export interface FieldError { field: string; reason: string }            // ValidationError
export interface MediaReference { type: string; id: number; title: string } // ContentRef

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
  const body = await res.clone().json().catch(() => ({} as Partial<ErrorBody>));
  throw new ApiError(
    res.status, body.errorCode, body.detail,
    body.title, body.instance, body.errors, body.references,
  );
}
```

- optional 인자를 **뒤에** 추가 → 기존 3-인자 호출(`new ApiError(status, code, detail)`)·T05 테스트는 그대로 통과(파괴적 변경 없음).
- `ErrorBody`는 7필드 봉투 타입(내부용).

### 5.2 에러 라우터 — `src/lib/auth/handleApiError.ts` (신규)

```ts
export interface ApiErrorHandlers {
  onFieldErrors?: (errors: FieldError[]) => void;      // INVALID_INPUT_VALUE(errors 있을 때) → RHF setError
  onRedirectToLogin?: () => void;                       // INVALID_TOKEN
  onReedit?: () => void | Promise<void>;                // OPTIMISTIC_LOCK_CONFLICT
  onMediaReferences?: (refs: MediaReference[]) => void; // MEDIA_IN_USE
  onDuplicate?: (error: ApiError) => void;              // DUPLICATE_RESOURCE
  onAuthFailed?: (message: string) => void;             // AUTHENTICATION_FAILED(가입여부 비노출)
}

export function handleApiError(error: ApiError, handlers: ApiErrorHandlers = {}): void {
  switch (error.errorCode) {
    case "AUTHENTICATION_FAILED":
      (handlers.onAuthFailed ?? notify.error)("전화번호 또는 비밀번호가 올바르지 않습니다.");
      break;
    case "INVALID_TOKEN":
      // 여기 도달 = authFetch가 refresh 실패 후 forceLogout 완료(세션 만료). 리다이렉트가 주효과,
      // 핸들러 미제공 시 침묵하지 않고 토스트 폴백(D2 일관). refresh 자체는 authFetch가 선처리(1.6).
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
      notify.error(error.title ?? "오류가 발생했습니다.");  // ROLE_IN_USE/DEPARTMENT_HAS_CHILDREN/413/500 등
  }
}
```

**소비 흐름(클라이언트):**
```ts
try { const data = await parseJson<T>(await authFetch(path, init)); }
catch (e) { if (e instanceof ApiError) handleApiError(e, { onFieldErrors: setError }); else throw e; }
```

- 가이드 4.4가 `Response`를 받아 다시 `json()`하던 부분은 **T05 parseJson과 이중 파싱**이 되므로, 이미 파싱된 `ApiError`를 받는다.
- **client 전용 seam**: `notify`가 `'use client'`(sonner) → 회원·어드민(클라) 흐름 전용. 공개 서버 페이지의 비-2xx는 `notFound()`/에러 바운더리로 처리(§6).
- 분기는 **errorCode로만**(status·title 금지, 가이드 4.2).

### 5.3 목록 봉투·쿼리 — `src/lib/page.ts` (신규)

```ts
export interface PageMeta { size: number; number: number; totalElements: number; totalPages: number } // 정확히 4키
export interface Page<T> { content: T[]; page: PageMeta }

export function buildListQuery(q: { page?: number; size?: number; sort?: string; tagId?: number }): string {
  const sp = new URLSearchParams();
  if (q.page != null) sp.set("page", String(q.page));   // 0-base
  if (q.size != null) sp.set("size", String(q.size));
  if (q.sort) sp.set("sort", q.sort);                    // 예: "createdAt,desc"
  if (q.tagId != null) sp.set("tagId", String(q.tagId)); // 단수(3.4)
  const s = sp.toString();
  return s ? `?${s}` : "";
}
```

### 5.4 마크다운 — `src/lib/markdown.ts` (신규)

```ts
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

const MEDIA_REF = /media:(\d+)(?!\d)/g; // media:420 오탐 방지

// 마크다운이 생성하는 태그만 허용. 저자 작성 raw HTML(<div>·<iframe> 등)은 태그가 제거되고(내용은 보존),
// <script>·이벤트 핸들러는 통째 제거된다. → 가이드 5.1 "raw HTML 기본 비허용" + 이슈 §7 "raw HTML 제거" 충족.
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

> **가이드 5.3 스니펫과의 의도적 차이**: 가이드 5.3은 `USE_PROFILES: { html: true }`로 적었으나, 이 프로필은 양성 raw HTML(`<div>` 등)을 **보존**한다 → 이슈 §7의 "raw HTML 제거" 검수와 충돌. 파이프라인 형태(media치환→marked→DOMPurify)는 5.3 그대로 유지하되, **DOMPurify config만 마크다운 산출 태그 allowlist로 조여** §7을 통과시킨다. XSS 방지(가이드 5.1 목표)는 양쪽 모두 충족.
>
> **백엔드 스키마 근거(allowlist가 기능 손실 0인 이유)**: 본문 필드는 `*_WRITE` 권한 관리자만 작성(반신뢰)하나 백엔드가 sanitize를 전혀 안 하므로(가이드 5.1) **프론트가 유일 방어선**이다. 그리고 본문 모델상 raw HTML이 필요한 경로가 없다 — 이미지=`media:{id}` 리터럴, 영상/오디오=`Sermon*Request`의 **구조화 URL 필드**(본문 `<iframe>` 임베드 아님), 표/인용/목록/강조=마크다운(GFM 표는 allowlist 포함). 따라서 raw HTML 차단은 공격면만 줄이고 표현력은 잃지 않는다.

### 5.5 날짜 — `src/lib/date.ts` (신규)

```ts
// 서버 datetime은 offset 없는 LocalDateTime → +09:00 명시 부착(KST 가정).
export function parseServerDate(s: string): Date {
  return /T/.test(s)
    ? new Date(`${s}+09:00`)
    : new Date(`${s}T00:00:00+09:00`); // date-only(YYYY-MM-DD)도 KST 자정
}
```

### 5.6 공통 컴포넌트 — `src/components/common/`

| 컴포넌트 | 렌더 | 명세 |
|---|---|---|
| `Pagination` | `'use client'` | props `{ page: PageMeta }`. `usePathname`+`useSearchParams`+`<Link>`로 **다른 쿼리(tagId·sort) 보존**하며 `?page=`만 교체. number 0-base(표시는 +1). totalPages>7 말줄임. 첫/마지막 페이지에서 이전/다음 비활성. **내부 `<Suspense>` 경계 포함해 export**(아래 ⚠️). |
| `TagFilter` | `'use client'` | props `{ tags: Tag[] }`(self-fetch 안 함 — 부모 서버 컴포넌트가 `GET /api/tags` 주입). 필 버튼, 선택 시 `?tagId=` 단수, "전체"=tagId 제거. 현재 tagId는 `useSearchParams`로 활성 표시. **`Tag = { id: number; name: string }`**(api-docs `TagResponse` 확정). **내부 `<Suspense>` 경계 포함해 export**(아래 ⚠️). |
| `EmptyState` | 순수 | props `{ message }`. "등록된 ○○가 없습니다" 패턴. |
| `Skeleton` | 순수 | props `{ className? }`. surface-strong 펄스. |
| `MarkdownContent` | 순수(서버 OK) | props `{ source: string }`. `renderMarkdown(source)` → `dangerouslySetInnerHTML`. 래퍼에 커스텀 prose 클래스. ISR 시 서버에서 새니타이즈. |

- **스타일**: hex·px 인라인 금지, `typo.*`·DESIGN.md 토큰만. 색=`currentColor`/토큰, 아이콘=`lucide-react`, 조건부 렌더=삼항.
- ⚠️ **Suspense 경계 필수(빌드 게이트)**: `useSearchParams`를 쓰는 `Pagination`·`TagFilter`는 공개 ISR(prerender) 페이지에 놓이면 **프로덕션 빌드가 실패**한다(next 16.2.9 문서 `use-search-params.md:179` — *"a static page that calls `useSearchParams` … must be wrapped in a `Suspense` boundary, otherwise the build fails"*). dev/test는 통과하므로 놓치기 쉽다(`:178`). 대응: 두 컴포넌트는 **내부 컨트롤(`useSearchParams` 호출부)을 `<Suspense fallback={…}>`로 감싼 공개 컴포넌트로 export**한다 — 소비측은 `<Pagination/>`만 놓으면 되고 경계를 잊을 수 없다. fallback은 `Skeleton`/기존 컨트롤 자리표시.
- ⚠️ **AGENTS.md 준수**: `Link`/`useSearchParams`/`usePathname` 시그니처는 구현 직전 `node_modules/next/dist/docs/01-app/`에서 검증 후 작성.

### 5.7 prose 스타일 — `src/app/globals.css` (확장)

`@tailwindcss/typography` 미도입. 커스텀 클래스(예: `.prose-church`)로 body-md(행간 1.7)·헤딩(typo 위계)·링크(primary)·목록·인용·이미지(라운드·max-width)를 토큰 기반 정의. MarkdownContent가 이 클래스를 래퍼에 적용.

---

## 6. 데이터 흐름

- **회원·어드민(클라)**: `authFetch` → `parseJson`(ApiError throw) → `catch` → `handleApiError(e, handlers)` → 토스트/주입 효과.
- **공개(서버)**: `fetch`+ISR → 비-2xx면 `parseJson`이 ApiError throw → 서버는 `notFound()`/에러 바운더리(토스트 아님). `handleApiError`는 호출하지 않음.
- **목록**: 서버/클라가 `Page<T>` 수신 → 렌더 → `<Pagination page={page}/>`·`<TagFilter tags={tags}/>` client island가 URL 동기화.
- **콘텐츠**: 서버가 상세 fetch → `<MarkdownContent source={content}/>`가 ISR 시점에 새니타이즈 HTML 렌더.

---

## 7. 의존성·문서 변경

**prod 추가**
- `marked` — 마크다운→HTML(자체 타입 제공)
- `isomorphic-dompurify` — 새니타이즈(dompurify+jsdom 동반, 자체 타입 제공)

**미추가(명시적)**: `date-fns`(소비 태스크 몫), `@tailwindcss/typography`(커스텀 prose로 대체)

**문서**
- `docs/church-frontend-guide.md` 15.1 표에 `isomorphic-dompurify` 행 추가(사유 주석 포함).
- `src/app/globals.css` prose 블록 추가.

---

## 8. 테스트 계획 (TDD · 80%+ · 검수 §7 매핑)

| 파일 | 검증 항목 |
|---|---|
| `apiError.test.ts`(확장) | parseJson이 title·instance·errors·references까지 채운다 / 기존 3-인자 호출 회귀 없음 |
| `handleApiError.test.ts` | **errorCode 5종+ 분기**: AUTHENTICATION_FAILED→onAuthFailed/폴백, INVALID_TOKEN→onRedirectToLogin 있으면 호출·**없으면 토스트 폴백(침묵 금지)**, ACCESS_DENIED→토스트(detail), INVALID_INPUT_VALUE(errors有)→onFieldErrors·(errors無)→토스트, MEDIA_IN_USE→onMediaReferences(refs), OPTIMISTIC_LOCK_CONFLICT→토스트+onReedit, DUPLICATE_RESOURCE→onDuplicate, default→토스트(title). `notify` 모킹. |
| `page.test.ts` | buildListQuery 조합·0-base·tagId 단수·빈 객체="" |
| `markdown.test.ts` | `<script>` 통째 제거, **`<div>hello</div>` 등 양성 raw HTML도 태그 제거·내용("hello") 보존**, `media:42`→`/api/media/42`, **`media:420`이 42로 오탐 안 됨**, `![alt](media:42)` 이미지, `**bold**`→`<strong>` 보존 |
| `date.test.ts` | datetime→KST 벽시계(절대 ms로 UTC 변환 검증), date-only→KST 자정, **런타임 TZ 무관** |
| `Pagination.test.tsx` | 7개 초과 말줄임, 0-base 표시, 양끝 비활성, 기존 쿼리 보존, **공개 export가 `<Suspense>` 경계 포함** |
| `TagFilter.test.tsx` | 활성 표시, "전체"가 tagId 제거, **공개 export가 `<Suspense>` 경계 포함** |
| `EmptyState.test.tsx` / `Skeleton.test.tsx` / `MarkdownContent.test.tsx` | 렌더·문구·새니타이즈 결과(script 없음) |

---

## 9. 검수 기준 (이슈 §7)

- [ ] 5종 errorCode가 각각 올바른 UI로 분기(필드 인라인 vs 토스트 vs 리다이렉트). **INVALID_TOKEN은 핸들러 없어도 토스트 폴백(침묵 금지).**
- [ ] `<script>` 제거 + **양성 raw HTML(`<div>` 등) 태그 제거(내용 보존)**, `media:420`이 `media:42`로 오탐되지 않음.
- [ ] 비KST/SSR에서도 일정 시각이 KST 벽시계로 일치.
- [ ] 봉투 타입(목록/에러) + handleApiError, Pagination·TagFilter·EmptyState·Skeleton, MarkdownContent(media+DOMPurify), parseServerDate(+09:00) 모두 존재.
- [ ] **`Pagination`·`TagFilter`를 공개 ISR 페이지에 배치해도 `pnpm build`가 "Missing Suspense boundary" 없이 통과**(내부 Suspense 경계 확인).
- [ ] `pnpm build`·`pnpm lint`·`pnpm test`(커버리지 80%+) 통과.

---

## 10. 범위 밖 (Out of Scope)

- **EventCalendar(15.3)** — 일정 도메인 태스크. T06은 `parseServerDate`만 제공.
- 도메인 데이터 패칭·페이지 라우트·로그인/가입 UI(T14+).
- `FormError` 클래스 — `onAuthFailed` 콜백으로 충분(YAGNI).
- 어드민 테이블/폼 레이아웃(DESIGN.md Known Gaps).
- date-fns 기반 포맷 헬퍼.
