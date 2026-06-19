# 어드민 07A — 역할·권한 관리 (Governance: Roles) 설계

- 이슈: `.issues/admin/20260618_기능추가_역할_권한_관리.md` (에픽 `.issues/admin/00-epic.md`, 원본 `07-governance.md`를 A/B로 분할)
- 트랙: 어드민 2차 배치 07A — 거버넌스 2분할 중 **선행**. (후행 07B = 회원 관리 + 약관 리셋, 별도 스펙)
- 범위: **역할** CRUD + **역할별 권한 일괄설정**(권한 매트릭스) 운영자 화면 1종.
- 비범위: 회원 목록·승인·역할 부여·비번 초기화·약관 리셋 = **07B** 소관. (단, 본 스펙의 `getRoles`·위계 가드 헬퍼는 07B가 재사용하도록 설계한다 — §12.)

---

## 1. 배경 — API 사용/미사용 현황

| 엔드포인트 | 인증 | 현재 상태 |
|---|---|---|
| `GET /api/admin/roles` | `ROLE_MANAGE` | ❌ 미사용 → 07A 신설. priority 내림차순 **비페이징 평배열** |
| `POST /api/admin/roles` | `ROLE_MANAGE` | ❌ 미사용 → 07A 신설 |
| `PATCH /api/admin/roles/{id}` | `ROLE_MANAGE` | ❌ 미사용 → 07A 신설 |
| `DELETE /api/admin/roles/{id}` | `ROLE_MANAGE` | ❌ 미사용 → 07A 신설. **물리 삭제** |
| `PUT /api/admin/roles/{id}/permissions` | `ROLE_MANAGE` | ❌ 미사용 → 07A 신설. 권한 **이름 배열**로 전체 교체 |
| `GET /api/admin/permissions` | `ROLE_MANAGE` | ❌ 미사용 → 07A 신설. 권한 카탈로그(체크박스 소스) |

**설계를 좌우하는 사실 5가지**

1. **역할은 `version`(낙관락)·단건 GET이 없다.** `RoleResponse`에 version 필드 없음, `RoleUpdateRequest`에도 없음, `GET /api/admin/roles/{id}` 미존재. → 태그·직분(06)과 동일하게 **수정·권한 시드는 목록 행 값에서 직접**. 409 재조회 로직 불필요.
2. **`GET /api/admin/roles`의 `RoleResponse`는 `permissions[]`를 포함**(각 `{id,name,description}`). → 권한 다이얼로그 시드를 위한 별도 호출 불필요. 목록 한 번으로 역할+보유권한 모두 확보.
3. **권한 설정 PUT은 권한 *이름* 문자열 배열을 전송**(id 아님)하고 **전체 교체**(빈 배열=전 권한 회수)다. → 다이얼로그는 체크된 권한의 `name`들을 모아 한 번에 PUT.
4. **위계 가드는 서버가 최종 방어**: 대상 역할 `priority > 요청자 maxPriority` 또는 `isSystem`이면 수정·삭제·권한설정 모두 403. 생성은 `priority ≤ maxPriority`(같은 등급 허용). 삭제는 멤버 할당 시 409 `ROLE_IN_USE`. → 화면은 동일 조건으로 버튼 **선제 비활성**(UX), 서버 403/409는 토스트로 폴백.
5. **공개 ISR 소비자 0.** 역할·권한은 공개 페이지가 없다. → `revalidateTags` 류 **미사용**. 클라 쿼리 무효화만.

> POST 성공코드는 OpenAPI 응답맵상 `200`(설명문만 "201"). `apiMutate`가 2xx 일괄 처리(204 분기)하므로 코드 하드코딩 없음 — 06 선례 동일.

---

## 2. 아키텍처

