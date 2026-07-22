# 차량 탑승 신청 — 현재 위치 첨부(원탭) 프론트 설계

날짜: 2026-07-22
상태: 승인됨(대화)
선행: 백엔드 스펙 `2026-07-22-vehicle-pickup-location-backend-spec.md`(반영 완료 — `docs/api-docs.json`)
기반 기능: 차량운행 도메인(#114)

## 배경·목표

탑승자가 픽업 위치를 **한 번의 조작으로** 정확히 전달한다. 브라우저 위치(geolocation)로 현재 좌표를
얻어 신청에 첨부하고, 회원 카드·기사 명단에서 그 좌표로 카카오맵 핀을 연다. 지도 SDK·API 키를
도입하지 않는다(교회별 템플릿 재사용성 유지). 역지오코딩 없음 — 좌표는 원본 그대로 저장·표시하고,
사람이 읽을 라벨은 기존 픽업 텍스트가 담당한다.

지도에서 핀을 미리 조정하는 "위치 지정"은 범위 밖(SDK가 필요). 현재 위치 첨부만 지원하고, 다른
장소는 기존처럼 픽업 텍스트로 설명한다(원탭 옵션 B).

## 백엔드 계약(확정)

`docs/api-docs.json` 기준. 신청 요청/응답·명단 응답에 `latitude`·`longitude`(double, nullable) 추가,
`pickupLocation` 필수 → 선택.

**함정 — 반드시 무시할 필드**: `VehicleRequestCreateRequest` 스키마에 `pickupOrCoordinatesPresent`·
`coordinatesPaired`·`coordinatesInRange`(boolean) 세 개가 보이는데, 이는 Spring `@AssertTrue` 검증
게터가 OpenAPI에 샌 것이다 — **실제 입력 필드가 아니다**. 프론트는 `latitude`·`longitude`만 전송하고
이 셋은 절대 보내지 않는다.

백엔드 검증(위반 시 400 `INVALID_INPUT_VALUE`):
- 좌표 동반: `latitude`·`longitude` 둘 다 있거나 둘 다 없음.
- 최소 하나: 픽업 텍스트와 좌표 중 최소 하나.
- 범위: 위도 [-90, 90], 경도 [-180, 180].

프론트는 이 규칙을 zod로 미러(사전 차단)하되, 우회 시 백엔드 400을 기존 에러 토스트로 처리한다.

## 구성 요소

### 1. 타입 (`src/lib/api/types.ts`)

`MyRequestResponse`·`VehicleRequestResponse`·`VehicleRosterEntryResponse` 세 응답에
`latitude?: number | null`·`longitude?: number | null` 추가(`@JsonInclude(NON_NULL)`라 누락 가능).

### 2. API 요청 타입 (`src/lib/api/vehicles.ts`)

`VehicleRequestCreateRequest`에 `latitude?: number`·`longitude?: number` 추가. `applyVehicleRequest`는
그대로(본문을 받아 전달) — 본문 조립은 다이얼로그가 담당. 검증 게터 3종은 타입에 넣지 않는다.

### 3. geolocation 래퍼 (`src/lib/geolocation.ts` — 신규)

`getCurrentPosition(): Promise<{ latitude: number; longitude: number; accuracy: number }>`.
`navigator.geolocation.getCurrentPosition`을 프로미스로 감싸고 옵션 `{ enableHighAccuracy: true,
timeout: 10000, maximumAge: 0 }`. 오류는 코드→한글 메시지로 매핑해 reject:
- 미지원(`!navigator.geolocation`) → "이 브라우저는 위치를 지원하지 않습니다."
- `PERMISSION_DENIED` → "위치 권한이 거부되었습니다. 주소를 직접 입력해 주세요."
- `POSITION_UNAVAILABLE` → "현재 위치를 확인할 수 없습니다."
- `TIMEOUT` → "위치를 가져오지 못했습니다. 다시 시도해 주세요."

### 4. 카카오맵 핀 URL (`src/lib/mapLink.ts` — 신규)

`kakaoMapPinUrl(latitude, longitude, label?): string` →
`https://map.kakao.com/link/map/{label},{lat},{lng}`(label 기본 "픽업 위치", `encodeURIComponent`).
회원 카드·기사 명단이 공유. 카카오맵 링크는 키·SDK 불필요이며 모바일에서 카카오맵 앱으로 이어진다.
기존 `church.ts`의 `mapSearchUrl`(주소 검색)과 별개 — 이건 좌표 핀.

### 5. 신청 다이얼로그 (`src/components/vehicles/VehicleApplyDialog.tsx` — 수정)

- **zod 스키마 변경**: `pickupLocation`을 `.trim().max(200)` 선택(min(1) 제거).
  `latitude`·`longitude` 선택 number. `.refine` 2개(백엔드 미러):
  - 좌표 동반: `(lat == null) === (lng == null)`
  - 최소 하나: `pickupLocation.trim() !== "" || (lat != null && lng != null)` — 실패 메시지는
    픽업 필드 아래 "픽업 장소를 입력하거나 현재 위치를 첨부해 주세요."
  - (범위는 geolocation 값이라 실무상 항상 유효 — refine 생략, 백엔드가 최종 방어)
- **라벨**: "픽업 장소 (필수)" → "픽업 장소 (선택)". 안내 문구 "주소를 입력하거나 아래에서 현재 위치를
  첨부하세요."
- **"현재 위치 첨부" 버튼**(`button-secondary-light`, lucide `LocateFixed`): 클릭 → geolocation 로딩
  (스피너/`loading`) → 성공 시 폼의 `latitude`·`longitude`에 저장. 실패 → `notify.error`(위 메시지).
- **첨부 상태 표시**: 좌표가 있으면 배지/줄 "위치 첨부됨" + "지도에서 확인"(kakaoMapPinUrl, 새 탭) +
  "지우기"(좌표 초기화). 다시 누르면 갱신.
- **정확도 안내**(caption, muted): "휴대폰에서 누르면 더 정확해요. PC는 위치가 부정확할 수 있어요."
- **제출 본문**: `{ ...(pickup 비어있지 않으면 pickupLocation), ...(note 있으면 note),
  ...(좌표 있으면 latitude·longitude) }` — 빈 값 생략, 검증 게터 미포함.

### 6. 회원 카드 (`src/components/vehicles/VehicleRunList.tsx` — 수정)

`myRequest`에 좌표가 있으면 "위치 보기" 링크(kakaoMapPinUrl, 새 탭) 노출. 픽업 텍스트가 비어도
(좌표만 신청) 정상 렌더 — 텍스트 없으면 "픽업: …" 대신 "위치 첨부됨"으로 표기. 텍스트·좌표 둘 다
있으면 텍스트 + "위치 보기" 링크 병기.

### 7. 기사 명단 (`src/components/admin/vehicles/VehicleRosterView.tsx` — 수정)

픽업 장소 셀: 좌표가 있으면 "지도 보기" 링크(kakaoMapPinUrl, 새 탭) 추가. 픽업 텍스트가 비어도 처리
(텍스트 없으면 링크만). 연락처 tel: 링크와 같은 결의 인라인 링크.

## DESIGN.md 갱신

- `vehicle-run-card` 항목: "현재 위치 첨부(geolocation) + 좌표 있으면 카카오맵 '위치 보기' 링크, 픽업
  텍스트 없으면 '위치 첨부됨' 표기" 추가.
- `vehicle-roster-view` 항목: "좌표 있으면 카카오맵 '지도 보기' 링크" 추가.

## 에러 처리

- geolocation 실패 → `notify.error`(권한 거부·타임아웃·미지원·불가 각 메시지). 텍스트 입력으로 폴백 가능.
- 제출 400(`INVALID_INPUT_VALUE`: 최소 하나·좌표 한쪽·범위) → 기존 `handleApiError` detail 토스트.
  프론트 zod가 앞의 두 케이스를 선차단하므로 여기 도달은 방어선.

## 테스트 계획

TDD, 기존 관례(vitest 명시 import·jest-dom 없음·mock).
- `geolocation.test.ts`: `navigator.geolocation` mock — 성공(좌표 반환)·각 오류 코드·미지원.
- `mapLink.test.ts`: URL 포맷·라벨 encode·기본 라벨.
- `VehicleApplyDialog.test.tsx`(보강): 위치 첨부(geolocation mock) → 제출 본문에 좌표 / 텍스트만 제출
  / 둘 다 비면 검증 차단 / 좌표 지우기 / 검증 게터 미전송 확인.
- `VehicleRunList.test.tsx`(보강): 좌표 있는 myRequest → "위치 보기" href / 좌표만(텍스트 없음) 표기.
- `VehicleRosterView.test.tsx`(보강): 좌표 있는 항목 → "지도 보기" href / 텍스트 없이 좌표만 처리.

## 비범위 (Non-goals)

- 지도 임베드·핀 드래그 위치 지정 없음(SDK 필요 — 현재 위치 첨부만).
- 역지오코딩(좌표→주소) 없음.
- 정확도(accuracy) 저장·표시 없음(정적 안내 문구만).
- 신청 수정 없음(취소 후 재신청 — 기존 정책).
