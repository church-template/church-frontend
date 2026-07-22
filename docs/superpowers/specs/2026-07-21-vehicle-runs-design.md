# 차량운행(탑승 신청) 프론트 적용 설계

날짜: 2026-07-21
상태: 승인됨
근거: `docs/api-docs.json` 차량운행 도메인 신규 추가분 (스키마 단일 진실)

## 1. 배경·목표

백엔드에 차량운행 도메인이 추가됐다(운행일 관리 + 탑승 신청, 명단은 중등·고등·청년 통합).
이를 웹에 적용한다:

- 승인 교인(`VEHICLE_APPLY`)이 다가오는 운행일을 보고 탑승을 신청·취소한다.
- 운영자(`VEHICLE_MANAGE`)가 운행일을 등록·수정·삭제하고 운행일별 탑승 명단(연락처 포함)을 본다.

## 2. 백엔드 계약 요약

경로·필드의 단일 진실은 `docs/api-docs.json`. 아래는 설계 근거 요약이다.

### 회원 (`VEHICLE_APPLY`, 승인 교인)

| 메서드·경로 | 내용 |
|---|---|
| `GET /api/vehicle-runs` | 다가오는 운행일 목록(출발 임박순, 기본 `departsAt,asc`). 항목 = `id`·`departsAt`·`note`·`myRequest{pickupLocation, note}`(null=미신청) |
| `POST /api/vehicle-runs/{id}/requests` | 탑승 신청. body `{pickupLocation(필수·최대 200자), note(선택)}`. 중복 409 `DUPLICATE_RESOURCE` · 출발 시각 경과 400 · 없는/삭제된 운행일 404 |
| `DELETE /api/vehicle-runs/{id}/requests/me` | 내 신청 취소 |

### 어드민 (`VEHICLE_MANAGE`)

| 메서드·경로 | 내용 |
|---|---|
| `GET /api/admin/vehicle-runs` | 전체 목록(지난 운행 포함, 기본 `departsAt,desc`). 항목 = `id`·`departsAt`·`note`·`version` |
| `POST /api/admin/vehicle-runs` | 등록. body `{departsAt(필수), note}` |
| `PATCH /api/admin/vehicle-runs/{id}` | 수정. body `{departsAt, note, version(필수·낙관락)}` |
| `DELETE /api/admin/vehicle-runs/{id}` | 삭제 |
| `GET /api/admin/vehicle-runs/{id}/requests` | 탑승 명단(신청순, 기본 `createdAt,asc`). 항목 = `name`(탈퇴 시 "(탈퇴한 사용자)" — 백엔드 처리)·`phone`·`pickupLocation`·`note`·`requestedAt` |

주의: 운행일 **단건 GET이 없다** — 어드민 수정 시드·명단 페이지 제목은 목록 행 값으로 해결한다(§5·§6).

## 3. 라우트·권한·정보구조

| 영역 | 라우트 | 권한 | 내용 |
|---|---|---|---|
| 회원 | `/vehicle-runs` | `VEHICLE_APPLY` | 운행일 목록 + 신청·취소 |
| 어드민 | `/mypage/manage/vehicle-runs` | `VEHICLE_MANAGE` | 운행일 목록·등록·수정·삭제 |
| 어드민 | `/mypage/manage/vehicle-runs/[id]` | `VEHICLE_MANAGE` | 탑승 명단 |

- 네비: `navigation.ts` 예배·설교 그룹(`WORSHIP_LINKS`)에 `{ label: "차량 신청", href: "/vehicle-runs", icon: "bus" }`. `NavIconKey`에 `"bus"` 추가, MegaMenu에 lucide `Bus` 매핑. (푸터는 `FOOTER_COLUMNS`가 같은 배열을 공유하므로 자동 반영.)
- 관리 허브: `manageDomains.ts`에 `{ key: "vehicle-runs", label: "차량운행 관리", permission: "VEHICLE_MANAGE", href: "/mypage/manage/vehicle-runs", kind: "manage", category: "inbox" }`. `inbox` 카테고리 라벨을 `"문의"` → `"접수"`로 변경(문의·탑승 신청의 공통 상위어 — 교회가 '받는' 것).
- 권한 라벨: `permissions.ts`에 `VEHICLE_APPLY: "차량 탑승 신청"` · `VEHICLE_MANAGE: "차량운행 관리"`.
- 마이페이지 "내 신청" 요약 섹션은 **만들지 않는다** — 내 신청 목록 엔드포인트가 없고 `myRequest`가 목록에 내장돼 `/vehicle-runs`가 그 역할을 겸한다(YAGNI).

