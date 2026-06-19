# 어드민 07B — 회원 관리 및 약관 일괄 리셋 (Governance: Members) 설계

- 이슈: `.issues/admin/20260618_기능추가_회원_관리_약관_리셋.md` (에픽 `.issues/admin/00-epic.md`, 원본 `07-governance.md`를 A/B로 분할)
- 트랙: 어드민 2차 배치 07B — 거버넌스 2분할 중 **후행**. (선행 07A = 역할·권한 관리 `docs/superpowers/specs/2026-06-18-admin-governance-roles-design.md`)
- 범위: **회원** 목록·검색·상세, **정보 수정**(이름·전화·이메일), **역할 부여·회수**(=승인), **비밀번호 초기화**(임시값 1회), **약관 일괄 리셋**(전역) 운영자 화면 1종.
- 비범위: 역할 *정의* CRUD·권한 매트릭스 = 07A 소관(본 스펙은 07A의 `getRoles`·`adminKeys.list("roles")`를 재사용). 본인 마이페이지(내 정보·약관·탈퇴, #16)는 별개.

---

## 1. 배경 — API 사용/미사용 현황

| 엔드포인트 | 메서드 | 인증 | 현재 상태 |
|---|---|---|---|
| `/api/members` | GET | `MEMBER_MANAGE` | ❌ 미사용 → 07B 신설. ⚠️ **admin 미접두**(읽기 경로). `q`(이름·전화 부분검색)·`page`·`size`·`sort` → `Page<MemberCardResponse>` |
| `/api/members/{uuid}` | GET | `MEMBER_MANAGE` | ❌ 미사용 → 07B 신설. ⚠️ **admin 미접두**(읽기 경로). `MemberDetailResponse`(이메일·권한·동의상태 포함) |
| `/api/admin/members/{uuid}` | PATCH | `MEMBER_MANAGE` | ❌ 미사용 → 07B 신설. **admin 접두**(쓰기). `AdminMemberUpdateRequest`(name·phone·email **전부 선택**) |
| `/api/admin/members/{uuid}/roles` | POST | `ROLE_MANAGE` | ❌ 미사용 → 07B 신설. `{roleId}`, 멱등, 반환 `MemberDetailResponse` |
| `/api/admin/members/{uuid}/roles/{roleId}` | DELETE | `ROLE_MANAGE` | ❌ 미사용 → 07B 신설. 회수(204), 멱등 |
| `/api/admin/members/{uuid}/reset-password` | POST | `MEMBER_MANAGE` | ❌ 미사용 → 07B 신설. `ResetPasswordResponse{temporaryPassword}` 평문 1회 |
| `/api/admin/agreements/reset` | POST | `MEMBER_MANAGE` | ❌ 미사용 → 07B 신설. `{target:"terms"\|"privacy"}` → **전체 회원** 플래그 일괄 false(200, 본문 없음) |

**설계를 좌우하는 사실 7가지**

1. **약관 리셋은 회원별이 아니라 *전역*이다.** `POST /api/admin/agreements/reset`의 `target`은 *어느 회원*이 아니라 *어느 동의 항목*(`terms` 또는 `privacy`)을 고르는 것이고, 해당 플래그를 **전체 회원** 대상으로 false 초기화한다(개정 시 재동의 사이클 트리거). → 회원 목록·상세와 무관한 **전역 액션**이라 별도 패널로 분리하고, 회원 카드 캐시를 무효화하지 않는다(영향은 다음 로그인 `requiresAgreement`). 이슈 본문의 "대상별로"는 *항목별*(약관/개인정보)을 뜻한다.
2. **역할 부여/회수 위계 가드는 *strict*(동급 차단)다.** 백엔드 `validateGrantable`는 `role.priority < 요청자 maxPriority`만 허용 — ADMIN은 동급 ADMIN을 위임/회수 못 하고 **SUPER_ADMIN만** 가능. ⚠️ api-docs.json 본문 텍스트("요청자 maxPriority보다 높은 priority면 403" — `<=` 허용처럼 읽힘)는 최신 백엔드 변경 이전 표현으로 **신뢰하지 않는다**. 07A 스펙 §12·#51 리포트가 확정한 `canAssignRole = role.priority < maxPriority`를 따른다.
3. **`canManageRole`(07A) 재사용 금지.** 07A의 `!isSystem && priority <= maxPriority`(역할 정의 편집용, 동급 허용)를 회원 역할 부여/회수에 쓰면 ① `isSystem` 제외로 **MEMBER(시스템 역할) 부여=승인이 차단**되고 ② 부등호(`<=`)가 위임 계약(`<`)과 다르다. → `roleGuards.ts`에 **별도** `canAssignRole`을 추가한다(§4).
4. **부여 가능 역할 = 07A `getRoles()` 재사용.** 회원에게 부여할 후보는 전체 역할 중 `canAssignRole` 통과 && 회원 미보유. 07A의 `getRoles`·`adminKeys.list("roles")` 동일 키 공유(별도 조회 코드 미작성).
5. **비밀번호 임시값은 1회·휘발.** `ResetPasswordResponse.temporaryPassword`는 응답으로만 평문 1회 전달(로그·예외 미노출). → **쿼리 캐시에 저장하지 않고** 다이얼로그 로컬 state로만 보관, 다이얼로그가 닫히면 언마운트로 소멸(재조회 경로 없음).
6. **회원 식별자는 `uuid`(문자열).** 목록·상세·수정·역할·비번 전 경로가 `uuid` 기반. 역할 회수만 `{uuid}/roles/{roleId}`로 roleId 추가. 자기 자신 가드는 `member.uuid === me.uuid`로 판별.
7. **읽기·쓰기 경로 접두가 비대칭이다(⚠️ 함정).** 읽기(목록·상세)는 `/api/members`·`/api/members/{uuid}`(**admin 미접두**, 단 둘 다 `MEMBER_MANAGE` 게이트 — 공개 아님), 쓰기(수정·역할 부여/회수·비번초기화)는 `/api/admin/members/{uuid}*`, 약관 리셋은 `/api/admin/agreements/reset`. → API 함수 작성 시 **GET만 `/api/members*`, 변이는 `/api/admin/members*`**로 분기한다(둘 다 admin 접두를 붙이면 GET이 404).

> POST 성공코드는 OpenAPI 응답맵상 `200`(설명문 "201"). `apiMutate`가 2xx 일괄 처리(204 분기)하므로 코드 하드코딩 없음 — 06·07A 선례 동일.

---

## 2. 아키텍처

```
src/lib/api/
  members.admin.ts        (신규)  ← client-only: listMembers/getMember/updateMember/grantRole/revokeRole/resetPassword + 타입
  agreements.admin.ts     (신규)  ← client-only: resetAgreements(target) (전역 사이클 API, 태그 "약관(관리)")
src/lib/admin/
  memberGuards.ts         (신규)  ← canAssignRole(role, maxPriority)=priority<maxPriority (strict, 07B 전용)
src/components/admin/members/
  schema.ts               (신규)  ← memberUpdateSchema: name·phone·email
  MemberManager.tsx       (신규)  ← 오케스트레이터(검색·목록·페이지네이션·상세 다이얼로그·약관 패널 배선)
  AgreementResetPanel.tsx (신규)  ← 전역 약관/개인정보 리셋(강한 확인창)
  MemberDetailDialog.tsx  (신규)  ← getMember 패칭 + 하위 섹션 오케스트레이션
  MemberProfileForm.tsx   (신규)  ← 다이얼로그 내 인라인 편집(이름·전화·이메일)
  MemberRolesSection.tsx  (신규)  ← 보유 역할 chips·회수 + 부여(가능목록 필터). ROLE_MANAGE 게이트
  ResetPasswordSection.tsx(신규)  ← 인라인 확인 → 임시 비번 1회 표시(복사)·휘발
src/app/(site)/mypage/manage/members/
  page.tsx                (신규)  ← Container+h1+RequirePermission "MEMBER_MANAGE"
.claude/rules/DESIGN.md           ← 어드민 공용 블록 07 구획에 컴포넌트 6종 등록
```

**무변경(이미 정합)**: `src/lib/admin/manageDomains.ts` — `members` 카드(`MEMBER_MANAGE` · `/mypage/manage/members` · `kind:"manage"`, 줄21) 이미 존재. 관리 허브 카드는 권한 보유 시 자동 노출. `src/constants/permissions.ts`의 `MEMBER_MANAGE`·`ROLE_MANAGE` 라벨도 보유.

도메인별 분리(04·06·07A 선례) — 공용 제네릭 미도입. 공용 primitive(`DataTable`·`Pagination`·`DeleteConfirmDialog`·`dialog`·`apiMutate`·`adminOnError`·`adminKeys`·`getRoles`·`useMe`·`formatPhone`)는 재사용.

---

## 3. 데이터 계층

### 3-1. 응답·요청 타입 (`src/lib/api/members.admin.ts` — 도메인-로컬, `MEMBER_MANAGE` 게이트 전용 GET이라 공개/RSC 소비자 없음)
```ts
export interface MemberCardResponse {   // 목록 카드(GET /api/members)
  uuid: string;
  name: string;
  phone: string;
  position: string;        // 직분(한글 표시용)
  roles: string[];         // 역할명 배열
  approved: boolean;       // MEMBER 보유 여부(=교인 승인)
  createdAt: string;       // LocalDateTime
}
export interface MemberDetailResponse { // 상세(GET /api/members/{uuid})
  uuid: string;
  name: string;
  phone: string;
  email: string;
  position: string;
  roles: string[];
  permissions: string[];   // 역할로부터 합산된 권한명
  approved: boolean;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  agreedAt: string | null; // @JsonInclude(NON_NULL) — 미동의 시 누락 가능
  createdAt: string;
}
export interface AdminMemberUpdateRequest { name?: string; phone?: string; email?: string } // PATCH, 폼 전체 전송
export interface MemberListParams { q?: string; page?: number; size?: number; sort?: string }
export interface ResetPasswordResponse { temporaryPassword: string }
```
> 역할 부여 요청은 07A `RoleGrantRequest`가 아니라 본 파일에서 `grantRole(uuid, roleId)`로 `{roleId}` 직접 전송(단일 필드라 별도 인터페이스 불필요).

### 3-2. 어드민 읽기 (client-only — RSC 번들 금지 주석 명시)
`MEMBER_MANAGE` 게이트 → `authFetch`+`parseJson`. `next` 캐시 옵션 없음(공개 소비자 0). 쿼리스트링은 `media.admin.ts buildMediaQuery` 동형 헬퍼.
> ⚠️ **읽기 경로는 admin 미접두** `/api/members*`(사실 #7). 쓰기(§3-3)만 `/api/admin/members*`. 같은 파일에 두 접두가 공존하니 GET/변이를 분리해서 작성한다.
```ts
// members.admin.ts (클라 전용 — RSC import 금지)
export async function listMembers(p: MemberListParams = {}): Promise<Page<MemberCardResponse>> {
  const res = await authFetch(`/api/members${buildMemberQuery(p)}`); // ?q=&page=&size=&sort=  (admin 미접두)
  return parseJson<Page<MemberCardResponse>>(res);
}
export async function getMember(uuid: string): Promise<MemberDetailResponse> {
  const res = await authFetch(`/api/members/${uuid}`); // admin 미접두
  return parseJson<MemberDetailResponse>(res);
}
```
> `Page<T>`·`PageMeta`는 `@/lib/page` 재사용(`media.admin` 선례). `buildMemberQuery`는 `q`/`page`/`size`/`sort`만 set(빈 값 생략).

### 3-3. 어드민 쓰기 (`apiMutate` — authFetch+2xx 처리·204 분기)
```ts
// members.admin.ts
export function updateMember(uuid: string, body: AdminMemberUpdateRequest): Promise<MemberDetailResponse>  // PATCH /api/admin/members/{uuid}
export function grantRole(uuid: string, roleId: number): Promise<MemberDetailResponse>                     // POST .../roles  body={roleId}
export function revokeRole(uuid: string, roleId: number): Promise<void>                                    // DELETE .../roles/{roleId} (204)
export function resetPassword(uuid: string): Promise<ResetPasswordResponse>                                // POST .../reset-password (본문 없음)
```
```ts
// agreements.admin.ts (클라 전용 — 전역 사이클)
export function resetAgreements(target: "terms" | "privacy"): Promise<void> // POST /api/admin/agreements/reset  body={target}
```
> 명명: 회원 *역할 부여/회수*는 도메인 동사 `grantRole`/`revokeRole`(07A `setRolePermissions`와 구분). `updateMember`는 PATCH지만 폼 전체(name·phone·email) 전송 — 부분수정 의도 아님.

---

## 4. 위계·자기 가드 (핵심)

### 4-1. 판별식 (`src/lib/admin/memberGuards.ts` — 07B 전용, 07A `roleGuards.ts`와 분리)
```ts
import type { RoleResponse } from "@/lib/api/roles.admin";
// 회원 역할 부여/회수 가드: 대상 역할 우선순위가 내 최대 등급보다 '엄격히 낮을' 때만(동급 차단).
// 백엔드 validateGrantable과 일치(ADMIN은 동급 ADMIN 위임/회수 불가, SUPER_ADMIN만 가능).
// isSystem은 제외하지 않는다 — MEMBER(시스템 역할) 부여가 곧 교인 승인이므로.
// 07A canManageRole(!isSystem && priority<=max, 역할 정의 편집용)과 의도·부등호가 다르다 → 재사용 금지.
export function canAssignRole(role: RoleResponse, maxPriority: number): boolean {
  return role.priority < maxPriority;
}
```
- `maxPriority`는 `useMe()`(`MeResponse.maxPriority`, 이미 존재). 자기 자신 판별은 `member.uuid === me.uuid`.
- **부여·회수 모두 동일 식**: 부여 후보 = 전체 역할 중 `canAssignRole` 통과 && 회원 미보유. 회수 가능 = 보유 역할 중 `canAssignRole` 통과(백엔드도 회수에 동일 strict 적용).

### 4-2. 표시
- **역할 섹션은 `ROLE_MANAGE` 보유 시에만 노출**(`RequirePermission permission="ROLE_MANAGE"` 또는 `useHasPermission`). 미보유면 역할은 read-only chips만.
- 부여/회수 버튼 비활성 조건(셋 중 하나라도): `maxPriority === undefined`(me 미로딩) · `isSelf` · `!canAssignRole(role, maxPriority)`. `title`/`aria-label`로 사유.
- me 미로딩(`maxPriority === undefined`) → 역할 변경 버튼 보수적 비활성(07A RoleManager 선례). 서버 403 최종 방어.

---

## 5. 스키마 (zod) — `src/components/admin/members/schema.ts`

정적 export(런타임 값 의존 없음). PATCH지만 폼은 세 필드 전체 제출.
```ts
export const memberUpdateSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(50, "50자 이내로 입력해 주세요."),
  phone: z.string().trim().min(1, "전화번호를 입력해 주세요."), // 정규화는 formatPhone 재사용
  email: z.string().trim().email("올바른 이메일 형식이 아닙니다.").or(z.literal("")), // 선택(빈 문자열 허용)
});
export type MemberFormValues = z.infer<typeof memberUpdateSchema>;
```
> **zod v4 주의**(프로젝트 4.4.3): `invalid_type_error`/`required_error` 인자 미사용(메모리 준수). 전화번호 형식 검증은 가입 폼(`auth/schemas.ts`·`formatPhone`) 패턴을 따른다 — 본 스키마는 비어있지 않음만 강제하고 표기 정규화는 `formatPhone`로 입력 시 처리(가입 선례 동형). email은 빈 문자열이면 미입력으로 간주(서버 PATCH는 빈 값도 수용하나, 폼은 형식만 검증).

---

## 6. 컴포넌트 (`src/components/admin/members/`)

### 6-1. MemberManager (자립 오케스트레이터, URL 구동)
- `useSearchParams`로 `q`·`page` 취득 → `params` → `useQuery(adminKeys.list("members", params), () => listMembers(params))`. (MediaLibrary 동형 — `Pagination`이 URL 구동이라 검색·페이지를 URL에 둔다.)
- 검색 input(이름·전화) → `setParam("q", value)`(빈 값 삭제 + `page` 리셋, `router.push`). 디바운스는 입력 onChange 300ms 또는 제출(form) 중 택1 — 계획 단계 확정(기본: 제출형, RSC 라우터 push 폭주 방지).
- 공용 `DataTable` 컬럼: `이름` · `전화`(`typo.datetime`) · `직분` · `역할`(badge 나열, 0개면 "—") · `승인`(approved Badge: true "승인"/false "대기") · `가입일`(`typo.datetime`). 행 후행 액션 `상세` → `setSelected(uuid)`.
- `Pagination`: `data.page.totalPages > 1`일 때만(MediaLibrary 동형).
- 상단 `AgreementResetPanel`(전역 — 회원 목록과 분리).
- 상세 다이얼로그: `<MemberDetailDialog uuid={selected} open={selected!==null} onOpenChange=.../>`.
- 조회 실패: `useEffect` + `adminOnError()(error)` 토스트(빈 목록과 혼동 방지, 07A RoleManager 선례).
- 상태: `selected: string | null`(상세 uuid). **effect는 조회실패 토스트만**.

### 6-2. AgreementResetPanel (전역 사이클)
- 카드형 패널(`rounded-xl` + 1px hairline). 헤딩 "약관 재동의 사이클" + 안내 배너(lucide `Info`): "**전체 회원**의 동의를 초기화합니다. 다음 로그인 시 재동의를 요구합니다. 되돌릴 수 없습니다."
- 버튼 2개: `약관 동의 리셋`·`개인정보 동의 리셋`. 각 클릭 → 강한 확인 Dialog(공용 `DeleteConfirmDialog` 재사용, `button-destructive` 확정) — 제목 "약관 동의를 초기화할까요?"/"개인정보 동의를 초기화할까요?", 경고문 "전체 회원에 적용되며 되돌릴 수 없습니다."
- 확정 → `useMutation(resetAgreements)` (`target` 분기). onSuccess → `notify.success("전체 회원의 {약관/개인정보} 동의를 초기화했습니다.")`. **회원 카드 무효화 없음**(카드 데이터 불변). onError → `adminOnError()`(400 INVALID_INPUT_VALUE 등).
- `MEMBER_MANAGE` 페이지 게이트 안이라 추가 게이트 불필요.

### 6-3. MemberDetailDialog
- props: `{ uuid: string | null, open, onOpenChange }`. `useQuery(adminKeys.detail("members", uuid), () => getMember(uuid), { enabled: open && !!uuid, retry: false })`.
- 로딩 → Skeleton. 실패 → `adminOnError` 토스트 + 닫기.
- 상세 표시(read view): 이름·전화·이메일·직분, `승인` Badge, 역할 chips, 권한 요약(개수 + 펼침 옵션), 동의 상태(약관/개인정보 Badge + `agreedAt` `typo.datetime`, null이면 "미동의").
- 하위 섹션: `MemberProfileForm`(인라인 편집 토글) · `MemberRolesSection`(ROLE_MANAGE) · `ResetPasswordSection`. **중첩 다이얼로그 회피** — 모두 다이얼로그 본문 내 인라인.
- 자기 자신(`member.uuid === me.uuid`) → 역할 섹션 비활성 사유 표시("자기 자신의 역할은 변경할 수 없습니다").

### 6-4. MemberProfileForm (다이얼로그 내 인라인 편집)
- read view ↔ edit form 토글(`isEditing` 로컬 state). RHF + `zodResolver(memberUpdateSchema)`, `defaultValues` = 상세 값. 전화는 `formatPhone`로 입력 정규화(가입 폼 선례).
- 제출 → `updateMember(uuid, {name, phone, email})`. onSuccess → `invalidate(adminKeys.detail("members", uuid))` + `invalidate(["admin","members","list"])` + 편집 종료 + notify. **자기 수정 시(`uuid===me.uuid`)** `["me"]`도 무효화.
- 전화 중복(409 `DUPLICATE_RESOURCE`) → `setError("phone", ...)` 인라인(다이얼로그 유지). 404(소프트삭제) → 토스트 + 닫기.

### 6-5. MemberRolesSection (ROLE_MANAGE 게이트)
- 보유 역할 chips(상세 `roles[]` 표시) — 회수(×) 버튼은 해당 역할의 `RoleResponse`가 필요하므로 `getRoles()`(`adminKeys.list("roles")` 재사용)와 이름 매칭해 priority 판정.
- 부여 컨트롤: `getRoles()` → `canAssignRole(role, maxPriority) && !roles.includes(role.name)` 필터 → `Select`/드롭다운. 선택 → `grantRole(uuid, roleId)`.
- 회수: 보유 역할 chip의 × → `revokeRole(uuid, roleId)`. 비활성 조건 §4-2.
- 부여/회수 공통 onSuccess: `grantRole`은 갱신 `MemberDetailResponse` 반환 → `setQueryData(adminKeys.detail("members", uuid))` 직접 갱신 + `invalidate(list)`. `revokeRole`(204)은 `invalidate(detail+list)`. **승인 상태(`approved`) 변동**(MEMBER 부여/회수)이 카드에 반영되므로 list 무효화 필수.
- onError: `adminOnError()` — 403(에스컬레이션·자기·마지막 SUPER_ADMIN), 토스트 폴백.

### 6-6. ResetPasswordSection (1회·휘발)
- 버튼 `비밀번호 초기화` → **인라인 2단 확인**(버튼이 "정말 초기화? [확인]/[취소]"로 변형 — 중첩 다이얼로그 회피).
- 확정 → `useMutation(() => resetPassword(uuid))`. onSuccess → `temporaryPassword`를 로컬 state에 저장 + 영역에 표시(`typo.datetime`, 복사 버튼 lucide `Copy`). **캐시 저장 안 함**.
- 임시 비번 표시 영역은 다이얼로그 닫힘 시 컴포넌트 언마운트 → state 소멸(잔류 방지 요건 충족). 재조회 경로 없음.
- 안내문: "임시 비밀번호입니다. 본인에게 직접 전달하고 첫 로그인 후 변경을 안내하세요. 이 창을 닫으면 다시 볼 수 없습니다."

---

## 7. 라우트 (`src/app/(site)/mypage/manage/members/page.tsx`)

```tsx
export default function ManageMembersPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>회원 관리</h1>
      <div className="mt-xl">
        <RequirePermission permission="MEMBER_MANAGE" fallback={<EditAccessDenied />}>
          <MemberManager />
        </RequirePermission>
      </div>
    </Container>
  );
}
```
- `MemberManager`가 `useSearchParams`를 쓰므로 내부에서 `Suspense` 경계 필요(공개 ISR prerender 빌드 안전 — `Pagination` 선례). 부모 `manage/layout`이 로그인 가드.
- **페이지 게이트 = `MEMBER_MANAGE`**: 목록/상세 API가 `MEMBER_MANAGE` 단독이라 진입 자격은 이 권한. 역할 부여/회수만 화면 내부에서 `ROLE_MANAGE`로 추가 분리(§4-2). `ROLE_MANAGE`만 있고 `MEMBER_MANAGE`가 없는 운영자는 목록을 못 보므로(서버 403) 이 화면 대신 07A에서 역할 *정의*만 다룬다.

---

## 8. 쿼리키 · 캐시 무효화

| 소비자 | 종류 | 무효화 |
|---|---|---|
| 회원 목록 | 클라 `useQuery(adminKeys.list("members", params))` | `updateMember`·`grantRole`·`revokeRole` onSuccess → `invalidateQueries(["admin","members","list"])`(params 무관 prefix) |
| 회원 상세 | 클라 `useQuery(adminKeys.detail("members", uuid))` | `updateMember`·`grantRole`(반환 detail로 `setQueryData`)·`revokeRole`(invalidate) |
| 운영자 본인 `useMe()` | 클라 `useQuery(["me"])` | 자기 프로필 수정(`uuid===me.uuid`) 시에만 `invalidate(["me"])` |
| 역할 목록(부여 후보) | 클라 `useQuery(adminKeys.list("roles"))` | 07A와 **동일 키 공유**(읽기만) |
| 약관 리셋 | — | 회원 카드 불변 → **무효화 없음**(notify만) |

공개 ISR 소비자 없음 → `revalidate*` 미호출(06·07A 동일 근거).

---

## 9. 디자인 토큰·DESIGN.md 등록

- `typo.*`·spacing 토큰만. hex·px 인라인 금지. 섹션 제목 `typo.displayMd`. 날짜·전화 숫자 `typo.datetime`(tnum).
- UI 이모지 금지, 아이콘 `lucide-react`(`Info`·`Copy` 등, `currentColor`). JSX 조건부 삼항(`{cond ? <X/> : null}`).
- 약관 리셋 강한 확인은 `button-destructive`(파괴적 확인 — DESIGN 예외 허용). 어드민(가독성 우선 단순 변형)이되 토큰 공유(Known Gaps).
- **DESIGN.md 어드민 공용 블록 07 구획**에 등록:
  - `member-manager`: 회원 목록·검색·CRUD 오케스트레이터. `DataTable`(이름·전화·직분·역할·승인·가입일) + URL 구동 검색·`Pagination` + 상세 다이얼로그 + 전역 약관 패널.
  - `agreement-reset-panel`: 전역 약관/개인정보 재동의 리셋. 안내 배너(`Info`) + `button-destructive` 강한 확인창.
  - `member-detail-dialog`: 회원 상세 Dialog. 직분·승인 Badge·역할 chips·권한·동의상태 + 인라인 편집·역할·비번 섹션 오케스트레이션.
  - `member-profile-form`: 다이얼로그 내 인라인 편집(이름·전화·이메일), `formatPhone` 정규화.
  - `member-roles-section`: 보유 역할 chips·회수 + 부여(`getRoles` 필터). `canAssignRole`·자기 가드, `ROLE_MANAGE` 노출.
  - `reset-password-section`: 인라인 확인 → 임시 비번 1회 표시(복사)·창 닫으면 휘발.

---

## 10. 에러·엣지 처리

| 상황 | 처리 |
|---|---|
| 이름 빈값/50자 초과·이메일 형식 | zod → RHF 인라인(제출 차단) |
| 전화번호 중복(409 DUPLICATE_RESOURCE) | `setError("phone")` 인라인, 다이얼로그 유지 |
| 소프트삭제 회원(404) | 토스트 + 다이얼로그 닫기 |
| 역할 위계 위반·자기·마지막 SUPER_ADMIN(403) | 버튼 선제 비활성 + 서버 403 토스트 폴백 |
| 약관 target 오류(400 INVALID_INPUT_VALUE) | 토스트(버튼이 고정 target이라 거의 미발생) |
| me 미로딩 | 역할 변경 버튼 보수적 비활성(서버 최종 방어) |
| 권한 없음 | `RequirePermission` → `EditAccessDenied`(제목·컨테이너는 렌더) |
| 빈 목록/로딩 | DataTable `empty`("조회된 회원이 없습니다.")/`loading` |
| 임시 비번 노출 | 다이얼로그 로컬 state·캐시 미저장·닫힘 시 휘발 |

---

## 11. 테스트 (vitest, globals:false 명시 import·jest-dom 없음·next/link mock — 프론트 관례)

| 파일 | 검증 |
|---|---|
| `lib/api/members.admin.test.ts` | listMembers GET **`/api/members?q=&page=`**(admin 미접두) 쿼리 조립; getMember **`/api/members/{uuid}`**; updateMember PATCH `/api/admin/members/{uuid}` body; grantRole POST `.../roles {roleId}`; revokeRole DELETE `.../roles/{roleId}`(204); resetPassword POST 반환 `{temporaryPassword}` |
| `lib/api/agreements.admin.test.ts` | resetAgreements POST `/api/admin/agreements/reset` body `{target}`("terms"/"privacy") |
| `lib/admin/memberGuards.test.ts` | `canAssignRole`: priority<max→true; priority==max→**false(동급 차단)**; priority>max→false; isSystem 무관(priority로만 판정) |
| `components/admin/members/schema.test.ts` | name 빈값·51자 실패; email 잘못된 형식 실패·빈 문자열 통과; phone 빈값 실패 |
| `components/admin/members/MemberManager.test.tsx` | 목록 렌더(승인 Badge·역할); 검색 입력→`?q=` URL 갱신·page 리셋; 페이지네이션 노출 조건; 상세 액션→다이얼로그; 조회 실패→토스트; empty |
| `components/admin/members/AgreementResetPanel.test.tsx` | 두 버튼·전역 경고문; 확인창 확정→resetAgreements(target); **회원 list 무효화 안 함**; 400→토스트 |
| `components/admin/members/MemberDetailDialog.test.tsx` | 상세 렌더(역할·권한·동의·승인); 자기 자신→역할 비활성; 로딩/실패 분기 |
| `components/admin/members/MemberProfileForm.test.tsx` | 인라인 편집 토글; 제출→updateMember; onSuccess invalidate(detail+list); 자기 수정→`["me"]` 추가; 전화 중복→인라인 |
| `components/admin/members/MemberRolesSection.test.tsx` | 부여 후보 필터(`canAssignRole`&&미보유); 부여→grantRole+detail setQueryData+list invalidate; 회수→revokeRole; 비활성(자기·동급·me미로딩); ROLE_MANAGE 미보유→read-only |
| `components/admin/members/ResetPasswordSection.test.tsx` | 인라인 확인→resetPassword; 임시 비번 표시; 닫힘 시 휘발(언마운트); 캐시 미저장 |

**완료 게이트**: `pnpm test` 전체 통과 · `npx tsc --noEmit` 0 · `pnpm lint` 0. 커버리지 80%+.

---

## 12. 07A(역할·권한 관리)로부터의 재사용·차이

- **재사용**: `getRoles`·`adminKeys.list("roles")`(부여 후보 데이터, 동일 키 공유) · 공용 primitive(`DataTable`·`Pagination`·`DeleteConfirmDialog`·`dialog`·`apiMutate`·`adminOnError`·`adminKeys`·`useMe`).
  - ⚠️ `RoleResponse = {id, name, priority, isSystem, description, permissions: PermissionResponse[]}`(객체 배열). 회원 역할 부여/회수 가드(`canAssignRole`)·부여 후보 필터는 **`priority`·`name`만 참조**하고 `RoleResponse.permissions`(객체배열)는 다루지 않는다. 이는 `MemberDetailResponse.permissions`(`string[]`, §3-1)와 동명·이형이므로 혼동 금지.
- **가드 분리(중요)**: 07A `canManageRole`(`!isSystem && priority <= max`, 역할 정의 편집 전용)을 **재사용하지 않는다**. 회원 역할 부여/회수는 `canAssignRole`(`priority < max`, strict·동급 차단, `isSystem` 무관)을 `memberGuards.ts`에 신설. 부등호 차이(`<=` vs `<`)는 백엔드가 *역할 정의 편집*은 동급 허용(`validateMutable`), *회원 위임/박탈*은 동급 차단(`validateGrantable`)으로 분리했기 때문.
- **권한 분리**: 화면 진입·목록·상세·정보수정·비번초기화·약관리셋 = `MEMBER_MANAGE`. 역할 부여/회수 = `ROLE_MANAGE`(화면 내부 추가 게이트). 두 권한은 독립.

---

## 13. 구현 순서(계획 단계에서 세분)

1. 응답·요청 타입 → 어드민 읽기(`listMembers`·`getMember`) → 어드민 쓰기(`updateMember`·`grantRole`·`revokeRole`·`resetPassword`) → `agreements.admin`(`resetAgreements`).
2. 위계 가드(`memberGuards.ts`).
3. 스키마(`memberUpdateSchema`).
4. 하위 섹션(`MemberProfileForm` → `MemberRolesSection` → `ResetPasswordSection`) → `MemberDetailDialog` → `AgreementResetPanel` → `MemberManager`.
5. 라우트.
6. DESIGN.md 07 구획 등록.
7. 테스트(각 단계 TDD: RED→GREEN).
