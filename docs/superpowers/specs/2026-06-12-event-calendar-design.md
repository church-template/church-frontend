# 일정 캘린더 (T12) — 설계 (Design Spec)

**작성일:** 2026-06-12
**이슈:** `.issues/T12-event-calendar.md`
**참조:** 가이드 15.3·10장·13.2, OpenAPI `/api/events`·`/api/events/{id}`, DESIGN.md
**선행:** T6(공통 컴포넌트·`date.ts`)·T7 — 모두 완료

---

## 1. 목적·범위

읽기 전용 일정 캘린더를 **직접 구현**(외부 캘린더 라이브러리 금지)하고, 일정 상세를 **모달 + 딥링크**로 연결한다.

- **범위 안:** `/events` 월 그리드(데스크톱)·날짜그룹 목록(모바일), 태그 필터, 월 네비게이션, 칩 클릭 → 상세 모달, `/events/{id}` 딥링크 상세.
- **범위 밖:** 일정 등록·수정·삭제(어드민 `/api/admin/events`), 가로 연결 바(기간 이벤트 bar), 태그 다중선택, 페이지네이션 UI.

**백엔드 변경 없음** — `GET /api/events`·`GET /api/events/{id}`는 이미 존재하고 OpenAPI에 확정. 이 작업은 100% 프론트.

---

## 2. 확정된 설계 결정

| # | 결정 | 근거 |
|---|---|---|
| D1 | **렌더링 = 서버 컴포넌트 + URL `?year&month&tagId`** | 공개 페이지 규칙(15.1, 서버+ISR). 설교·공지와 동일. 월/태그 상태가 북마크·공유 가능. TanStack(회원 전용) 미사용 |
| D2 | **상세 = 클라 Dialog 모달 + 딥링크 페이지** | 사용자 선택. 인터셉팅 라우트 대비 라우팅 단순·blast radius 최소. 모달·페이지가 `EventDetailView` 공유 |
| D3 | **TagFilter 포함** | 사용자 선택. `tagId`가 데이터 계약에 있고 컴포넌트 재사용 가능. 목록 페이지들과 일관 |
| D4 | **셀 계산 = KST 민간-날짜 직접 구현, date-fns 미도입** | 정확성+단순성. date-fns 캘린더 함수는 런타임 로컬 TZ 기준이라 **서버 컴포넌트(프로덕션 UTC)** 버킷팅에서 날짜 경계가 어긋남(검수 ③④ 파손). 직접 구현이 더 정확하고 의존성도 없음 (§9 참조) |

---

## 3. 라우트·파일 구조 (신규)

```
src/app/(site)/events/page.tsx            # 서버: 월 그리드 + 모바일 목록
src/app/(site)/events/[id]/page.tsx       # 서버: 딥링크 상세
src/lib/api/events.ts                     # getEvents / getEvent / buildEventQuery
src/lib/calendar.ts                       # KST 민간-날짜 격자·버킷팅 코어 (TZ 안전, 순수)
src/components/events/EventCalendar.tsx    # 클라: 그리드+목록+모달 상태 오케스트레이션
src/components/events/EventChip.tsx        # 칩(badge-pill-primary, 클릭→모달)
src/components/events/EventDayPopover.tsx  # "+n" 더보기 Popover(그 날짜 전체 이벤트)
src/components/events/EventDetailView.tsx  # 상세 표시(공유: 모달·딥링크 페이지)
src/components/events/EventDetailModal.tsx # 클라 Dialog + description 클라 fetch
```

기존 `EventSection`(메인)이 이미 `/events`·`/events/{id}`로 링크 중 → 본 작업이 그 목적지를 채운다(고아 링크 해소).

**기존 파일 수정(최소):** `EventCard`의 `date`를 optional로(없으면 날짜 배지 생략) → 모바일 목록 재사용(메인 호출부는 date를 그대로 넘기므로 무영향). `date.ts`에 `formatClockTime`, `calendar.ts`에 `formatAllDayRange` 추가(§6). 신규 컴포넌트는 5개(EventCalendar·EventChip·EventDayPopover·EventDetailView·EventDetailModal).

---

## 4. 데이터 계층