## 4. API 레이어 (`src/lib/api/`)

- `types.ts`: `VehicleRunCardResponse`·`MyRequestResponse`·`VehicleRequestCreateRequest`·`VehicleRequestResponse`·`VehicleRunDetailResponse`·`VehicleRosterEntryResponse` 추가.
- `vehicles.ts`(회원): 전 엔드포인트 회원전용 → `authFetch`만 사용(챌린지·갤러리 패턴).
  - `fetchVehicleRuns({ page })` — size 10, 정렬은 백엔드 기본(`departsAt,asc`)
  - `applyVehicleRequest(id, { pickupLocation, note })`
  - `cancelVehicleRequest(id)`
- `vehicles.admin.ts`:
  - `fetchAdminVehicleRuns({ page })` — size 10, 백엔드 기본(`departsAt,desc`)
  - `createVehicleRun({ departsAt, note })` · `patchVehicleRun(id, { departsAt, note, version })` · `deleteVehicleRun(id)`
  - `fetchVehicleRoster(id, { page })` — size 20(명단은 훑는 화면이라 넉넉히)
- 날짜 직렬화 `toServerDateTime`, 파싱 `parseServerDate`(KST 가정) — 기존 헬퍼 재사용.

## 5. 회원 페이지 `/vehicle-runs`

- `page.tsx`: RSC 셸(`challenges/page.tsx` 동형) — h1 "차량 탑승 신청"(`typo.displayMd`) + `Suspense` + `VehicleGate` + `VehicleRunList`. `metadata.title` 설정.
- `VehicleGate`(`src/components/vehicles/`): `ChallengeGate` 동형 — 순서: 미하이드레이션=스켈레톤 → 비로그인=로그인 유도(`next` 파라미터) → `useMe` 대기/실패 처리 → `VEHICLE_APPLY` 미보유="교인 승인 후 이용 가능" 안내. 권한 없으면 children 미마운트(API 호출 0회).
- `VehicleRunList`(client): `useQuery(["vehicle-runs", page])` → 운행일 카드 리스트 + `Pagination`.
  - 카드(`vehicle-run-card`, schedule-card 결): 출발시각 `typo.datetimeLg`(tnum) + 메모 `typo.bodySm`.
  - `myRequest === null` → "탑승 신청" `button-primary`(48px) → `VehicleApplyDialog`.
  - `myRequest` 있음 → "신청됨" Badge + 내 픽업 장소·메모 표시 + "신청 취소" 텍스트 버튼 → 확인 Dialog.
  - 빈 상태: "예정된 운행일이 없습니다." 안내문.
- `VehicleApplyDialog`: RHF+zod — `pickupLocation`(필수·최대 200자, `text-input`) + `note`(선택, `Textarea`, placeholder로 "동승 인원·특이사항" 안내). 라벨에 필수/선택 표기(inquiry-form 관례).
- 뮤테이션(신청·취소) onSuccess: `["vehicle-runs"]` invalidate + 성공 Toast.
- 에러는 `errorCode`로만 분기(가이드 4장) — 기존 `handleApiError` 재사용 → Toast:
  - `DUPLICATE_RESOURCE`: "이미 신청한 운행일입니다." + 목록 invalidate(다른 기기에서 신청한 상태 동기화)
  - `INVALID_INPUT_VALUE`(출발 시각 경과 포함): 서버 `detail` 표시(기본 동작)
  - `RESOURCE_NOT_FOUND`(삭제된 운행일): "운행일을 찾을 수 없습니다." + 목록 invalidate

## 6. 어드민 화면

### 운행일 관리 `/mypage/manage/vehicle-runs`

