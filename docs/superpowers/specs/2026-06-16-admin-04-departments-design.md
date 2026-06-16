# 어드민 04 — 부서 계층 관리 설계

- **이슈**: `.issues/admin/04-departments.md` ([기능추가][어드민][부서] 부서 계층 관리, #38)
- **브랜치**: `20260614_#38_부서_계층_관리`
- **작성일**: 2026-06-16
- **선행 합의**: 들여쓰기 평면 테이블 · 항상 PUT(루트화=`(없음)` 선택) · sortOrder 숫자 입력 · 단일 반응형 테이블(선례 일관성)

---

## 1. 목적 · 범위

운영자가 **부서 계층을 생성·수정·삭제**할 전용 어드민 화면을 `/mypage/manage/departments`에 추가한다.

**범위 안**
- 부서 목록을 계층(트리)으로 표시하고 행별 수정·삭제
- 부서 생성·수정 (이름·설명·담당자·상위 부서·정렬 순서)
- 상위 부서 변경 시 자기 자신·자기 하위 선택 차단(순환 방지)
- 하위 부서가 있으면 삭제 차단
- 루트화와 단순 수정 경로 통합(항상 PUT)
- 동시 수정 충돌 안내
- 공개 소개 페이지와 별개 데이터라는 안내

**범위 밖 (Non-goals)**
- 공개 '교육·부서 소개' 페이지 변경 — 이 화면은 공개 소개와 **자동 연동되지 않는다**. 공개 소개는 프론트 상수(`src/constants/departments.ts`) 구동으로 그대로 둔다.
- 드래그 정렬 / 부서별 대표 이미지 / 태그(부서는 `tagIds` 없음).
- PATCH 사용 — 항상 PUT(전체 폼)으로 통일한다.

---

## 2. 핵심 사실 (검증 완료)

### 2.1 API 계약 (`docs/api-docs.json`)
| 메서드 · 경로 | 인증 | 요청 | 응답 | 성공 | 비고 |
|---|---|---|---|---|---|
| `GET /api/departments` | 불필요(공개) | — | `DepartmentCardResponse[]` | 200 | **비페이징 평배열**(sortOrder·id 순), 쿼리 파라미터 없음 |
| `GET /api/departments/{id}` | 불필요(공개) | — | `DepartmentDetailResponse` | 200 | 404 시 미존재 |
| `POST /api/admin/departments` | `DEPT_WRITE` | `DepartmentCreateRequest` | `DepartmentDetailResponse` | 200 | `parentId` 지정 시 상위 검증(400 `INVALID_INPUT_VALUE`) |
| `PUT /api/admin/departments/{id}` | `DEPT_WRITE` | `DepartmentUpdateRequest` | `DepartmentDetailResponse` | 200 | `version` 필수; `parentId=null`=루트화, `sortOrder=null`=기존 유지 |
| `DELETE /api/admin/departments/{id}` | `DEPT_WRITE` | — | — | 204 | 하위 존재 시 409 `DEPARTMENT_HAS_CHILDREN` |

> **어드민 전용 GET 엔드포인트는 없다.** 어드민 화면의 목록·상세 읽기는 **공개** `GET /api/departments` · `GET /api/departments/{id}`를 fresh(no-store)로 호출한다.

### 2.2 스키마 (raw 검증값)
```
DepartmentCreateRequest  { name(필수, ≤100), description?(≤50000), leader?(≤100), parentId?(int64), sortOrder?(int32) }
DepartmentUpdateRequest  = Create + { version(필수, int64) }
DepartmentCardResponse   { id, name, leader(string), parentId(number|null), sortOrder }      // description·version 없음
DepartmentDetailResponse = Card + { description, createdAt, updatedAt, version }
DepartmentNode           = Card + { children: DepartmentNode[] }                              // 프론트 트리 조립용
```
- `DepartmentCardResponse.leader`는 `string`(빈 문자열 가능) → 테이블에서 빈값은 `—`로 표시.
- 목록 카드에는 `description`·`version`이 없으므로 **수정 시 상세를 별도 조회**해 시드한다.

### 2.3 이미 완비 — 무수정
- `src/lib/admin/manageDomains.ts:17` — `{ key:"departments", label:"부서 관리", permission:"DEPT_WRITE", href:"/mypage/manage/departments", kind:"manage" }` 등록 완료 → `ManageHub`가 `DEPT_WRITE` 보유 시 카드 자동 노출.
- `src/constants/permissions.ts` — `DEPT_WRITE: "부서 관리"` 라벨 존재.
- `src/lib/auth/handleApiError.ts` — `DEPARTMENT_HAS_CHILDREN` · `OPTIMISTIC_LOCK_CONFLICT`(+`onReedit`) · `INVALID_INPUT_VALUE`(+`onFieldErrors`) **이미 분기**. 커스텀 에러 처리 불필요.
- `src/lib/api/departments.ts` — `getDepartments`·`getDepartment`(둘 다 공개·`revalidate:60`)·`buildDepartmentTree`(평배열→`parentId` 트리, 고아→루트 승격, `bySortOrder` 정렬)·`bySortOrder`.
- `src/lib/api/types.ts` — `DepartmentCardResponse`·`DepartmentDetailResponse`·`DepartmentNode`.

### 2.4 가이드 준수 (`docs/church-frontend-guide.md`)
- **15.1** 어드민 쓰기 = 클라이언트 컴포넌트 + TanStack Query + `authFetch`.
- **2장** 게이팅은 `permissions` 문자열(`DEPT_WRITE`) 기준, `RequirePermission`(`useMe`).
- **4장** 분기는 `errorCode`로만, Toast 출력.
- **8장** version 낙관락 — 상세에서 version 보관 → 수정 본문에 동봉 → 409 시 재조회·재편집.
- **5장** `description`은 raw 마크다운 → `MarkdownEditor`(미리보기 `marked`+`DOMPurify`).
- **15.2** 어드민 화면은 DESIGN.md 범위 밖(가독성 우선 단순 변형)이되 토큰·컴포넌트 재사용.

---

## 3. 아키텍처 · 데이터 흐름

```
/mypage/manage/departments  (page.tsx, "use client")
  └ RequirePermission DEPT_WRITE  (fallback: EditAccessDenied)
      └ DepartmentManager  ("use client")
          useQuery(adminKeys.list("departments"), listDepartmentsAdmin)   // fresh 평배열
            → buildDepartmentTree(list)                                   // 재사용
            → flattenTree(nodes) → [{ node, depth }]                      // preorder DFS
            → DataTable(columns, rows, actions)                           // 재사용
          [+ 새 부서] → DepartmentFormDialog(mode="create")
          행 actions: 수정 → DepartmentFormDialog(mode="edit", id)
                      삭제 → DeleteConfirmDialog → deleteDepartment(id)
```

**공개 격리** — 공개 소개는 상수 구동이라 이 화면 변경은 ISR revalidate 대상이 아니다. `src/lib/admin/revalidate.ts`를 **건드리지 않고**, 변경 성공 시 TanStack Query 캐시만 무효화(`qc.invalidateQueries(adminKeys.list("departments"))`). 이 격리가 "별개 데이터" 요구를 구조로 보장한다.

---

## 4. 데이터 레이어 — `src/lib/api/departments.admin.ts` (신규)

도메인-로컬 요청 타입 + mutation + fresh 읽기. (병렬화 스펙: 어드민 요청 타입은 공유 `types.ts`가 아닌 도메인-로컬에 둔다.)

```ts
import { apiMutate } from "@/lib/admin/apiMutate";
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import type { DepartmentCardResponse, DepartmentDetailResponse } from "./types";

export interface DepartmentCreateRequest {
  name: string;          // 필수, ≤100
  description?: string;   // ≤50000 (마크다운)
  leader?: string;        // ≤100
  parentId?: number | null;   // null = 루트
  sortOrder?: number;     // 생략 시 백엔드 max+10
}
export interface DepartmentUpdateRequest extends DepartmentCreateRequest {
  version: number;        // 낙관락
}

// 읽기 — 공개 엔드포인트를 fresh(no-store)로. (어드민 전용 GET 없음)
export async function listDepartmentsAdmin(): Promise<DepartmentCardResponse[]> {
  const res = await authFetch("/api/departments", { cache: "no-store" });
  return (await parseJson<DepartmentCardResponse[] | null>(res)) ?? [];
}
export async function getDepartmentDetail(id: number): Promise<DepartmentDetailResponse> {
  const res = await authFetch(`/api/departments/${id}`, { cache: "no-store" });
  return parseJson<DepartmentDetailResponse>(res);
}

// 쓰기 — apiMutate(200/201/204 자동 처리, 비2xx→ApiError)
export function createDepartment(body: DepartmentCreateRequest) {
  return apiMutate<DepartmentDetailResponse>("/api/admin/departments", { method: "POST", body });
}
export function updateDepartment(id: number, body: DepartmentUpdateRequest) {
  return apiMutate<DepartmentDetailResponse>(`/api/admin/departments/${id}`, { method: "PUT", body });
}
export function deleteDepartment(id: number) {
  return apiMutate<void>(`/api/admin/departments/${id}`, { method: "DELETE" });
}
```
> `authFetch` 시그니처·`parseJson`/`ApiError` 위치는 구현 시 실제 export에 맞춘다(예: `@/lib/auth/apiError`). 공개 엔드포인트라 토큰 없이도 200이며 refresh 분기는 타지 않는다.

---

## 5. 트리 유틸 — `src/components/admin/departments/treeUtils.ts` (신규)

```ts
import type { DepartmentNode } from "@/lib/api/types";

// preorder DFS — 트리를 화면 표시 순서대로 평탄화하며 깊이를 부착
export function flattenTree(nodes: DepartmentNode[], depth = 0): { node: DepartmentNode; depth: number }[];

// 특정 부서의 모든 하위(자기 제외) id 집합 — 상위 select 순환 방지용
export function collectDescendantIds(node: DepartmentNode): Set<number>;
```
- `flattenTree`는 `buildDepartmentTree` 결과를 입력으로 받는다(정렬은 `buildDepartmentTree`가 이미 `bySortOrder`로 보장).
- `collectDescendantIds`는 트리에서 대상 노드를 찾아 그 서브트리의 id를 모은다.

---

## 6. 트리 렌더 — `src/components/admin/departments/DepartmentManager.tsx` (신규)

- `"use client"`, `useQuery(adminKeys.list("departments"), listDepartmentsAdmin)`.
- `buildDepartmentTree` → `flattenTree` → `DataTable` 컬럼:

| key | header | 모바일(<640) | 셀 |
|---|---|---|---|
| `name` | 부서명 | 표시 | depth만큼 좌패딩(spacing 토큰) + `└`(aria-hidden) + 이름, `min-w-0 truncate` |
| `leader` | 담당 | 표시 | `leader || "—"`, truncate |
| `sortOrder` | 정렬 순서 | **숨김** | 숫자 (`className:"hidden sm:table-cell"`) |
| (actions) | — | 표시 | 수정·삭제 (모바일 아이콘 `Pencil`/`Trash2`, 태블릿+ 텍스트) |

- **들여쓰기**는 inline px 금지 → depth별 spacing-token 좌패딩 클래스 매핑(예: 레벨당 `pl-lg`, 상한 캡). `└` 마커는 장식(`aria-hidden`) + 트리 의미는 셀 구조로 전달.
- **상단 영역**: "별개 데이터" 안내 배너(아래 §9) + 우측 `[새 부서]` 버튼. `flex flex-col gap-base sm:flex-row sm:items-center sm:justify-between`로 모바일 세로 스택.
- `DataTable` 내장 `overflow-x-auto`(가로 스크롤 안전망)·loading·empty 활용. empty: "등록된 부서가 없습니다."
- 컨테이너: `Container as="section" className="py-section"` (다른 manage 페이지와 동일).

---

## 7. 폼 — `DepartmentFormDialog.tsx` + `schema.ts` (신규)

### 7.1 스키마 (`schema.ts`)
```ts
export const departmentSchema = z.object({
  name: z.string().min(1, "부서명을 입력해 주세요.").max(100),
  description: z.string().max(50000),
  leader: z.string().max(100),
  parentId: z.number().nullable(),   // null = 최상위
  sortOrder: z.number().int().nonnegative().nullable(),  // null = 자동(생성) / 기존(수정 시 로드값 전송)
});
export type DepartmentFormValues = z.infer<typeof departmentSchema>;
```
- `optional().default()` 금지(zodResolver TS 이슈) — 기본값은 `useForm` `defaultValues`에서 주입(공지·일정 선례).

### 7.2 다이얼로그
- `ui/dialog`(재스킨, 모바일: `max-w-[--container-modal]` + `max-h-[85vh] overflow-y-auto`) 재사용. 필드는 `flex flex-col gap-base` 세로 배치.
- 필드: 이름(Input) · 설명(`MarkdownEditor`) · 담당(Input) · 상위 부서(select) · 정렬 순서(number Input).
- **create**: `reset` 빈 폼 → 제출 POST `createDepartment`.
- **edit**: 열릴 때 `getDepartmentDetail(id)`로 폼+version **시드**(주보 선례), 시드 중 제출 차단(`seeding` 플래그). 제출은 **항상 PUT** `updateDepartment(id, {...body, version})`.
- **상위 select**: 첫 옵션 `(없음 — 최상위 부서)` → 선택 시 `parentId:null`(PUT 루트화). 그 외 옵션은 부서 목록.
- **순환 방지**(§5): edit 시 옵션에서 `자기 자신` + `collectDescendantIds(self)` 제외. (옵션 목록은 Manager가 가진 평배열/트리를 prop으로 주입.)
- `toBody`: 빈 문자열 `description`/`leader`는 `undefined`로 정제. `parentId`는 `null` 그대로 전송(PUT 루트화 의미 보존). `sortOrder`는 숫자/`undefined`.

### 7.3 mutation (`useMutation`)
```
onError: adminOnError({
  onFieldErrors: (fes) => fes.forEach(fe => setError(fe.field, { message: fe.reason })),  // 400 INVALID_INPUT_VALUE
  onReedit: () => { /* edit: getDepartmentDetail 재조회 → reset + version 갱신 */ },        // 409 OPTIMISTIC_LOCK_CONFLICT
})
onSuccess: () => {
  qc.invalidateQueries(adminKeys.list("departments"));
  notify.success("저장했습니다.");
  onOpenChange(false);
}
```

---

## 8. 액션 · 에러 처리

- **행 수정**: edit 다이얼로그 오픈.
- **행 삭제**: `DeleteConfirmDialog`(재사용, 경고문) → `deleteDepartment(id)`.
  - `onSuccess`: `qc.invalidateQueries(adminKeys.list("departments"))` + `notify.success("삭제했습니다.")`.
  - `onError: adminOnError()` — 409 `DEPARTMENT_HAS_CHILDREN`는 `handleApiError`가 이미 "하위 부서가 있어 삭제할 수 없습니다…" 토스트 출력.
- **동시 수정 충돌**: 409 `OPTIMISTIC_LOCK_CONFLICT` → `handleApiError`가 토스트 + `onReedit` 호출 → 폼 재시드.
- **입력 검증**: 400 `INVALID_INPUT_VALUE` + `errors[]` → `onFieldErrors`로 필드 인라인(특히 `parentId` 순환). `errors[]` 없으면 `detail` 토스트.

---

## 9. "별개 데이터" 안내

`DepartmentManager` 상단 안내 배너(어드민 단순 변형, 토큰·lucide 사용, 이모지 금지):
- 아이콘: lucide `Info`(size prop, `currentColor`).
- 배경: `surface-soft`, 라운드 `rounded-xl`, 패딩 토큰.
- 문구(초안): **"이 화면은 운영용 부서 데이터를 관리합니다. 공개 ‘교육·부서 소개’ 페이지는 별도 콘텐츠로 구성되어 있어, 여기서의 변경이 자동 반영되지 않습니다."**

---

## 10. 반응형 (선례 일관)

선례는 `MediaLibrary`의 단일 반응형 테이블 하나뿐 — 그것을 따른다. **카드 접힘(별도 모바일 레이아웃) 미도입.**
- 보조 컬럼(정렬 순서) `hidden sm:table-cell`로 모바일 숨김.
- `DataTable` 내장 `overflow-x-auto` 가로 스크롤 안전망.
- 툴바·안내: `flex-col` → `sm:flex-row`.
- 다이얼로그: `max-w-[--container-modal]` + `max-h-[85vh] overflow-y-auto`(모바일 내부 스크롤).
- 행 메타: `min-w-0 truncate` + 액션 `shrink-0`.
- 모바일 액션 버튼은 아이콘(lucide), 태블릿+ 텍스트.

---

## 11. 파일 목록

**신규**
- `src/lib/api/departments.admin.ts` (+ `.test.ts`)
- `src/app/(site)/mypage/manage/departments/page.tsx`
- `src/components/admin/departments/DepartmentManager.tsx` (+ `.test.tsx`)
- `src/components/admin/departments/DepartmentFormDialog.tsx` (+ `.test.tsx`)
- `src/components/admin/departments/schema.ts` (+ `.test.ts`)
- `src/components/admin/departments/treeUtils.ts` (+ `.test.ts`)

**수정**
- `.claude/rules/DESIGN.md` — 트랙 04 어드민 부서 컴포넌트 마커 append(`department-admin-manager`·`department-form-modal` 등, 자기 구획 주석 아래에만).

**무수정 (완비 확인)** — `manageDomains.ts` · `permissions.ts` · `handleApiError.ts` · `revalidate.ts`(미사용).

---

## 12. 테스트 (TDD, 80%+)

| 파일 | 검증 |
|---|---|
| `departments.admin.test.ts` | create=POST 경로/바디(version 없음) · update=PUT+version · delete=DELETE · 읽기 no-store |
| `schema.test.ts` | name 필수·길이 한계 · parentId nullable · sortOrder 정수 |
| `treeUtils.test.ts` | `flattenTree` 순서·depth · `collectDescendantIds` 서브트리 수집 |
| `DepartmentFormDialog.test.tsx` | create=POST · edit=상세 시드 후 PUT+version · `(없음)` 선택 시 `parentId:null` · 상위 옵션에서 자기+하위 제외 · name 빈값 검증 메시지 |
| `DepartmentManager.test.tsx` | 들여쓰기 렌더 · 정렬순서 컬럼 `hidden sm:table-cell` · empty 상태 · 삭제 트리거 |

테스트 컨벤션: `vitest`(globals false 명시 import) · `vi.hoisted`+`vi.mock` · jest-dom 미사용(`toBeDefined`/`getAttribute`) · `next/link` mock · `next/navigation` mock.

---

## 13. 구현 순서 (writing-plans 입력)

1. `departments.admin.ts` (+test) — RED→GREEN
2. `treeUtils.ts` (+test)
3. `schema.ts` (+test)
4. `DepartmentFormDialog.tsx` (+test)
5. `DepartmentManager.tsx` (+test)
6. `app/(site)/mypage/manage/departments/page.tsx`
7. `.claude/rules/DESIGN.md` 마커 append
8. `pnpm lint` + `npx tsc --noEmit` + `pnpm test` 게이트, 허브 카드 노출 수동 확인
