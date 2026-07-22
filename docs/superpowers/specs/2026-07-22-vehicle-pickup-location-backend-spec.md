# 차량 탑승 신청 — 픽업 위치(좌표) 백엔드 스펙 (핸드오프)

날짜: 2026-07-22
대상: 백엔드
관련: 차량운행 도메인(`/api/vehicle-runs`, 이슈 #114), OpenAPI `docs/api-docs.json`

## 배경·목표

탑승자가 픽업 장소를 **한 번의 조작으로** 정확히 전달하게 한다. 프론트가 브라우저 위치
(geolocation)로 현재 좌표를 얻어 신청에 첨부하고, 기사용 명단에서 그 좌표로 지도 핀을 연다
(지도 링크는 프론트가 좌표로 조립 — 지도 SDK·API 키 불필요). 백엔드는 **좌표를 저장하고 그대로
돌려주기만** 하면 된다.

프론트는 지도 SDK를 도입하지 않는다(교회별 템플릿 재사용성 유지 — 키·도메인 등록 회피). 따라서
백엔드도 역지오코딩(좌표→주소 변환)을 하지 않는다. 좌표는 원본 그대로 저장·반환한다.

## 변경 요약

1. `vehicle_request` 테이블에 nullable 좌표 컬럼 2개 추가.
2. 신청 요청/응답·명단 응답 스키마에 `latitude`·`longitude` 추가.
3. `pickupLocation`을 **필수 → 선택**으로 완화하고, "픽업 텍스트와 좌표 중 최소 하나" 규칙 추가.

신규 엔드포인트 없음. 권한 변경 없음(좌표는 기존 엔드포인트·기존 권한에 편승). 좌표는 개인
위치정보라 명단 응답의 기존 `VEHICLE_MANAGE` 게이트로 이미 보호된다.

## 데이터 모델

`vehicle_request`(탑승 신청) 테이블:

| 컬럼 | 타입 | 제약 |
|---|---|---|
| `latitude` | DOUBLE | NULL 허용 |
| `longitude` | DOUBLE | NULL 허용 |

- 기존 행은 두 값 모두 NULL(하위호환 — 백필 불요).
- 좌표는 항상 **쌍**으로 저장한다(둘 다 있거나 둘 다 NULL). 아래 검증 규칙으로 보장.

## API 계약 변경

경로·메서드·상태코드는 그대로. 아래 스키마에 필드만 추가하고 `pickupLocation` 필수 여부만 바꾼다.
`latitude`·`longitude`는 응답에서 `@JsonInclude(NON_NULL)` 관례를 따른다(값 없으면 키 생략 — 기존
`note`·`email`과 동일).

### 1. `VehicleRequestCreateRequest` (요청 본문 — 탑승 신청)

`POST /api/vehicle-runs/{id}/requests`

```
{
  "pickupLocation": "string, 선택, 최대 200자",   // 필수 → 선택 으로 변경
  "note":           "string, 선택",
  "latitude":       "number(double), 선택, -90 ~ 90",     // 신규
  "longitude":      "number(double), 선택, -180 ~ 180"    // 신규
}
```

검증 규칙(위반 시 `400 INVALID_INPUT_VALUE`):
- `latitude`와 `longitude`는 **동반 필수** — 한쪽만 오면 거부.
- 요청은 `pickupLocation`과 좌표(쌍) 중 **최소 하나**를 포함해야 한다(둘 다 비면 거부).
- `latitude` ∈ [-90, 90], `longitude` ∈ [-180, 180]. (한국 영역으로 더 좁히지 않는다 — GPS
  오차·경계 근처 방어.)
- `pickupLocation` 길이 제약(≤200)은 유지.

> `pickupLocation`을 선택으로 바꾸는 이유: "현재 위치 첨부" 원탭 흐름에서는 프론트가 좌표만
> 보내고 텍스트를 채우지 않는다(SDK 없이 역지오코딩 불가). 텍스트를 계속 강제하면 원탭이 성립하지
> 않는다. 대신 "최소 하나" 규칙으로 빈 신청을 막는다.

### 2. `VehicleRequestResponse` (신청 응답)

```
{
  "id":             "integer(int64)",
  "runId":          "integer(int64)",
  "pickupLocation": "string | null",
  "note":           "string | null",
  "latitude":       "number(double) | null",   // 신규
  "longitude":      "number(double) | null"     // 신규
}
```

### 3. `MyRequestResponse` (목록 카드에 내장 — 내 신청)

`GET /api/vehicle-runs` 응답의 `content[].myRequest`.

```
{
  "pickupLocation": "string | null",
  "note":           "string | null",
  "latitude":       "number(double) | null",   // 신규
  "longitude":      "number(double) | null"     // 신규
}
```

(프론트가 내 신청 카드에서 "내가 첨부한 위치 보기" 링크를 조립할 수 있게 — 좌표를 그대로 반환.)

### 4. `VehicleRosterEntryResponse` (어드민 탑승 명단)

`GET /api/admin/vehicle-runs/{id}/requests` 응답의 `content[]`.

```
{
  "name":           "string",
  "phone":          "string | null",
  "pickupLocation": "string | null",
  "note":           "string | null",
  "requestedAt":    "string(date-time)",
  "latitude":       "number(double) | null",   // 신규
  "longitude":      "number(double) | null"     // 신규
}
```

(기사가 좌표가 있으면 정확한 핀으로 지도를 연다 — 프론트가 좌표로 지도 URL 조립.)

## 바뀌지 않는 것 (Non-goals)

- 신규 엔드포인트 없음.
- 권한·게이트 변경 없음(`VEHICLE_APPLY` 신청, `VEHICLE_MANAGE` 명단 그대로).
- 역지오코딩·주소 정규화 없음 — 백엔드는 좌표를 원본 그대로 저장·반환.
- 위치 정확도(accuracy)·좌표 출처(GPS/IP)·타임스탬프 등 부가 메타 저장 안 함(범위 밖).
- 신청 수정 API는 여전히 없음(취소 후 재신청 — 기존 정책 유지).

## 검증 예시 (요청 → 결과)

| 요청 본문 | 결과 |
|---|---|
| `{pickupLocation:"OO아파트 정문"}` | 201 (텍스트만 — 기존 동작) |
| `{latitude:37.5, longitude:127.0}` | 201 (좌표만 — 원탭) |
| `{pickupLocation:"정문", latitude:37.5, longitude:127.0}` | 201 (둘 다) |
| `{note:"2명"}` (텍스트·좌표 없음) | 400 INVALID_INPUT_VALUE |
| `{latitude:37.5}` (경도 누락) | 400 INVALID_INPUT_VALUE |
| `{pickupLocation:"정문", latitude:200, longitude:127}` | 400 INVALID_INPUT_VALUE |

## 프론트 후속(참고 — 백엔드 작업 아님)

- 신청 다이얼로그에 "현재 위치 첨부" 버튼(브라우저 geolocation) 추가 → `latitude`/`longitude` 전송.
- 명단·내 신청 카드에서 좌표가 있으면 지도 링크(카카오맵 URL 스킴, 키 불필요)로 핀 열기.
- PC는 위치가 부정확할 수 있어 안내 문구 노출(모바일 권장). 이 스펙(백엔드)과 무관.
