# 어드민 기반 인프라 (01-core) 설계

> 어드민 트랙(2차 배치) 에픽의 첫 작업. 출처 이슈: `.issues/admin/01-foundation.md`, 에픽 `.issues/admin/00-epic.md`.
> 신뢰 소스: `docs/church-frontend-guide.md`(1·2·4·8·15장) · `docs/api-docs.json` · `.claude/rules/DESIGN.md`.

## 목적

어드민 트랙 전 도메인(02~07)이 공유하는 **공통 핵심 토대**를 구축한다. 도메인 CRUD는 없다 — 후속 도메인 이슈가 이 토대를 사용한다. 어드민 쓰기는 별도 `/admin` 백오피스가 아니라 (a) 공개 페이지 인라인 액션, (b) 마이페이지 관리 허브, (c) 운영 도메인 `/mypage/manage/*` 전용 화면으로 분산한다(가이드 15.1, 에픽 §1).

## 범위

### 포함 (01-core)
1. RBAC 게이트 — `<RequirePermission>` + `useHasPermission`/`useHasAnyPermission`
2. 쓰기 헬퍼 — `apiMutate`(JSON 쓰기)
3. 뮤테이션 핸들러 — 공용 `onError` 팩토리 + 낙관락 409 재조회 헬퍼
4. 어드민 쿼리키 규약 — `adminKeys`
5. `handleApiError` errorCode 5종 확장
6. 삭제 확인 다이얼로그 — `DeleteConfirmDialog`
7. 마이페이지 관리 허브 섹션 + `/mypage/manage` 게이트 레이아웃 스캐폴드
8. DESIGN.md `components`에 `manage-hub` 등록

### 이연 (첫 소비 도메인에서 구현 — YAGNI·실사용 인터페이스 검증)
- `DataTable` → 첫 소비 05(미디어 라이브러리)/06(태그·직분)
- `MarkdownEditor`(Preview는 기존 `MarkdownContent` 재사용) → 02(설교·공지)
- `TagMultiSelect` → 02
- `DateTimePicker`(date-fns 미설치 → 라이브러리 없이 직접) → 03(일정)
- `MediaUploader`(FormData) → 05
- **인라인 액션 레이어 패턴**: 01은 게이트만 제공. 패턴의 첫 실증은 02(공개 서버 컴포넌트 위 client island).

## 진입·아키텍처 원칙 (어드민 트랙 공통)

- 데이터 패칭: 어드민 쓰기 = 클라이언트 + TanStack Query `useMutation` + `authFetch`(가이드 15.1). `onSuccess`에 관련 쿼리 무효화.
- 공개 페이지는 ISR이라 어드민 변경의 공개 반영은 지연될 수 있음(관리 화면 자체는 즉시 갱신). 쓰기 성공 토스트에 지연 안내 문구 표준 제공.
- 권한 게이팅 단일 기준: `useMe()`의 **라이브 `permissions`**(토큰 스냅샷 아님 — 가이드 1.5·2.1). 직분·roles로 게이팅 금지.
- 게이트는 UX 최적화일 뿐 보안 경계 아님. 서버가 `/api/admin/**` 2단 방어(로그인+`@PreAuthorize`).

## 접근: 쓰기 추상화 (선택 C — 중간)

`apiMutate` 헬퍼 + 재사용 핸들러 팩토리를 제공하고, `useMutation` 호출은 도메인이 직접 한다. A(헬퍼만, 반복 과다)와 B(`useAdminMutation` 훅 캡슐화, 과한 추상화·도메인 변형 수용난)의 균형. 도메인별 `onSuccess`(무효화 키)는 자유롭게 두되, `onError`·낙관락은 공용 팩토리로 통일.

## 모듈 구조

신규 코드는 `src/lib/admin/`·`src/components/admin/`로 격리한다.