```
src/lib/api/
  types.ts                          ← RoleResponse · PermissionResponse 추가(응답 타입)
  roles.admin.ts          (신규)     ← client-only: getRoles/createRole/patchRole/deleteRole/setRolePermissions + 요청 타입
  permissions.admin.ts    (신규)     ← client-only: getPermissions(권한 카탈로그)
src/lib/admin/
  roleGuards.ts           (신규)     ← canManageRole(role, maxPriority) 위계 판별식(07B 공유)
src/components/admin/roles/
  schema.ts               (신규)     ← createRoleSchema(maxPriority): name·priority·description
  RoleManager.tsx         (신규)     ← 오케스트레이터(목록·툴바·다이얼로그 3종 배선)
  RoleFormDialog.tsx      (신규)     ← 역할 생성/수정 공용(행 값 시드)
  RolePermissionsDialog.tsx (신규)   ← 권한 체크박스 매트릭스 → 전체 교체 PUT
src/app/(site)/mypage/manage/roles/
  page.tsx                (신규)     ← Container+h1+RequirePermission "ROLE_MANAGE"
.claude/rules/DESIGN.md             ← 어드민 공용 블록 07 구획에 컴포넌트 3종 등록
```

**무변경(이미 정합)**: `src/lib/admin/manageDomains.ts`(`roles` 카드·경로·권한 보유, 줄22), `src/constants/permissions.ts`(`ROLE_MANAGE` 라벨 + `permissionLabel()` 헬퍼 보유). 관리 허브 카드는 권한 보유 시 자동 노출.

도메인별 분리(04·06 선례) — 공용 제네릭 미도입. 공용 primitive(`DataTable`·`DeleteConfirmDialog`·`apiMutate`·`adminOnError`·`adminKeys`)는 재사용.

---

## 3. 데이터 계층

### 3-1. 응답 타입 (`src/lib/api/types.ts`)
```ts
export interface PermissionResponse {
  id: number;
  name: string;        // 코드형 키. 예: "ROLE_MANAGE"
  description: string;  // 서버 한글 설명(보조)
}
export interface RoleResponse {
  id: number;
  name: string;
  priority: number;
  isSystem: boolean;
  description: string;
  permissions: PermissionResponse[]; // 역할이 현재 보유한 권한
}
```
> 역할에는 `version`/`createdAt`이 없다(서버 스키마 그대로). 추가하지 않는다.

### 3-2. 어드민 읽기 (client-only — RSC 번들 금지 주석 명시)
역할·권한 카탈로그 모두 `ROLE_MANAGE` 게이트 → `authFetch`+`parseJson` 직접 사용(미디어 `listMedia` 선례). `next` 캐시 옵션 없음(공개 소비자 0).
```ts
// roles.admin.ts (클라 전용 — RSC import 금지)
export async function getRoles(): Promise<RoleResponse[]> {
  const res = await authFetch("/api/admin/roles");
  return parseJson<RoleResponse[]>(res); // priority 내림차순 평배열
}
```
```ts
// permissions.admin.ts (클라 전용 — RSC import 금지)
export async function getPermissions(): Promise<PermissionResponse[]> {
  const res = await authFetch("/api/admin/permissions");
  return parseJson<PermissionResponse[]>(res);
}
```

### 3-3. 어드민 쓰기 (`apiMutate` — authFetch+2xx 처리·204 분기)
요청 타입은 도메인-로컬(병렬화 스펙). 역할은 version 없음.
```ts
// roles.admin.ts
export interface RoleCreateRequest { name: string; priority: number; description?: string }
export interface RoleUpdateRequest { name: string; priority: number; description?: string } // PATCH; name·priority 항상 전송(폼 강제), description만 선택
export interface RolePermissionsRequest { permissions: string[] } // 권한 '이름' 배열, 전체 교체

export function createRole(body: RoleCreateRequest): Promise<RoleResponse>            // POST /api/admin/roles
export function patchRole(id: number, body: RoleUpdateRequest): Promise<RoleResponse> // PATCH /api/admin/roles/{id}
export function deleteRole(id: number): Promise<void>                                 // DELETE (204)
export function setRolePermissions(id: number, names: string[]): Promise<RoleResponse> // PUT /api/admin/roles/{id}/permissions  body={permissions:names}
```
> 명명: PATCH 동사 일치(`patchTag`/`patchAlbum` 선례)로 `patchRole`. 권한 설정은 의미를 살려 `setRolePermissions`(PUT 전체 교체).
> `RoleUpdateRequest`는 OpenAPI상 전 필드 optional이나, 프론트는 `name`·`priority`를 필수로 좁힌다(폼이 항상 전송). 부분수정 의도가 아니라 폼 전체 제출이므로 안전.

