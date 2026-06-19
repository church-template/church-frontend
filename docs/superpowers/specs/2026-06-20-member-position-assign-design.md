# 회원 직분 부여/변경/해제 — 설계

작성일: 2026-06-20

## 배경

회원 관리 화면에서 역할(role)·권한(permission)은 부여/회수가 가능하나, 직분(position)을
회원에게 연결하는 경로가 없었다. 직분은 직분 관리(`PositionManager`)에서 이름·정렬순서만
CRUD할 수 있을 뿐, 그 직분을 특정 회원에게 지정하는 UI·API가 프론트에 없었다.

백엔드 OpenAPI 갱신으로 직분 부여 엔드포인트가 추가되어, 프론트에서 이를 연동한다.

## 백엔드 계약

- `PUT /api/admin/members/{uuid}/position`
  - 요청 본문: `PositionAssignRequest` — `{ positionId: number | null }` (null이면 직분 해제)
  - 응답: `MemberDetailResponse` — 직분 반영된 회원 상세
  - 권한: `MEMBER_MANAGE`
  - 특이사항: 직분은 권한과 무관 — 위계 검증 없음. 회원/직분 미존재 시 404.
- 직분 카탈로그 조회: `GET /api/positions` (공개) → `PositionResponse[]` (`id`·`name`·`sortOrder`·`createdAt`)

비대칭 주의: `MemberDetailResponse.position`은 직분 **이름 문자열**이고, 부여 API는
**`positionId`(숫자)**를 받는다. 따라서 현재 직분을 select에 시드하려면 카탈로그에서
이름 → id 매핑이 필요하다.

## 결정 사항

- UI 배치: MemberDetailDialog 내 **전용 '직분' 섹션** (역할 섹션과 동형). 프로필 폼에
  통합하지 않는다 — 부여 API가 프로필 PATCH와 분리된 별도 엔드포인트라 역할과 같은 구조가 일관적.
- 자기수정: **허용**. 직분 API는 위계 검증이 없으므로 `MEMBER_MANAGE` 보유 시 자기 직분도
  변경 가능. 역할 섹션의 isSelf 차단을 직분에는 두지 않는다.
- 권한 게이트: `MEMBER_MANAGE`. 미보유 시 현재 직분만 읽기 전용 표시.

## 변경 단위

### 1. API 클라이언트 — `src/lib/api/members.admin.ts`

`grantRole`/`revokeRole` 옆에 추가:

- `changePosition(uuid: string, positionId: number | null): Promise<MemberDetailResponse>`
  - `apiMutate<MemberDetailResponse>(`/api/admin/members/${uuid}/position`, { method: "PUT", body: { positionId } })`
  - 부여·변경·해제를 모두 이 하나로 처리(해제 = `positionId: null`).

### 2. 신규 컴포넌트 — `src/components/admin/members/MemberPositionSection.tsx`

`MemberRolesSection`을 본뜨되 위계 가드가 없어 더 단순하다.

- 카탈로그: `useQuery({ queryKey: ["positions"], queryFn: getPositions })` — `PositionManager`와 키 공유(공개 카탈로그).
- 게이트: `useHasPermission("MEMBER_MANAGE")` — 미보유 시 읽기 전용(현재 직분만 표시, select·버튼 비노출).
- 현재값 매핑: `positions.find((p) => p.name === member.position)?.id`로 select 초기 선택값을 시드.
- UI: `(없음)` 옵션 + 전체 직분 옵션을 가진 native select(역할 섹션의 select 토큰·스타일 재사용) + `변경` 버튼.
  - 선택값이 현재 직분과 같으면 `변경` 버튼 disabled.
  - `(없음)` 선택 후 변경 = 해제(`positionId: null`).
- mutation: `changePosition` →
  - onError: `adminOnError()`
  - onSuccess: `qc.setQueryData(adminKeys.detail("members", uuid), updated)` + `["admin","members","list"]` 무효화 + `notify.success`.
- 자기수정: isSelf 차단 없음.

### 3. 조립 — `src/components/admin/members/MemberDetailDialog.tsx`

역할 섹션과 약관 섹션 사이에 1px 헤어라인 divider + `<MemberPositionSection member={m} />` 삽입.
헤더의 읽기 표시 직분(`m.position`)은 빠른 조회용으로 유지 — 동일 `member` 객체 참조라 stale 없음.

## 엣지 케이스

- `member.position === ""`(직분 없음) → select가 `(없음)` 선택 상태로 시작.
- 현재 직분 이름이 카탈로그에 없음(삭제된 직분) → 시드 실패 시 `(없음)`로 폴백, 새 선택 가능.
- 해제 = `positionId: null` 전송.

## 테스트 (TDD: RED → GREEN → REFACTOR)

- `src/lib/api/members.admin.test.ts`(또는 기존 파일에 추가): `changePosition`이
  `PUT /api/admin/members/{uuid}/position`을 `{ positionId }` body로 호출. 역할 API 테스트 동형.
- `src/components/admin/members/MemberPositionSection.test.tsx`:
  - 현재 직분 렌더(이름 표시·select 시드)
  - 직분 변경 호출(`changePosition` 호출 인자 검증)
  - 해제(`positionId: null`) 전송
  - 권한 미보유 시 읽기 전용(select·버튼 비노출)
  - 카탈로그에 없는 직분 → `(없음)` 폴백

프로젝트 테스트 관례 준수: vitest `globals:false` 명시 import, jest-dom 미사용
(`getAttribute`/`toBeDefined`), `next/link`·mutation mock 패턴은 기존 회원 섹션 테스트를 따른다.