### 4.1 `lib/api/events.ts`
```ts
export interface EventListParams {
  year: number;   // month와 항상 쌍 (반쪽 전송 경로 없음)
  month: number;  // 1–12
  tagId?: number;
  size?: number;  // 기본 EVENTS_PAGE_SIZE=200 (상수화, 매직넘버 인라인 금지)
}
```
- `buildEventQuery(p)` → `?year={y}&month={m}&size={size}[&tagId=]`. **year·month는 항상 함께** 직렬화한다(검수 ②). 호출부가 반쪽 파라미터를 만들 수 없도록 타입에서 둘 다 필수.
- `getEvents(p): Promise<Page<EventCardResponse>>` — `fetch(apiUrl(...), { next: { revalidate: 60 } })`, `!res.ok` → throw(루트 `error.tsx` 위임).
- `getEvent(id): Promise<EventDetailResponse | null>` — `next: { revalidate: 60 }`(일정은 **viewCount 부수효과 없음** → 공지와 달리 `no-store` 불필요), `404` → null.

> **size=200 상한:** 한 달 이벤트가 200건을 초과하면 잘린다. 교회 운영상 비현실적이지만, 초과 시 마지막 이벤트들이 누락됨을 명시한다(무한 페이지네이션은 1차 범위 밖). 백엔드 기본 `size=10`이라 반드시 명시 전달.

### 4.2 `lib/api/types.ts` — 추가
```ts
// 일정 상세 — 카드 메타 + description·수정일·낙관적 락(OpenAPI EventDetailResponse).
// 필드 집합은 OpenAPI와 정확히 일치(11개). nullable(?)은 OpenAPI 명시가 아니라
// 도메인 규약(가이드 13.2 점 이벤트·10장 description) + types.ts 관행 기반 해석.
export interface EventDetailResponse {
  id: number;
  title: string;
  description?: string | null; // raw 마크다운 (없을 수 있음)
  location?: string | null;
  startAt: string;             // LocalDateTime
  endAt?: string | null;       // null = 점 이벤트
  allDay: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;             // 낙관적 락 (표시엔 미사용, 어드민 대비)
  tags: TagResponse[];
}
```
`EventCardResponse`는 이미 존재(`endAt?: string | null` 주석 = 점 이벤트).

---

## 5. KST 캘린더 코어 — `lib/calendar.ts` (이 작업의 심장)

**불변식: 모든 셀 판정은 "KST 민간 날짜 `(y,m,d)`" 값으로만 한다.** Date 인스턴스의 로컬-TZ 메서드(`getDate`/`getDay`)에 의존하지 않는다. 서버 페이지에서 1회 계산해 **직렬화 모델**로 클라에 전달 → 하이드레이션 불일치 0, 런타임 TZ 무관.

### 5.1 타입·헬퍼
```ts
export interface CivilDate { y: number; m: number; d: number } // m: 1–12
export const civilKey = (c: CivilDate) => c.y * 10000 + c.m * 100 + c.d; // 비교/정렬용 정수

// 인스턴트 → KST 벽시계 민간 날짜. Intl(Asia/Seoul)로 추출(런타임 TZ 무관).
function kstCivilFromDate(date: Date): CivilDate;   // Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Seoul'})
export const kstCivil = (iso: string): CivilDate => kstCivilFromDate(parseServerDate(iso));
export const civilWeekday = (c: CivilDate): number => // 0=일 … 6=토
  new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay();  // UTC 고정 → TZ 무관
```

### 5.2 월 격자 — `monthMatrix(year, month): Cell[][]`
- `Cell = { civil: CivilDate; inMonth: boolean }`.
- `firstWeekday = new Date(Date.UTC(year, month-1, 1)).getUTCDay()` (일요일 시작).
- `daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()`.
- `weeks = Math.ceil((firstWeekday + daysInMonth) / 7)` → **4·5·6행**(일요일 시작 28일 2월은 4행, 예: 2026-02). 그리드는 데이터 구동이라 가변 행수가 정상 — **고정 높이/행수 CSS 금지**.
- 각 셀 `i`(0..weeks*7-1)의 민간 날짜:
  ```ts
  const dt = new Date(Date.UTC(year, month - 1, 1 - firstWeekday + i)); // 음수/오버플로 자동 보정
  const civil = { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  const inMonth = civil.y === year && civil.m === month;
  ```
  `Date.UTC`로만 산술 → 모든 런타임에서 동일 결과.