---

## 4. 위계 가드 (핵심)

### 4-1. 판별식 (`src/lib/admin/roleGuards.ts` — 07B 공유)
```ts
import type { RoleResponse } from "@/lib/api/types";
// 시스템 역할 아님 && 대상 우선순위가 내 최대 등급 이하(같은 등급 허용)
export function canManageRole(role: RoleResponse, maxPriority: number): boolean {
  return !role.isSystem && role.priority <= maxPriority;
}
```
- `me.maxPriority`는 `useMe()`(`MeResponse.maxPriority`, 이미 존재)에서 취득.
- **범위 한정(재사용 주의)**: `canManageRole`은 **편집·삭제·권한설정**(세 API 모두 `isSystem` 차단, `priority ≤ max` 동급 허용)에만 쓴다. 07B의 회원 *역할 부여/회수*에는 **재사용 금지** — 부여 API(`validateGrantable`)는 `priority` **동급·초과**·자기부여를 막고(**strict** — 동급도 차단) `isSystem`은 제한하지 않으며, `MEMBER`(시스템 역할) 부여가 곧 승인이라 isSystem을 제외하면 승인이 막힌다. 07B는 우선순위 단독 `canAssignRole`을 별도로 둔다(§12).

### 4-2. 표시
- `canManageRole=false` 행 → **수정·권한·삭제 버튼 모두 `disabled`** + `title`(툴팁) 사유: `isSystem`이면 "시스템 역할은 변경할 수 없습니다", 아니면 "내 등급보다 높은 역할입니다".
- `isSystem` 역할은 시스템 컬럼에 토큰 배지(`bg-surface-strong`, `rounded-sm`, `typo.caption`) "시스템" 표시.

---

## 5. 스키마 (zod) — `src/components/admin/roles/schema.ts`

`priority` 상한이 런타임 값(`maxPriority`)이라 **스키마 팩토리**로 만든다(정적 export 불가). `optional().default()` 미사용(04·06 선례). 기본값은 `useForm defaultValues` 주입.
```ts
export function createRoleSchema(maxPriority: number) {
  return z.object({
    name: z.string().trim().min(1, "이름을 입력해 주세요.").max(50, "50자 이내로 입력해 주세요."),
    priority: z.number().int().max(maxPriority, "내 등급보다 높게 만들 수 없습니다."), // 하한 없음(계약 무제약)
    description: z.string().trim().max(255, "255자 이내로 입력해 주세요."), // 빈 문자열 허용
  });
}
export type RoleFormValues = z.infer<ReturnType<typeof createRoleSchema>>;
```
> **zod v4 주의**(프로젝트 4.4.3): v3의 `z.number({invalid_type_error})`/`required_error` 인자는 제거됨 — `departments/schema.ts` 동형으로 메시지 인자 없이 기본 메시지. `priority`는 `Controller`로 ""↔숫자 매핑(직분 `sortOrder` 선례). `.max(maxPriority)`는 inclusive라 "같은 등급 허용" 시맨틱과 일치. **하한 없음**: 서버 계약이 priority에 0 이상 제약을 두지 않으므로 `.nonnegative()`를 넣지 않는다(불필요한 제약 발명 금지 — 음수 `maxPriority`에서 폼 불능 방지).
- 컴포넌트에서 `useMemo(() => createRoleSchema(me.maxPriority), [me.maxPriority])`로 생성.

---

## 6. 컴포넌트 (`src/components/admin/roles/`)

### 6-1. RoleManager (자립 오케스트레이터)
- `useQuery(adminKeys.list("roles"), getRoles)` — 역할 목록.
- 공용 `DataTable` 컬럼:
  | 역할명 | 우선순위(`typo.datetime` tnum) | 권한(보유 수, 예 "5") | 시스템(배지) | 액션 |
