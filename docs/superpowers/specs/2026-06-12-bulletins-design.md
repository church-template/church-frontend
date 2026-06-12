# 주보 목록·PDF 열람 (T13) — 설계 (Design Spec)

**작성일:** 2026-06-12
**이슈:** `.issues/T13-bulletins.md` (GitHub #14)
**참조:** 가이드 10장(주보)·6장(미디어)·7장(작성자), OpenAPI `/api/bulletins`·`/api/media/{id}`, DESIGN.md
**선행:** T6(공통 컴포넌트)·T7(앱 셸) — 모두 완료

---

## 1. 목적·범위

주보 목록을 공개 서버 컴포넌트로 구현하고, 항목 클릭 시 PDF를 브라우저 기본 뷰어(새 탭)로 열람한다. 주보는 본문이 없고 PDF media FK(`mediaId`)만 가진다.

- **범위 안:** `/bulletins` 목록 페이지(페이지네이션 포함), `BulletinRow` 행 컴포넌트, `lib/api/bulletins.ts` 데이터 레이어, DESIGN.md `bulletin-row` 항목 추가.
- **범위 밖:** 상세 페이지(`/bulletins/[id]`), 주보 등록·수정·삭제(어드민 `/api/admin/bulletins`), PDF 임베드 뷰어, 검색·태그 필터(백엔드에 필터 없음).

**백엔드 변경 없음** — `GET /api/bulletins`(공개)·`GET /api/media/{id}`(공개)는 OpenAPI에 확정. 이 작업은 100% 프론트.

---

## 2. 확정된 설계 결정

| # | 결정 | 근거 |
|---|---|---|
| D1 | **PDF 열람 = 새 탭 직행** (`<a target="_blank">` → `/api/media/{mediaId}`) | T13 이슈가 명시 허용한 방식. 브라우저 기본 PDF 뷰어 사용 — 가장 단순하고, Android iframe PDF 미지원 이슈를 회피. 백엔드가 `Content-Disposition: inline`을 보장하므로 다운로드 강제 없음 |
| D2 | **상세 페이지 없음** | 행 클릭이 곧 PDF 열람. 상세 API의 추가 정보(`updatedAt`·`version`)는 공개 화면에 표시할 것이 없음(YAGNI). 상세 fetch 함수도 만들지 않음 |
| D3 | **목록 = 행 목록** (notice-row 시각 문법) | 주보는 썸네일·본문 없이 title·serviceDate·author 세 필드뿐 — 문서형 콘텐츠에 행이 자연스럽고 기존 디자인 범위 내 |
| D4 | **`BulletinRow` 신설** (NoticeRow 일반화 안 함) | 주보 행은 외부 anchor(`target="_blank"`) + author 표기로 NoticeRow와 동작이 다름. 기존 공지 코드를 건드리지 않는 수술적 범위. 단일 사용처 추가를 위한 선제 일반화는 YAGNI |

---

## 3. 데이터 계약

### 3.1 API (OpenAPI 확정)

| 경로 | 인증 | 반환 |
|---|---|---|
| `GET /api/bulletins?page&size&sort` | 공개 | `Page<BulletinCardResponse>` — 봉투 `{ content, page }`, 기본 정렬 `serviceDate,desc`, **필터 없음** |
| `GET /api/media/{mediaId}` | 공개 | PDF 바이트. `Content-Type: application/pdf` + `Content-Disposition: inline` + `X-Content-Type-Options: nosniff`. Range(206)/캐시 헤더 없음(백엔드 E) — 새 탭 열람엔 무방 |

### 3.2 타입 — `src/lib/api/types.ts`에 추가

```ts
// OpenAPI BulletinCardResponse 그대로. 본문 없음 — PDF는 mediaId FK(가이드 10장).
export interface BulletinCardResponse {
  id: number;
  title: string;
  serviceDate: string; // date (yyyy-MM-dd) — 예배일
  mediaId: number;
  createdAt: string; // LocalDateTime
  author?: string | null; // 서버 마스킹 적용(가이드 7장)
}
```

`BulletinDetailResponse`는 선언하지 않는다(D2 — 사용처 없음).

### 3.3 fetch — `src/lib/api/bulletins.ts` 신설

notices.ts 패턴을 따르되, 쿼리 빌더는 **공용 `buildListQuery`(`lib/page.ts`, 기 테스트됨)를 재사용**한다 — 주보 파라미터(page·size·sort)가 `ListQuery`의 부분집합이라 전용 빌더가 불필요(DRY. sermons만 q/preacher 등 전용 필터 때문에 자체 빌더를 가짐):

```ts
// 주보는 필터 없음(가이드 10장) — 공용 ListQuery에서 tagId만 타입으로 차단.
export type BulletinListParams = Omit<ListQuery, "tagId">;

// 목록(공개) — revalidate 60. 서버 컴포넌트 전용. 정렬은 서버 신뢰(재정렬 금지).
export async function getBulletins(p?: BulletinListParams): Promise<Page<BulletinCardResponse>>;
```

- 실패 시 `throw new Error("GET /api/bulletins 실패: {status}")` → 기존 `error.tsx` 경계.
- 주보는 조회수 부수효과가 없으므로 `no-store` 불필요 — 목록은 `revalidate 60`.

### 3.4 PDF URL

`apiUrl(`/api/media/${mediaId}`)` — 기존 `lib/auth/apiBase.ts` 헬퍼 재사용. `NEXT_PUBLIC_API_BASE`가 빌드 시 인라인되므로 서버 렌더 anchor에서도 동일 동작.

---

## 4. 컴포넌트 — `BulletinRow`

`src/components/cards/BulletinRow.tsx` 신설. NoticeRow의 시각 문법(hairline 행 구분, hover 시 제목만 primary 전이, 행 전체가 클릭 영역, `py-base`)을 따른다.

```
┌──────────────────────────────────────────┐
│ 2026년 6월 둘째 주 주보        2026. 6. 7. │  ← 제목(typo.titleSm) | serviceDate(typo.datetime, muted)
│ 김○○                                     │  ← author(typo.bodySm, muted)
├──────────────────────────────────────────┤
```

```ts
export interface BulletinRowProps {
  title: string;
  date: string;     // formatDate(serviceDate) 결과
  author?: string | null; // 서버 마스킹 그대로 표기. null/빈 값이면 줄 생략(삼항)
  pdfUrl: string;   // apiUrl 결합 완료된 절대/상대 URL
}
```

- 루트는 `<a href={pdfUrl} target="_blank" rel="noopener noreferrer">` — 외부(백엔드 오리진) PDF라 `next/link` 미사용.
- 새 탭 안내: `<span className="sr-only">(새 탭에서 PDF 열림)</span>` — 스크린리더·접근성 배려.
- 포커스 링은 NoticeRow와 동일(`focus-visible:ring-2 ring-primary`).
- 아이콘·이모지 없음. 필요해지면 lucide만(프로젝트 규칙) — 1차 범위에선 미사용.

**DESIGN.md 반영:** `components:` 절에 `bulletin-row` 항목을 먼저 추가한 뒤 구현한다(문서에 없는 컴포넌트 금지 규칙):

> **`bulletin-row`**: 주보 행(notice-row 변형). 제목 `{typography.title-sm}` + 예배일 `{typography.datetime}` `{colors.muted}` + 작성자 `{typography.body-sm}` `{colors.muted}`. 행 전체가 새 탭 PDF 링크(`/api/media/{id}`), 1px 헤어라인 구분.

---

## 5. 페이지 조립 — `src/app/(site)/bulletins/page.tsx`

notices/page.tsx 골격 재사용(공개 서버 컴포넌트):

1. `searchParams`(Promise) await → `page`만 파싱(`toNum` — NaN 방어 동일). 필터가 없으므로 `q`·`tagId` 파싱 없음.
2. `getBulletins({ page })` 단일 fetch — 태그 fetch 없음(`TagFilter`·`SearchPill` 미사용).
3. 렌더 순서:
   - `<h1>주보</h1>` (`typo.displayMd`, `text-ink`)
   - 빈 목록 → `EmptyState("등록된 주보가 없습니다.")`
   - 행 목록: `content.map(b => <BulletinRow title={b.title} date={formatDate(b.serviceDate)} author={b.author} pdfUrl={apiUrl(\`/api/media/${b.mediaId}\`)} />)`
   - `totalPages > 1`일 때만 `<Pagination page={data.page} />`
4. 정렬은 서버 기본(`serviceDate,desc`) 신뢰 — `sort` 파라미터 미전송, 프론트 재정렬 금지.

---

## 6. 에러·엣지 케이스

| 상황 | 처리 |
|---|---|
| 목록 fetch 실패(5xx 등) | throw → 기존 `app/error.tsx` 경계(다른 공개 페이지와 동일) |
| 빈 목록 | `EmptyState` — 레이아웃 점프 방지(13.2 원칙 준용) |
| `author` 마스킹 값 | `"(탈퇴한 사용자)"`·`"(알 수 없음)"` 그대로 표기(가이드 7장 — 프론트 재판단 금지) |
| `author` null/빈 문자열 | author 줄 생략(삼항 — `{cond ? <X/> : null}` 규칙) |
| `page` 파라미터 NaN/음수 | NaN은 `toNum`이 undefined로 → 백엔드 기본 0페이지. 음수·범위 초과는 백엔드 400/빈 목록 → error 경계/EmptyState |
| 새 탭에서 media 404 | 백엔드 응답을 브라우저가 그대로 표시 — 프론트 개입 없음(링크는 서버 응답 `mediaId` 기반이라 정상 데이터에선 발생하지 않음) |
| `serviceDate`(date-only) 파싱 | `parseServerDate`가 `T00:00:00+09:00` 부착(KST 가정) — `formatDate` 그대로 사용 |

---

## 7. 테스트 계획 (TDD — RED→GREEN→REFACTOR)

| 대상 | 케이스 |
|---|---|
| `bulletins.test.ts` | `getBulletins` 호출 URL(쿼리 직렬화 — `page=2` 반영·빈 파라미터는 쿼리 없음)·`revalidate 60` 옵션·실패 시 throw. `buildListQuery` 자체는 기존 `page.test.ts`가 커버(중복 테스트 안 함) |
| `BulletinRow.test.tsx` | 제목·날짜·author 렌더 / `target="_blank"`·`rel="noopener noreferrer"` 속성 / href = pdfUrl / author 없으면 줄 미렌더 / sr-only 새 탭 안내 존재 |
| `bulletins/page.test.tsx` | 목록 렌더(행 수·필드) / 빈 목록 → EmptyState / totalPages>1 → Pagination 표시, 1이면 미표시 / page 파라미터 전달 |

**검수 게이트(T13 §5):**
- [ ] 목록이 예배일 내림차순(서버 정렬 신뢰 — 응답 순서 그대로 렌더됨을 테스트로 확인)
- [ ] PDF가 inline으로 열린다(다운로드 강제 아님) — 백엔드 헤더 보장, 수동 검수로 확인

---

## 8. 알려진 한계·관찰 사항

- **markdown.ts의 `media:{id}` 치환이 상대경로**(`/api/media/{id}`, `apiUrl` 미사용)다. 별도 오리진 배포 시 본문 이미지가 깨질 수 있는 잠재 이슈 — **T13 범위 밖**이므로 수정하지 않고 기록만 남긴다.
- PDF 대용량 시 Range 미지원으로 전체 다운로드(백엔드 E) — 일반 주보 PDF 열람엔 무방, 프론트 대응 없음.