### 5.3 이벤트 버킷팅 — `bucketEvents(events): Map<number, EventCardResponse[]>`
키 = `civilKey`. 각 이벤트가 점유하는 **모든 KST 날짜**에 배치.

**`end_at` 규약(가정 A1, §13):** OpenAPI `/api/events` 설명·이슈 §1(`end_at` 배타; 종료 7/1 00:00 → 6월 표시·7월 미표시)에 따라 **`end_at` 배타 경계를 타임드·all-day 균일 적용**한다. 즉 하루를 덮는 all-day는 `end=익일 00:00`으로 인코딩된다고 가정(§13에서 실데이터 검증).

- **NaN 가드(§13 A3):** `parseServerDate(startAt)`가 `Invalid Date`(offset 접미사 등 계약 위반)면 그 이벤트는 버킷에서 **스킵**(무음 `NaN` 전파 차단).
- **점 이벤트(`endAt == null`):** `[startC]` — 시작일 셀만(검수 ③). `startC = kstCivil(startAt)`.
- **기간 이벤트(`endAt != null`):**
  - `lastC = kstCivilFromDate(new Date(parseServerDate(endAt).getTime() - 1))` — **종료 1ms 전**의 민간 날짜. 자정 종료면 그날 자동 제외 → **배타 경계**(검수 ④). 예: `end=2026-07-01T00:00` → `lastC=2026-06-30`.
  - **퇴화 방어:** `civilKey(lastC) < civilKey(startC)`(즉 `end ≤ start`, 백엔드가 점 이벤트를 `end=start`로 보낸 경우 포함, §13 A2)이면 `[startC]`만.
  - 아니면 `startC..lastC` 전 날 배치. **달 경계 OVERLAP**(`startC`가 조회 월 이전)도 동일 `Date.UTC` 산술로 처리(이슈 §1).
- 날짜 열거는 §5.2와 동일한 `Date.UTC` 증분으로 TZ 안전.
- 셀 내 정렬: 서버가 `startAt asc`로 주므로 삽입 순서 보존(재정렬 금지).
- **표시 일관성(중요):** all-day 범위 라벨도 **동일한 `lastC`(포함 마지막 날)**에서 파생한다(§6) → 그리드 점유 날들과 라벨이 항상 일치(라벨 "~6.15"인데 셀은 14만 채우는 불일치 차단).

### 5.4 모델 빌더 — `buildCalendarModel({ year, month, events, today })`
서버 페이지가 호출. 반환(직렬화 가능):
```ts
interface CalendarModel {
  year: number; month: number;
  today: CivilDate;                  // 서버 계산(오늘 마커) → 하이드레이션 안정
  weeks: { civil: CivilDate; inMonth: boolean; events: EventCardResponse[] }[][];
  dayGroups: { civil: CivilDate; weekday: number; events: EventCardResponse[] }[]; // 모바일: inMonth & 이벤트 有, 오름차순
}
```
- `currentKstYearMonth()`·오늘 `today`는 `new Date()`(앱 런타임, 워크플로 아님 → 사용 가능)를 Intl(Asia/Seoul)로 변환.

---

## 6. 표시 포매터

**타임드 이벤트**는 기존 `parseServerDate`·`formatDate`·`formatEventTime`를 그대로 재사용(시각 표기 이미 정확). **all-day 범위**는 §5.3의 `lastC`에서 파생해 **버킷과 일치**시킨다 — `formatEventTime`의 all-day·다일 분기(`~ monthDayFmt(endAt)`)는 raw `endAt`을 써 배타 경계와 하루 어긋나므로(메인 EventCard에도 잠재 영향 → §12 후속) 캘린더 all-day 라벨에는 쓰지 않는다.

`lib/date.ts` 추가:
```ts
// 칩·상세의 시각 — KST "HH:mm". allDay는 호출부에서 분기(이 함수는 시각만).
export function formatClockTime(iso: string): string; // 기존 내부 timeFmt 재사용
```
`lib/calendar.ts` 추가:
```ts
// all-day 범위 라벨 — lastC(포함 마지막 날) 기준. 단일일이면 null(날짜는 배지·헤더 담당).
export function formatAllDayRange(startAt: string, endAt: string | null): string | null;
//   단일일(lastC == startC) → null  /  다일 → "~ M. D." (lastC를 monthDay로)
```