- 액션 버튼 3종 `수정`·`권한`·`삭제` — `canManageRole(role, me.maxPriority)`가 false면 셋 다 `disabled`+`title` 사유.
- 툴바 `＋역할 추가` → RoleFormDialog(create). (생성도 `me.maxPriority` 범위 내 priority만 허용.)
- 삭제: 공용 `DeleteConfirmDialog`(`requirePassword=false`) + 경고문 "이 역할을 삭제합니다. 되돌릴 수 없습니다." + Manager 보유 delete mutation의 `pending`/`onConfirm` 주입.
- 상태: `dialog {open, mode, target}` + `permTarget` + `deleteTarget`. **effect 미사용**(이벤트 핸들러 직접 처리).
- onSuccess: `qc.invalidateQueries(adminKeys.list("roles"))` + `notify.success` + 다이얼로그 닫기. **revalidate 없음**(공개 소비자 0).
- **자기 권한 동기화**: `patchRole`(우선순위 변경)·`setRolePermissions`은 운영자가 *자신이 보유한* 역할을 바꾸면 `MeResponse.maxPriority`·`permissions`가 변하므로, 두 mutation onSuccess에서 `qc.invalidateQueries({ queryKey: ["me"] })`도 호출 → `useMe()` 게이트 즉시 갱신. (`deleteRole`은 보유 역할이면 `ROLE_IN_USE`로 차단돼 자기 등급을 못 바꾸고, `createRole`은 미보유라 자기 영향 없음 → `["me"]` 무효화 불요.)
- onError: `adminOnError({...})`. 특히 삭제는 `ROLE_IN_USE` 핸들러 → "이 역할을 쓰는 회원이 있어 삭제할 수 없습니다." 토스트.
- 로딩 → `DataTable loading`. 빈 목록 → `empty`("등록된 역할이 없습니다.").

### 6-2. RoleFormDialog (FormDialog 패턴: AlbumFormDialog/PositionFormDialog 동형)
- RHF + `zodResolver(useMemo schema)`. props: `{ open, onOpenChange, mode, initial?: RoleResponse }`.
- effect로 `open/mode/initial` 변화 시 `reset`만(setState-in-effect 아님 — lint 통과). create=빈 폼(`{name:"", priority:0, description:""}`), edit=행 값 시드(`permissions[]`는 이 폼이 다루지 않음).
- 필드: `이름`(Input), `우선순위`(number Input, `Controller`), `설명`(Input/textarea). 우선순위 헬퍼 텍스트: "내 최대 등급: {maxPriority} (같은 등급까지 만들 수 있습니다)".
- 제출: create=`createRole`, edit=`patchRole(id, body)`. body=`{name, priority, description}`.
- 중복(409 `DUPLICATE_RESOURCE`) → `onDuplicate` → `setError("name", ...)` 인라인, 다이얼로그 유지.
- 위계 초과(403) → 토스트 폴백(폼 `.max` 검증으로 거의 차단됨).

### 6-3. RolePermissionsDialog (신규 패턴)
- props: `{ open, onOpenChange, role: RoleResponse }`(행 값 직접 시드 — 별도 GET 없음).
- `useQuery(adminKeys.list("permissions"), getPermissions)` — 카탈로그(체크박스 universe). `staleTime` 길게(정적).
- 로컬 상태 `selected: Set<string>` — 초기값 = `role.permissions.map(p => p.name)`. 다이얼로그 열릴 때 `reset`.
- 렌더: `Checkbox`(DESIGN `checkbox`, 24px) 2열 그리드. 라벨 = `permissionLabel(p.name)`(PERMISSION_LABELS 우선, 미정의 시 raw name 폴백 — 현재 카탈로그 전 권한이 라벨 보유라 폴백은 forward-compat용). 행 전체 클릭 토글.
- 저장: `setRolePermissions(role.id, [...selected])`(전체 교체). onSuccess → `invalidateQueries(adminKeys.list("roles"))`+notify+닫기.
- 위계 가드: 잠긴 역할은 RoleManager에서 `권한` 버튼이 이미 `disabled`라 다이얼로그 자체가 안 열림. (이중 안전: 서버 403 토스트.)

> 판단지점 #3 정밀화: 라벨은 기존 `permissionLabel()` 헬퍼 그대로 사용(PERMISSION_LABELS→raw name). 서버 `description` 폴백은 라벨이 완비돼 실질 불필요하므로 도입하지 않음(헬퍼 일관성 우선). 변경 원하면 헬퍼 확장으로 처리.