| 유닛 | 위치 | 신규/확장 |
|---|---|---|
| `RequirePermission` | `src/components/admin/RequirePermission.tsx` | 신규 |
| `useHasPermission`/`useHasAnyPermission` | `src/lib/auth/useMe.ts`(기존 `usePermission` 옆) | 확장 |
| `apiMutate` | `src/lib/admin/apiMutate.ts` | 신규 |
| `adminMutationHandlers`/낙관락 헬퍼 | `src/lib/admin/mutationHandlers.ts` | 신규 |
| `adminKeys` | `src/lib/admin/queryKeys.ts` | 신규 |
| errorCode 5종 확장 | `src/lib/auth/handleApiError.ts` | 확장 |
| `DeleteConfirmDialog` | `src/components/admin/DeleteConfirmDialog.tsx` | 신규 |
| 관리 허브 섹션 | `src/components/mypage/ManageHub.tsx` + `mypage/page.tsx` 조립 | 신규 |
| manage 게이트 레이아웃 | `src/app/(site)/mypage/manage/layout.tsx` | 신규 |

## 유닛 상세

### 1. RBAC 게이트

```ts
// components/admin/RequirePermission.tsx
type Props = {
  permission?: string;
  perms?: string[];
  mode?: "all" | "any";   // perms 사용 시, 기본 "any"
  fallback?: React.ReactNode; // 기본 null
  children: React.ReactNode;
};
```
- 내부에서 `useMe()` 구독 → `hasPermission`/`hasAnyPermission`(기존)로 판정.
- `isLoading` 중 비렌더(권한 깜빡임 방지). 미보유 시 `fallback`(기본 `null`).
- 분기 로직용 훅: `useHasPermission(perm): boolean`, `useHasAnyPermission(perms): boolean` — 기존 `usePermission` 위에 추가(중복 구현 금지).
- 의존: `useMe`, `hasPermission`/`hasAnyPermission`(기존).

### 2. `apiMutate` (JSON 쓰기 헬퍼)

```ts
// lib/admin/apiMutate.ts
export async function apiMutate<T>(
  path: string,
  opts: { method: "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown },
): Promise<T>;
```
- `authFetch(path, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })` → `parseJson<T>`(기존, 비-2xx면 `ApiError` throw).
- 204 No Content는 `T = void`로 처리(본문 없음 안전 파싱 — `parseJson`이 빈 본문을 `{}`로 방어하므로 호환).
- **FormData 업로드는 이 헬퍼를 쓰지 않는다**(Content-Type 수동 설정 금지). 업로더는 05에서 별도.
- 의존: `authFetch`, `parseJson`/`ApiError`(기존).

### 3. 뮤테이션 핸들러 + 낙관락

```ts
// lib/admin/mutationHandlers.ts
export function adminOnError(handlers?: ApiErrorHandlers): (e: unknown) => void;
export function isOptimisticLockConflict(e: unknown): boolean;
```
- `adminOnError`: `e instanceof ApiError`면 `handleApiError(e, handlers)`, 아니면 일반 오류 토스트.
- 낙관락: 도메인 `onError`에서 `isOptimisticLockConflict(e)`면 상세 쿼리 무효화(재조회) + 안내 토스트(가이드 8장 "다른 사람이 먼저 수정함, 새로고침"). 자동 머지 안 함. 성공 응답의 `version`(post-increment)은 도메인이 폼 상태에 반영.
- 의존: `handleApiError`/`ApiError`(기존).

### 4. 어드민 쿼리키 규약

```ts
// lib/admin/queryKeys.ts
export const adminKeys = {
  list: (domain: string, params?: unknown) => ["admin", domain, "list", params] as const,
  detail: (domain: string, id: number | string) => ["admin", domain, "detail", id] as const,
};
```
- 기존 공개/회원 키(`["me"]`·`["albums",params]` 등)와 네임스페이스 분리(`"admin"` prefix). 도메인 이슈가 이 규약으로 `invalidateQueries`.

### 5. `handleApiError` errorCode 5종 확장 (기존 파일)