- **칩 라벨(EventChip):** `allDay` → 제목만 / 아니면 `${formatClockTime(startAt)} 제목`(검수 ⑤), 1줄 말줄임.
- **EventDetailView·모바일 카드 시각줄:**
  - `allDay` → **시각 생략**(검수 ⑤). 다일이면 `formatDate(startAt)` + `formatAllDayRange(...)`("~ M. D."는 **날짜** 표기라 ⑤의 '시간 미표기' 불위반).
  - 타임드 → `formatDate(startAt)` + `formatEventTime(startAt, endAt, allDay)`.
  - 모두 KST 고정 포매터.

---

## 7. 컴포넌트

### 7.1 `EventCalendar` (client) — `CalendarModel` + `tagId` props
서버에서 받은 모델만 렌더(자체 날짜 연산 없음). 모달 상태(`selected: EventCardResponse | null`) 보유.
- **헤더:** `← {year}년 {month}월 →` — 월 `<Link href="/events?year=&month=&tagId=">`(이전/다음 월 정수 계산, `tagId` 보존) + **"오늘" 버튼**(현재 KST 월 Link). Pagination/TagFilter와 동일한 URL 네비.
- **데스크톱(`hidden lg:block`):** 7열 그리드. 요일 헤더(일~토, 일=`semantic-error`계열 아님 — 토큰 내 muted/ink). 셀: 날짜 숫자 `typo.datetime`(tnum); **오늘 = `primary-soft` 배경 원형 마커**; 달 외 = `muted-soft`. 이벤트 `EventChip` 최대 3 + 초과 시 `EventDayPopover`("+n").
- **모바일(`lg:hidden`):** `dayGroups`를 세로 목록. 그룹 헤더 `6월 14일 (토)`(민간 날짜 + `civilWeekday` 인덱스→`['일'..'토']`), 항목 = **`EventCard` 재사용**(`date` 미전달 → 날짜 배지 생략, 그룹 헤더가 날짜 담당; 제목·시각줄(§6)·장소·클릭). 신규 축약 카드 0개. 이벤트 0 → `EmptyState`("등록된 일정이 없습니다").
- 칩/항목 클릭 → `setSelected(event)` → `EventDetailModal`.
- **JSX 조건부는 삼항**(`cond ? <X/> : null`), **z-index·색·간격은 토큰**(인라인 금지), 칩 라운드 `rounded-sm`(배지=8px, DESIGN.md 중첩 라디우스).

### 7.2 `EventChip` (시각 컴포넌트)
`badge-pill-primary` 스타일 버튼. props: `event`, `onClick`. allDay 분기(§6). `aria-label`에 제목+시각. focus-visible 링.

### 7.3 `EventDayPopover` (client)
Radix `Popover`(`components/ui/popover`). 트리거 "+n" 버튼 → 그 날짜 **전체** 이벤트 칩 목록. ESC·외부클릭·포커스복귀는 Radix 제공(15.2). z `popover` 토큰.

### 7.4 `EventDetailView` (시각 — 서버/클라 공용)
순수 표시: 제목 `typo.titleLg` · 시각줄(§6) · 장소 `typo.bodySm muted` · 태그 칩(`/events?tagId=` Link) · `MarkdownContent(description)`(없으면 본문 생략). 모달과 딥링크 페이지가 **동일 컴포넌트** 사용 → 일관·중복 제거.

### 7.5 `EventDetailModal` (client)
Radix `Dialog`. `open = selected != null`, 닫힘 → `onClose`.
- 헤더(제목·시각·장소·태그)는 **카드 데이터(`selected`)로 즉시** 표시(`DialogTitle` 필수 — aria).
- 본문 description은 **클라 fetch**: `fetch(apiUrl('/api/events/{id}'))` → `EventDetailResponse`. **`NEXT_PUBLIC_API_BASE`가 클라 번들에 인라인돼야 도달**(미설정 시 동일 오리진으로 새어 404 — 운영 env 필수). 캐시는 브라우저 기본(공개·부수효과 없음). 로딩 중 `Skeleton`, 실패 시 `notify.error` + 본문만 비움(모달 유지). 공개 단건 GET·인증 불필요 → TanStack 미사용(회원 전용 규칙 준수, D2).
- 본문 도착 후 `EventDetailView`로 렌더(헤더 정보는 카드=상세 동일하므로 매끄럽게 대체). 딥링크 서버 `getEvent`(ISR)와 코드 경로는 다르나 **둘 다 `EventDetailView`로 표시 단일화**; 신선도 차이는 D2(클라 모달) 선택의 내재적 결과.

