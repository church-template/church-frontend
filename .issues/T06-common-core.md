# [T6] 공통 응답 / 에러 / 콘텐츠 유틸

**라벨:** `core`
**선행:** T3, T4
**참조:** 가이드 3·4·5장, 15.2

---

## 목적
전 도메인이 공유하는 응답 봉투 타입·errorCode 처리·페이지네이션/태그필터·마크다운 렌더·날짜 파서를 만든다.

---

## 1. 목록 봉투 (3.1·3.2)
모든 페이지네이션 목록은 Spring `PagedModel(VIA_DTO)`:
```json
{ "content": [ /* 카드 객체 */ ],
  "page": { "size": 10, "number": 0, "totalElements": 42, "totalPages": 5 } }
```
- `page` 하위 키는 정확히 `size`·`number`(0-base)·`totalElements`·`totalPages` 4개뿐. SB3식 평면 키 없음.
- **카드와 상세는 다른 DTO** — 카드엔 본문(`content`/`description`)·`version`·`summary` 없음. 본문·version은 상세(`GET .../{id}`)에서만.

## 2. errorCode → UI 매핑 (4.2 — 분기는 errorCode로만)
봉투: `errorCode`(UPPER_SNAKE, 분기키)·`title`(한글)·`status`·`detail`·`instance`. 조건부: `errors`(INVALID_INPUT_VALUE), `references`(MEDIA_IN_USE) — 둘은 함께 안 옴. `@JsonInclude(NON_NULL)`.

| status | errorCode | UI 처리 |
|---|---|---|
| 400 | `INVALID_INPUT_VALUE` | `errors[]` 있으면 필드 인라인, 없으면 `detail` 토스트 |
| 401 | `AUTHENTICATION_FAILED` | 로그인 폼 단일 오류(가입여부 비노출) |
| 401 | `INVALID_TOKEN` | refresh 시도 → 실패 시 로그인 리다이렉트(T5) |
| 403 | `ACCESS_DENIED` | `detail` 표시(위계 사유는 detail에만), 버튼 숨김 점검 |
| 404 | `RESOURCE_NOT_FOUND` | "삭제됐거나 없는 항목" + 목록 복귀 |
| 409 | `MEDIA_IN_USE` | `references` 링크 노출, 삭제 차단 |
| 409 | `OPTIMISTIC_LOCK_CONFLICT` | 최신본 재조회 → 재편집(8장) |
| 409 | `DUPLICATE_RESOURCE` | 해당 입력 필드(전화 등) 중복 안내 |
| 409 | `ROLE_IN_USE`/`DEPARTMENT_HAS_CHILDREN` | 안내 토스트 |
| 413 | `FILE_SIZE_EXCEEDED` | 한도 안내·재선택 |
| 500 | `FILE_STORAGE_ERROR`/`INTERNAL_ERROR` | 재시도/일반 오류 토스트 |

전역 핸들러(4.4):
```ts
type ApiError = {
  errorCode: string; title: string; status: number; detail: string;
  errors?: { field: string; reason: string }[];
  references?: { type: string; id: number; title: string }[];
};
async function handleApiError(res: Response): Promise<never> {
  const e: ApiError = await res.json();
  switch (e.errorCode) {
    case "AUTHENTICATION_FAILED": throw new FormError("전화번호 또는 비밀번호가 올바르지 않습니다.");
    case "INVALID_TOKEN": redirectToLogin(); break;
    case "ACCESS_DENIED": toast(e.detail); break;
    case "INVALID_INPUT_VALUE": e.errors?.length ? showFieldErrors(e.errors) : toast(e.detail); break;
    case "MEDIA_IN_USE": showMediaReferences(e.references ?? []); break;
    case "OPTIMISTIC_LOCK_CONFLICT": toast("다른 사용자가 먼저 수정했습니다."); await reloadAndReedit(); break;
    case "DUPLICATE_RESOURCE": markDuplicateField(); break;
    default: toast(e.title);
  }
  throw e;
}
```

## 3. 공통 컴포넌트 (15.2)
- **Pagination**: `page` 봉투 그대로, `number` 0-base, `?page=` URL 동기화, 7개 초과 말줄임.
- **TagFilter**: `GET /api/tags`(공개, name asc) → 필 버튼. 선택 시 `?tagId=`(단수, 3.4) 재조회. "전체"=tagId 제거.
- **EmptyState / Skeleton**: "등록된 ○○가 없습니다" 패턴.
- 표준 쿼리(3.4): `?page=0&size=10&sort=createdAt,desc`(page 0-base). tagId 단수.

## 4. MarkdownContent (5.3 — 변환·새니타이즈는 프론트 책임)
본문은 raw 마크다운, 서버는 변환·sanitize 안 함. `media:{id}`는 `/api/media/{id}`로 치환.
```ts
import { marked } from "marked";
import DOMPurify from "dompurify";

const MEDIA_REF = /media:(\d+)(?!\d)/g; // media:420 오탐 방지

function renderMarkdown(raw: string): string {
  const withUrls = raw.replace(MEDIA_REF, (_, id) => `/api/media/${id}`);
  const html = marked.parse(withUrls, { async: false }) as string;
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }); // raw HTML/스크립트 제거
}
```
- `prose` 스타일은 DESIGN.md body-md(행간 1.7) 기준 커스텀.

## 5. parseServerDate (백엔드 답변 A)
서버 datetime은 **offset 없는 LocalDateTime**(`"2026-06-14T10:00:00"`). JS `new Date("...")`는 브라우저 로컬TZ로 파싱돼 SSR/비KST에서 어긋남 → **`+09:00` 명시 부착 후 파싱.**
```ts
// date-time → KST 고정. preachedAt 같은 date(YYYY-MM-DD)는 그대로.
export function parseServerDate(s: string): Date {
  return /T/.test(s) ? new Date(`${s}+09:00`) : new Date(`${s}T00:00:00+09:00`);
}
```
- 포맷·캘린더 셀 계산은 date-fns. 겹침 판정도 이 가정 위에서.

## 6. 완료 조건
- [ ] 봉투 타입(목록/에러) + `handleApiError`
- [ ] Pagination · TagFilter · EmptyState · Skeleton
- [ ] MarkdownContent(media 치환 + DOMPurify)
- [ ] parseServerDate(+09:00)

## 7. 검수
- [ ] 5종 errorCode가 각각 올바른 UI로 분기(필드 인라인 vs 토스트 vs 리다이렉트).
- [ ] `<script>`/raw HTML 제거, `media:420`이 `media:42`로 오탐되지 않음.
- [ ] 비KST/SSR에서도 일정 시각이 KST 벽시계로 일치.