---

## 7. 라우트 (`src/app/(site)/mypage/manage/roles/page.tsx`)

```tsx
export default function ManageRolesPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>역할·권한 관리</h1>
      <div className="mt-xl">
        <RequirePermission permission="ROLE_MANAGE" fallback={<EditAccessDenied />}>
          <RoleManager />
        </RequirePermission>
      </div>
    </Container>
  );
}
```
- `useSearchParams` 미사용 → Suspense 경계 불필요. 부모 `manage/layout`이 로그인 가드.

---

## 8. 쿼리키 · 캐시 무효화

| 소비자 | 종류 | 무효화 |
|---|---|---|
| RoleManager 목록 | 클라 `useQuery(adminKeys.list("roles"))` | 모든 역할 mutation onSuccess → `qc.invalidateQueries(adminKeys.list("roles"))` |
| 운영자 본인 `useMe()` | 클라 `useQuery(["me"])` | `patchRole`(priority)·`setRolePermissions` onSuccess → `qc.invalidateQueries(["me"])` (자기 보유 역할 수정 시 maxPriority·permissions 동기화) |
| 권한 카탈로그 | 클라 `useQuery(adminKeys.list("permissions"))` | 변동 없음(읽기 전용 카탈로그). `staleTime` 길게 |
| 07B 회원 역할 부여 드롭다운 | 클라 `useQuery(adminKeys.list("roles"))` | **동일 키 공유** → 역할 mutation이 자동 반영 |

공개 ISR 소비자 없음 → `revalidate*` 미호출. (06 직분과 동일 근거.)

---

## 9. 디자인 토큰·DESIGN.md 등록

- `typo.*`·spacing 토큰만. hex·px 인라인 금지. 섹션 제목 `typo.displayMd`. 우선순위 숫자 `typo.datetime`(tnum).
- UI 이모지 금지, 아이콘 `lucide-react`(`currentColor`). JSX 조건부 삼항.
- 어드민(가독성 우선 단순 변형)이되 토큰 공유(DESIGN.md Known Gaps).
- **DESIGN.md 어드민 공용 블록 07 구획**에 등록:
  - `role-manager`: 역할 목록·CRUD 화면. `DataTable`(역할명·우선순위·권한수·시스템) + 행 수정/권한/삭제. 위계 가드로 잠긴 행 비활성.
  - `role-form-modal`: 역할 생성·수정 Dialog. `Input`(이름)+number(우선순위, `≤ maxPriority`)+설명. 중복 시 name 인라인 에러.
  - `role-permissions-modal`: 역할별 권한 매트릭스 Dialog. `getPermissions` 기반 `Checkbox` 2열, 전체 교체 PUT.

---

## 10. 에러·엣지 처리

| 상황 | 처리 |
|---|---|
| 이름 빈값/50자 초과 | zod → RHF 인라인(제출 차단) |
| 우선순위 > 내 등급 | zod `.max(maxPriority)` → 인라인 에러(제출 차단). 서버 403은 폴백 |
| 이름 중복(409 DUPLICATE_RESOURCE) | `onDuplicate` → name 인라인, 다이얼로그 유지 |
| 역할 삭제 — 멤버 할당(409 ROLE_IN_USE) | 삭제 다이얼로그 유지 + "이 역할을 쓰는 회원이 있어 삭제할 수 없습니다." 토스트 |
| 위계 위반(403 ACCESS_DENIED) | 토스트(버튼 비활성으로 거의 미발생) |
| 존재하지 않는 권한(400 INVALID_INPUT_VALUE) | 토스트(카탈로그에서만 보내 거의 미발생) |
| 권한 없음 | `RequirePermission` → `EditAccessDenied`(제목·컨테이너는 렌더) |
| 빈 목록/로딩 | DataTable `empty`/`loading` |

---

## 11. 테스트 (vitest, globals:false 명시 import·jest-dom 없음·next/link mock — 프론트 관례)