---

## 8. 데이터 흐름·검증·에러

### 8.1 `/events` 페이지 (server)
```
searchParams(year,month,tagId)
  → resolveMonth(): 정수 검증. 누락/비정상/반쪽 → 현재 KST 월 폴백 (400 차단, 검수 ①)
  → toNum(tagId)
  → Promise.all([ getEvents({year,month,tagId,size:200}), getTags() ])
  → buildCalendarModel({year,month,events,today})
  → <TagFilter tags/> + <EventCalendar model tagId/>
```
- searchParams 접근 → **동적 라우트**. 백엔드 없는 CI 빌드에서 prerender 미시도(설교·공지와 동일, `connection()` 불필요 — searchParams가 이미 동적화).

### 8.2 월 네비게이션
`<Link>`로 `?year&month` 교체(이전/다음은 `month===1 ? {y-1,12} : {y,m-1}` 정수 산술), `tagId` 보존. URL 변경 → 서버 재렌더(ISR 60s). 클라 상태 없음.

### 8.3 `/events/{id}` 딥링크 (server)
```
params.id → 정수 검증(아니면 notFound) → getEvent(id) → null이면 notFound
  → Container + EventDetailView(event) + "일정으로" 뒤로가기 Link
```

### 8.4 에러
- `getEvents` 실패 → throw → 라우트 `error.tsx`.
- 상세 404·잘못된 id → `notFound()`.
- 모달 클라 fetch 실패 → `notify.error`(Toast), 모달은 헤더만 유지.

---

## 9. date-fns 결정 노트 (§D4 상세)

스택 표(15.1)·이슈 제목은 "date-fns로 셀 계산"을 명시하나, 본 캘린더는 **서버 컴포넌트에서 버킷팅**한다. date-fns의 `startOfWeek`/`eachDayOfInterval`/`isSameDay`는 **런타임 로컬 TZ**로 동작하므로, 프로덕션/CI(UTC)에서 `parseServerDate` 결과에 적용하면 KST 날짜 경계가 어긋나 검수 ③(점 이벤트)·④(배타 경계)가 깨진다. 가이드 15.3의 date-fns 예시는 KST 브라우저를 암묵 가정한 것.

→ 따라서 §5는 `Date.UTC` + Intl(Asia/Seoul)만으로 KST 민간-날짜를 직접 계산한다. 더 정확하고, **외부 의존성 0**(검수 ⑥과도 부합). `lib/date.ts`·`lib/calendar.ts` 상단 주석에 이 사유를 1줄로 남긴다. `package.json`에 date-fns를 추가하지 않는다.

---

## 10. 테스트 전략 (TDD, 검수 기준을 게이트로)

> 번호 혼동 방지: 이슈 §5 기준을 그대로 인용하고, 스펙이 쪼갠/추가한 행은 별도 표기. ("검수 ④"는 본 표 기준 = 배타 경계.)

