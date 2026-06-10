# [T12] 일정 캘린더 (15.3 직접 구현)

**라벨:** `page`
**선행:** T6, T7
**참조:** 가이드 15.3·10장(일정)·13.2, OpenAPI `/api/events`

---

## 목적
읽기 전용 일정 캘린더를 **직접 구현**(라이브러리 금지)하고, 일정 상세를 모달/딥링크로 연결한다. 일정 CRUD는 어드민(이번 배치 제외).

---

## 1. 데이터 — `GET /api/events` (공개, 페이징)
파라미터: `year`+`month` **또는** `startDate`+`endDate`(쌍 필수) · `tagId` · `pageable`.
- 카드 필드: `id`·`title`·`location`·`startAt`·`endAt`·`allDay`·`tags`. (**author·viewCount·description 없음**)

### 조회 규약 (백엔드 답변 A·B)
- **`GET /api/events?year={y}&month={m}&size=200`** — 기본 `size=10`이라 안 주면 잘림. 월 이동마다 재조회.
- **OVERLAP 조회**: 월을 걸치는 기간 이벤트(startAt 전달, endAt 이번달) 포함됨.
- 경계: `end_at` **배타**(종료가 7/1 00:00이면 6월엔 나오고 7월엔 안 나옴), `endAt=null`은 `start_at` 기준 점 이벤트.
- **반쪽 파라미터(year만/month만/startDate만) = 400.** year+month와 date 동시 전송 시 **year/month 우선**.
- datetime은 **`parseServerDate`(+09:00, T6)** — 겹침/셀 판정도 KST 벽시계 가정. `format: date-time`(시·분 있음), `allDay`면 시간 무시.

## 2. EventCalendar (15.3 — date-fns, 외부 캘린더 라이브러리 금지)

### 데스크톱 (≥1024px) — 월 그리드
- 7열(일~토) × 5~6행. `startOfWeek(startOfMonth())` ~ `endOfWeek(endOfMonth())`로 셀 범위.
- 셀: 날짜 숫자 datetime 토큰(tnum). 이번 달 외 = `muted-soft`. **오늘 = `primary-soft` 배경 원형 마커.**
- 이벤트 칩: `badge-pill-primary` 스타일, 제목 1줄 말줄임. **셀당 최대 3 + "+n" Popover**(T4, 그 날짜 이벤트).
- 기간 이벤트: 시작~끝 모든 셀에 칩 반복(가로 연결 바는 1차 제외). `allDay`면 시간 생략, 아니면 `HH:mm` 접두.
- 칩 클릭 → 일정 상세(§3).
- 헤더: `← 2026년 6월 →` 월 네비 + "오늘" 버튼.

### 모바일 (<1024px) — 날짜그룹 목록
- 월 그리드 대신 그 달 이벤트를 날짜별 그룹핑 세로 목록(같은 데이터, 다른 뷰).
- 그룹 헤더 `6월 14일 (토)`, 항목 = event-card 축약형(제목·시간·장소).
- 이벤트 없는 달 = EmptyState(T6).

## 3. 일정 상세 (승인)
- 칩 클릭 → **기본 모달**(T4 Dialog) + **딥링크 `/events/{id}`** 페이지.
- `GET /api/events/{id}`: 추가 필드 `description`(raw 마크다운, MarkdownContent T6)·`version`.

## 4. 완료 조건
- [ ] EventCalendar 직접 구현(date-fns), 데스크톱 그리드 + 모바일 목록(1024px 전환)
- [ ] `?year&month&size=200` 재조회(쌍 필수), OVERLAP·배타경계·점이벤트 처리
- [ ] 오늘 마커, 칩(최대 3 + "+n" Popover), allDay 시간 생략
- [ ] 칩 클릭 → 모달 + `/events/{id}` 딥링크, description 마크다운
- [ ] parseServerDate(+09:00) 일관 적용

## 5. 검수 기준 (15.3)
- [ ] 월 이동 시 `year`+`month` 쌍으로 재조회된다(한쪽만 보내는 400 케이스 없음).
- [ ] `endAt=null` 점 이벤트가 시작일 셀에만 표시된다.
- [ ] 기간 이벤트가 시작~끝 모든 날짜 셀에 나타나고, `end_at` 배타 경계가 지켜진다(종료 시각이 자정인 다음날 셀에 표시되지 않음).
- [ ] `allDay` 이벤트에 시간이 표기되지 않는다.
- [ ] 오늘 마커가 정확하고, 1024px 경계에서 그리드 ↔ 목록이 전환된다.
- [ ] 외부 캘린더 라이브러리 의존성이 `package.json`에 없다.
