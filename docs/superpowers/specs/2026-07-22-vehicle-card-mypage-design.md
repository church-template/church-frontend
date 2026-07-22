# 차량 탑승 카드 가시성 개선 + 마이페이지 내 탑승 조회 설계

날짜: 2026-07-22
상태: 승인됨(대화)
기반: 차량운행 도메인(#114) + 위치 첨부 후속

## 배경·목표

회원 `/vehicle-runs`의 탑승 카드가 신청 정보를 오른쪽 정렬 세로 스택으로 몰아 넣어 한글이
우측 정렬되며 읽기 불편하고, 운행 정보와 "내 신청"이 시각적으로 구분되지 않는다. 카드를
헤더 + 내 신청 블록으로 재구성해 가시성을 높인다. 또한 마이페이지에서 내가 신청한 다가오는
탑승을 한눈에 볼 수 있게 "내 차량 탑승" 섹션을 추가한다(통독 이력과 나란히).

## 1. 차량 탑승 카드 재구성 (`VehicleRunList.tsx`)

카드 배경은 기존 `bg-surface-soft`(schedule-card 결) 유지. 구조를 **헤더 / 내 신청 블록**으로 나눈다.

- **헤더 행**(항상): 좌측 = 출발 시각 `{typography.datetime-lg}` + 운행 메모(`run.note`, 있을 때
  `{typography.body-sm}` muted). 우측 = 신청 시 `신청됨` `badge-pill-primary`.
- **신청 시** — 헤더 아래 1px 헤어라인 구분선 + "내 신청" 라벨 행 블록:
  - 라벨 행 = 좌측 라벨 `{typography.caption}` muted(고정폭 열) + 우측 값 `{typography.body-sm}`:
    - `픽업 장소`: `myRequest.pickupLocation`, 없으면(좌표만 신청) "위치 첨부됨"
    - `메모`: `myRequest.note`(있을 때만 행 노출)
    - `위치`: 좌표 있으면 "지도 보기" 링크(kakaoMapPinUrl, 새 탭), 없으면 행 생략
  - 블록 맨 아래 우측 `신청 취소` `button-tertiary-text`(확인 Dialog는 기존 그대로)
- **미신청 시** — 헤더 아래 우측 `탑승 신청` `button-primary`.

라벨 열은 고정폭으로 정렬(값이 세로로 가지런). 좌우 정렬 대신 좌측 정렬 라벨/값이라 한글 가독성이
회복된다. 빈 상태·페이지네이션·다이얼로그 배선은 현행 유지.

## 2. 마이페이지 "내 차량 탑승" 섹션 (신규 `MyVehicleBoardings.tsx`)

`MyChallengeHistory`와 동형: `{rounded.xl}` + 1px 헤어라인 카드 + `{typography.title-sm}` 제목 + 리스트,
행마다 1px 헤어라인 구분(notice-row 결), 행 전체가 링크.

- **데이터**: 기존 회원 목록 훅 `useVehicleRuns(0)` 재사용 → 응답 `content` 중 `myRequest != null`만
  필터(다가오는 운행 중 내 신청). 캐시 키 `["vehicle-runs", {page:0}]`를 `/vehicle-runs` 페이지와
  공유(중복 fetch 없음). 지난 탑승 이력은 백엔드 전용 API가 없어 범위 밖(다가오는 것만).
- **행**: 출발 시각 `{typography.body-md}`(600) + `신청됨` `badge` + 아래 "픽업: {pickupLocation ?? '위치 첨부됨'}"
  `{typography.body-sm}` muted. 행 클릭 → `/vehicle-runs`(거기서 취소·관리). 회원 탑승 상세 페이지가
  없어 목록으로 보낸다.
- **게이팅**: `useHasPermission("VEHICLE_APPLY")` 미보유이거나 필터 결과 0건이면 섹션째 null(통독 이력
  관례 — Reveal은 null 체크 뒤 내부 래핑, 바깥 래핑 시 빈 wrapper가 gap 차지).
- `MypageContent`에 `<MyVehicleBoardings delay={...} />`를 통독 이력 근처에 추가(Reveal delay 계단 조정).

### 훅 변경 (`src/components/vehicles/queries.ts`)

`useVehicleRuns(page)` → `useVehicleRuns(page, enabled = true)`. 마이페이지는 VehicleGate 밖이라 권한
없으면 호출하면 403이므로 `enabled: canView`로 억제한다. 기본값 true라 `/vehicle-runs` 페이지(게이트
통과 후 마운트)는 무영향.

## 3. DESIGN.md 갱신

- `vehicle-run-card` 항목: 오른쪽 정렬 스택 → 헤더(운행 정보·상태 배지) + 헤어라인 + "내 신청" 라벨 행
  블록(픽업 장소·메모·위치)·하단 취소 액션 구조로 갱신.
- 신규 `my-vehicle-boardings`(마이페이지 섹션 구획): my-challenge-history 동형 — 다가오는 내 신청만
  (회원 목록 필터), 행 클릭 `/vehicle-runs`, 권한 미보유·0건 비노출.

## 4. 에러·엣지

- `useVehicleRuns` 로딩·에러: 마이페이지 섹션은 조용히 null(통독 이력과 동일 — 마이페이지 나머지를
  막지 않는다). `/vehicle-runs` 페이지의 에러 표시는 현행 유지.
- 좌표만 신청(pickupLocation 없음): 카드·마이페이지 모두 "위치 첨부됨"으로 표기, undefined 안전.

## 5. 테스트 계획

TDD, 기존 관례(vitest 명시 import·jest-dom 없음·mock).
- `VehicleRunList.test.tsx`(수정): 신규 구조에 맞게 단언 갱신 — 픽업 값은 라벨 행("픽업 장소" 라벨 +
  값)으로 검증, "신청됨" 배지·"위치 보기" 링크·"위치 첨부됨"·"탑승 신청"/"신청 취소" 버튼·취소 흐름은 유지.
- `MyVehicleBoardings.test.tsx`(신규, MyChallengeHistory.test 동형): 권한 미보유 → null / 신청 0건 →
  null / 다가오는 내 신청 있으면 렌더(출발 시각·픽업·`/vehicle-runs` 링크) / myRequest null인 운행은 제외.
- `MypageContent.test.tsx`(필요 시): 섹션 마운트 확인(기존 테스트가 자식 mock이면 추가 mock).

## 6. 비범위 (Non-goals)

- 지난 탑승 이력(백엔드 전용 이력 API 없음) — 다가오는 것만.
- 통독 외 다른 참여 유형 통합(통독은 이미 마이페이지에 있음, YAGNI).
- 회원 탑승 상세 페이지 신설(목록으로 보냄).
- 카드 배경·색 토큰 변경(구조·정렬만 개선, 단일 액센트 유지).