기존 7종(`AUTHENTICATION_FAILED`·`INVALID_TOKEN`·`ACCESS_DENIED`·`INVALID_INPUT_VALUE`·`MEDIA_IN_USE`·`OPTIMISTIC_LOCK_CONFLICT`·`DUPLICATE_RESOURCE`)에 추가:
- `ROLE_IN_USE`(409) — "회원에게 할당된 역할은 삭제 불가"
- `DEPARTMENT_HAS_CHILDREN`(409) — "하위 부서 먼저 정리"
- `FILE_SIZE_EXCEEDED`(413) — 한도 안내·재선택
- `FILE_STORAGE_ERROR`(500) / `INTERNAL_ERROR`(500) — 일반 오류 토스트
- 분기는 `errorCode`로만(status/title 금지 — 가이드 4.1). 각 코드에 대한 핸들러 콜백 옵션 + 기본 토스트 폴백. `references`(MEDIA_IN_USE)·`errors`(INVALID_INPUT_VALUE)는 `ApiError`에 이미 존재.

### 6. 삭제 확인 다이얼로그

```ts
// components/admin/DeleteConfirmDialog.tsx
type Props = {
  open: boolean; onOpenChange: (v: boolean) => void;
  title: string; warning?: React.ReactNode;
  requirePassword?: boolean;          // 위험 작업(약관 리셋 등)
  confirmLabel?: string;              // 기본 "삭제"
  onConfirm: (ctx?: { password?: string }) => Promise<void> | void;
  pending?: boolean;
};
```
- 기존 `Dialog`(T04) + `Button variant="destructive"`(이미 존재) 조합. 친화 장치는 색이 아니라 경고문 + 선택적 비밀번호 재인증(DESIGN.md `button-destructive`).
- `requirePassword` 시 비번 입력 필드(`PasswordInput` 기존 재사용) — 미입력 시 확정 비활성.
- 미디어 차단형 삭제(references 표시)는 본 컴포넌트 밖(05에서 references 사전 조회 후 사용처 노출). 여기선 일반 확인만.

### 7. 마이페이지 관리 허브 + manage 스캐폴드

- `ManageHub`(신규): `/mypage`에 "관리" 섹션으로 조립. `useMe().permissions` 기준 권한 보유 도메인만 카드 노출(`<RequirePermission>`). 보유 0이면 섹션 비노출.
  - 공개 인라인 도메인(설교·공지·일정·갤러리·주보) 카드 → 해당 공개 페이지로 링크.
  - 운영 전용 도메인(부서·미디어·태그·직분·회원/권한) 카드 → `/mypage/manage/*`로 링크.
  - 도메인↔권한↔경로 매핑은 상수 테이블 1곳에 정의.
- `mypage/manage/layout.tsx`(신규): **로그인 가드만**(비로그인 → `/login?next=...`). 도메인별 권한 게이트는 각 하위 `page.tsx`의 `<RequirePermission>`이 담당(각 도메인 이슈가 추가). 01은 인덱스 `/mypage/manage/page.tsx`를 `/mypage`로 리다이렉트(관리 허브가 단일 진입점)만 둔다.

## 데이터 흐름

```
도메인 쓰기 액션(02~07)
  → useMutation({
      mutationFn: () => apiMutate(path, { method, body }),
      onError: adminOnError({ ...낙관락/필드에러 })
      onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.list(domain) })
    })
  → 성공: 관리 화면 즉시 갱신 + (공개 반영 지연 안내)
  → 409 OPTIMISTIC_LOCK_CONFLICT: isOptimisticLockConflict → 상세 무효화 + 안내
  → 400 INVALID_INPUT_VALUE: handleApiError onFieldErrors → RHF setError(기존 패턴)
```

## 에러 처리

가이드 4장 준수 — `errorCode` 단일 분기, Toast(sonner) 출력. 기존 `handleApiError` 확장(유닛 5). 필드 오류는 기존 `onFieldErrors`→RHF `setError` 경로 재사용.

## 테스트 (TDD: RED → GREEN → REFACTOR)

기존 관례(메모리 `frontend-test-conventions`): vitest `globals:false` 명시 import, jest-dom 없음(`getAttribute`/`toBeDefined`), 장식 img `alt=""`+`container.querySelector`.