| 파일 | 검증 |
|---|---|
| `lib/api/roles.admin.test.ts` | getRoles GET 경로; create POST·patch PATCH·delete DELETE(204); **setRolePermissions가 `{permissions:[names]}`를 PUT `/{id}/permissions`로 전송** |
| `lib/api/permissions.admin.test.ts` | getPermissions 경로·비2xx throw |
| `lib/admin/roleGuards.test.ts` | `canManageRole`: isSystem→false; priority>max→false; priority==max→true; priority<max→true |
| `components/admin/roles/schema.test.ts` | name 빈값·51자 실패; priority 소수·`>maxPriority` 실패; `==maxPriority`·**음수 통과(하한 없음 — 계약 무제약)**; description 256자 실패 |
| `components/admin/roles/RoleManager.test.tsx` | 목록 렌더(권한 수·시스템 배지); 잠긴 행 액션 disabled; ＋역할 추가; 삭제확인→deleteRole; ROLE_IN_USE→토스트; onSuccess invalidate(roles); empty |
| `components/admin/roles/RoleFormDialog.test.tsx` | create POST body{name,priority,description}; edit 행 시드→PATCH; **edit onSuccess→invalidate(`['roles']`+`['me']`)**; 중복→name 인라인; priority>max 차단; priority 음수 허용; 재오픈 reset |
| `components/admin/roles/RolePermissionsDialog.test.tsx` | 카탈로그 렌더; role.permissions로 초기 체크 시드; 토글 후 저장→setRolePermissions(id, 선택 name 배열); 전체 해제→빈 배열 PUT; **onSuccess→invalidate(`['roles']`+`['me']`)** |

**완료 게이트**: `pnpm test` 전체 통과 · `npx tsc --noEmit` 0 · `pnpm lint` 0. 커버리지 80%+.

---

## 12. 07B(회원 관리)와의 인터페이스

- **재사용 export**: `getRoles` + `adminKeys.list("roles")`(역할 부여 드롭다운 데이터)만 재사용. 07B는 신규 역할 조회 코드를 만들지 않고 본 스펙 자산을 import.
- **가드는 재사용하지 않는다(중요)**: `canManageRole`(=`!isSystem && priority ≤ max`, 역할 정의 편집 전용 — 동급 허용 `<=`, 백엔드 `validateMutable`와 일치, 미변경)은 **편집·삭제·권한설정 전용**이다. 회원 *역할 부여/회수*에 재사용하면 `MEMBER`(시스템 역할)이 후보에서 빠져 **교인 승인이 불가능**해진다. 07B는 **우선순위 단독·엄격** 판별식 `canAssignRole(role, maxPriority) = role.priority < maxPriority`을 `roleGuards.ts`에 추가해 쓴다 — 백엔드 `validateGrantable`가 **동급도 차단**(strict): ADMIN은 동급 ADMIN을 위임/회수 못 하고 **SUPER_ADMIN만** 가능. `isSystem`은 제한하지 않음(MEMBER 부여=승인 허용); 자기 자신·마지막 SUPER_ADMIN 등은 서버가 403으로 방어. ⚠️ `canManageRole`(`<=`)과 `canAssignRole`(`<`)은 부등호가 다르다 — 백엔드가 *역할 정의 편집*은 동급 허용, *회원 위임/박탈*은 동급 차단으로 분리했기 때문.
- **권한 분리 주의**: 본 화면 전체는 `ROLE_MANAGE`. 07B에서 회원에게 역할을 부여/회수하는 액션도 `ROLE_MANAGE`이나, 회원 목록·정보수정·비번초기화·약관리셋은 `MEMBER_MANAGE`. 두 권한은 독립 게이트.

---

## 13. 구현 순서(계획 단계에서 세분)

1. 응답 타입(`RoleResponse`·`PermissionResponse`) → 어드민 읽기(`getRoles`·`getPermissions`) → 어드민 쓰기(`roles.admin` 4종).
2. 위계 가드(`roleGuards.ts`).
3. 스키마 팩토리.
4. RoleFormDialog → RolePermissionsDialog → RoleManager.
5. 라우트.
6. DESIGN.md 07 구획 등록.
7. 테스트(각 단계 TDD: RED→GREEN).