- `page.tsx`: manage/layout(로그인 가드) 하위, `RequirePermission permission="VEHICLE_MANAGE"` + `VehicleRunManager`(챌린지 관리 페이지 동형).
- `VehicleRunManager`(`src/components/admin/vehicles/`): `DataTable`(출발시각·메모·액션) + URL 구동 `Pagination`(10건) + 툴바 "운행일 등록" 버튼. 행 액션: `명단`(Link) · `수정` · `삭제`.
- `VehicleRunFormDialog`: 등록·수정 겸용 — `DateTimePicker`(datetime-local) + 메모 `Textarea`. 검증: 출발시각 필수. 단건 GET이 없으므로 수정은 **행 값 시드**(tag-form-modal 패턴), `version`은 목록 응답 값 사용. 직렬화 `toServerDateTime`.
- 삭제: `DeleteConfirmDialog`. 삭제되면 탑승 신청도 접근 불가하게 되는 파괴적 작업이라 경고문에 "탑승 신청 명단도 함께 사라집니다" 명시.
- 낙관락 충돌(`OPTIMISTIC_LOCK_CONFLICT`): 기존 `handleApiError`의 `onReedit` 흐름 — 안내 Toast + 목록 invalidate(단건 GET이 없어 재시드는 새 목록 값으로).
- invalidate: `["admin", "vehicle-runs"]` + 회원 목록 `["vehicle-runs"]`(운영자 겸 교인 세션 대비). 공개 페이지가 없으므로 ISR 무효화 불요.

### 탑승 명단 `/mypage/manage/vehicle-runs/[id]`

- `RequirePermission VEHICLE_MANAGE` + `VehicleRosterView`(client): `useQuery(["admin", "vehicle-runs", id, "roster", page])`.
- `DataTable`: 이름 · 연락처(`tel:` 링크 — 현장에서 바로 전화) · 픽업 장소 · 메모 · 신청 시각(`typo.datetime`). `Pagination`(20건).
- 제목: "탑승 명단". 운행일 단건 GET이 없어 출발시각은 목록 행에서 **표시 전용 쿼리 파라미터**(`?departsAt=`)로 전달 — 있으면 부제로 표시, 없으면(직접 URL 진입) 생략. 표시 전용이라 위·변조돼도 영향 없음.
- 빈 상태: "아직 탑승 신청이 없습니다."

## 7. DESIGN.md 등록

구현 전 컴포넌트 블록에 추가(규칙: 문서에 없는 컴포넌트를 만들지 않는다):

- `vehicle-run-card`(콘텐츠 카드 구획): 회원용 운행일 카드 — schedule-card 변형. 출발시각 `{typography.datetime-lg}` + 메모 + 신청 상태(Badge/내 신청 요약) + 신청·취소 액션.
- 어드민 공용 구획(자기 구획에만 추가): `vehicle-run-manager` · `vehicle-run-form-dialog` · `vehicle-roster-view` — 가독성 우선 단순 변형, 토큰 공유.

## 8. 테스트 계획

TDD(RED→GREEN), 기존 관례(vitest `globals:false` 명시 import·jest-dom 없음·next/link mock) 준수.

- `vehicles.test.ts` / `vehicles.admin.test.ts`: 경로·쿼리스트링·메서드·body 직렬화 검증(기존 api 레이어 테스트 동형).
- `VehicleGate` 테스트: 비로그인/미승인/보유 분기(ChallengeGate 테스트 동형).
- `VehicleRunList` 테스트: 목록 렌더·`myRequest` 유무별 액션 분기·빈 상태.
- `VehicleApplyDialog` 테스트: 필수 검증(픽업 장소)·제출 payload.
- `VehicleRunManager`·`VehicleRosterView` 테스트: 테이블 렌더·행 값 시드 수정·명단 링크.
- `navigation.test.ts`: 기존 드리프트 감시 테스트가 새 링크를 커버하는지 확인·보강.

## 9. 비범위 (Non-goals)

- 공개(비로그인) 노출 없음 — 전 화면 회원·어드민 영역, ISR·서버 fetch 불요.
- 마이페이지 내 신청 요약 섹션 없음(§3).
- 신청 수정(픽업 장소 변경) UI 없음 — 백엔드에 수정 엔드포인트가 없다. 취소 후 재신청으로 안내.
- 정원(좌석 수)·마감 표시 없음 — 백엔드 스키마에 해당 필드 없음.