- `apiMutate`: 2xx → 파싱 반환 / 비-2xx → `ApiError` throw / 204 → void. (authFetch mock)
- `handleApiError`: 신규 5코드 각각 올바른 핸들러·폴백 토스트 호출.
- `RequirePermission`: 보유 시 children 렌더 / 미보유·로딩 시 비렌더 / `mode="all|any"`.
- `useHasAnyPermission`: 권한 배열 판정.
- `DeleteConfirmDialog`: 확인 콜백 호출 / `requirePassword` 시 미입력 확정 비활성·입력 후 password 전달.
- 낙관락 헬퍼: `isOptimisticLockConflict` true/false 분기.
- 커버리지 80%+ 목표(공용 모듈).

## DESIGN.md 갱신

`components` 블록에 `manage-hub` 추가(규칙 4 — 문서 등록 후 구현). 토큰 공유·가독성 우선 단순 변형. `delete-confirm`은 기존 `button-destructive`+Dialog 조합이라 신규 등록 불요(기존 항목 참조).

## 기존 자산 재사용 맵 (재구현 금지)

| 필요 | 재사용 대상(기존) |
|---|---|
| 인증 fetch·401 refresh | `authFetch` |
| 응답 파싱·에러 throw | `parseJson` / `ApiError` |
| errorCode 토스트 분기 | `handleApiError`(확장만) |
| 라이브 권한 | `useMe` / `usePermission` / `hasPermission`·`hasAnyPermission` |
| 파괴적 버튼 | Button `variant="destructive"` |
| 모달·시트 | `Dialog` / `Sheet`(T04) |
| 비번 재인증 입력 | `PasswordInput` |
| 마크다운 렌더 | `MarkdownContent`(02 에디터 Preview용) |
| 쿼리 클라이언트 | `providers.tsx` QueryClient |
| 토스트 | `sonner` Toaster(전역) |

## 명세-실제 차이 정정 (이슈 본문 기준 교정)

- 마크다운: `markdown-it` ❌ → 실제 **`marked`** + `isomorphic-dompurify`. Preview는 `MarkdownContent` 재사용.
- `date-fns` **미설치**(날짜는 `Intl`+KST `parseServerDate`). 허용 스택상 추가 금지 → DateTimePicker(03)는 라이브러리 없이 직접/네이티브.
- Button `destructive` variant **이미 존재** → 신규 작업 아님.
- `handleApiError`는 7종 이미 처리 → 5종만 추가.

## 완료 기준

- [ ] `<RequirePermission>` + `useHasPermission`/`useHasAnyPermission`(useMe 기준, 로딩 비렌더) — 기존 함수 재사용.
- [ ] `apiMutate`(2xx 반환/비-2xx ApiError/204 void) + `adminOnError`·`isOptimisticLockConflict` + `adminKeys`.
- [ ] `handleApiError` 5코드 확장(`ROLE_IN_USE`·`DEPARTMENT_HAS_CHILDREN`·`FILE_SIZE_EXCEEDED`·`FILE_STORAGE_ERROR`·`INTERNAL_ERROR`).
- [ ] `DeleteConfirmDialog`(경고문·선택적 비번 재인증, button-destructive 재사용).
- [ ] `/mypage` 관리 허브 섹션(권한별 도메인 카드) + `/mypage/manage/layout.tsx` 로그인 가드 + 인덱스 `/mypage` 리다이렉트.
- [ ] DESIGN.md `components`에 `manage-hub` 추가.
- [ ] 공용 모듈 단위 테스트 작성(80%+), `pnpm lint` + `npx tsc --noEmit` 통과.
- [ ] hex·px 인라인 0·`typo.*` 사용·UI 이모지 0·아이콘 lucide·JSX 조건부 삼항.

## 이연 항목 (01 비범위 — 후속 이슈)

DataTable(05/06) · MarkdownEditor·TagMultiSelect(02) · DateTimePicker(03) · MediaUploader(05) · 인라인 액션 레이어 첫 실증(02) · `admin-data-table` DESIGN 등록(첫 소비 시).