| 이슈 §5 검수 기준 (또는 +추가) | 테스트 파일 / 단언 |
|---|---|
| 월 이동 `year`+`month` 쌍 재조회(반쪽 400 없음) | `events.test.ts`(쿼리 쌍 단언; `buildEventQuery`는 항상 year·month 함께) + `EventCalendar.test.tsx`(nav href에 year·month 동시) + `events.page.test.tsx`(반쪽/누락 → 현재 월 폴백) |
| `endAt=null` 점 이벤트 시작일 셀만 | `calendar.test.ts`(점 이벤트 + 퇴화 `end==start`도 시작일만) |
| 기간 이벤트 전 셀 + `end_at` 배타(자정 다음날 제외) | `calendar.test.ts`(`end=…T00:00` → 그날 미포함) |
| `allDay` 시간 미표기(다일 "~M.D."는 날짜라 허용) | `EventChip.test.tsx`(제목만) / `EventDetailView.test.tsx`(시각 생략, all-day 다일 라벨=`lastC` 파생) |
| 오늘 마커·1024px 전환 | `EventCalendar.test.tsx`(today 셀 클래스·`lg:` 토글) |
| 외부 캘린더 라이브러리 부재 | `package.json`에 fullcalendar/react-big-calendar/**date-fns** 부재 단언 |
| **+OVERLAP 달 걸침** — `startC` 조회 월 이전·`lastC` 월 내 → 이전 달 셀 포함 전 구간 버킷 | `calendar.test.ts`(달 경계 회귀, 이슈 §1) |
| **+TZ 안전** — UTC 자정 경계 이벤트가 KST 버킷 불변 | `calendar.test.ts`(로컬 TZ 무관 회귀) |
| **+표시↔버킷 일치** — all-day 다일 그리드 점유 날들과 라벨 `lastC` 동일 | `calendar.test.ts` + `EventDetailView.test.tsx` |
| **+NaN 가드** — offset 접미사/Invalid 입력 이벤트는 버킷 스킵 | `calendar.test.ts` |

추가 테스트:
- `events.test.ts`: `getEvent` 404→null, `getEvents`/`getEvent` revalidate(no-store 아님).
- `events.[id].page.test.tsx`: 잘못된 id→notFound, null→notFound, description 렌더.
- `EventDetailModal.test.tsx`: 선택 시 헤더 즉시 표시 + fetch 후 description, fetch 실패 시 notify.
- `EventDetailView.test.tsx`: 태그 Link(`/events?tagId=`), description 없으면 본문 생략.

목표 커버리지 80%+. `calendar.ts`는 100% 지향(분기 명확).

---

## 11. DESIGN.md·규약 준수 체크
- 토큰만 사용(hex·px·z-index 인라인 금지), 칩=`rounded-sm`(8px)·primary-soft, 카드=`rounded-xl`.
- `typo.*` 의미 상수(날짜=`datetime` tnum). 이모지 금지, 아이콘=`lucide-react`(`ChevronLeft`/`ChevronRight`).
- JSX 조건부 삼항. 콘텐츠 하드코딩 금지(빈 문구는 기존 EmptyState 패턴 재사용).
- 동작 컴포넌트(Dialog·Popover)는 `components/ui/` 래퍼 경유(직접 Radix import 금지).

---

## 12. 미해결/후속 (범위 밖 명시)
- 기간 이벤트 가로 연결 바, 태그 다중선택, 월 200건 초과 페이지네이션 — 후속.
- 어드민 일정 CRUD — 별도 배치.
- **`formatEventTime` all-day·다일 분기 보정(메인 EventCard 영향):** 현재 raw `endAt`을 표시해 배타 경계와 하루 어긋남. T12는 캘린더에서 `formatAllDayRange`로 우회하고, 전역 보정은 §13 A1 검증 후 별도 처리(메인 표시 회귀 테스트 동반).
- 가이드 15.1 스택 표(date-fns 행)에 "셀 계산은 TZ 안전 위해 직접 구현(§9)" 단서 추가 — 표↔구현 불일치 해소(문서 작업).

---

## 13. 가정 — 실데이터로 검증 필요 (Assumptions)

OpenAPI가 `endAt`/`allDay` 인코딩 의미를 기술하지 않으므로 아래는 가이드 10장·이슈 §1 기반 가정이다. 구현 중 실제 일정으로 확인하고, 어긋나면 §5.3 분기를 조정한다.

- **A1 (all-day end 배타):** all-day end는 `익일 00:00`(배타)로 인코딩된다. 검증: 6/14~6/15 이틀 all-day 생성 → 응답 `end`가 `06-16T00:00`인지 확인. (만약 `06-15T00:00`=포함 인코딩이면 §5.3 all-day 분기를 `lastC = kstCivil(endAt)`로 전환 — 버킷·`formatAllDayRange` 양쪽 동시 조정.)
- **A2 (점 이벤트):** 점 이벤트는 `endAt = null`. 백엔드가 `end = start`로 보내도 §5.3 퇴화 방어로 시작일만 표시 — 테스트로 고정.
- **A3 (offset 없는 LocalDateTime):** `startAt`/`endAt`은 offset/`Z` 없는 LocalDateTime(백엔드 A). offset 접미사는 계약 위반 → NaN 가드로 스킵.
