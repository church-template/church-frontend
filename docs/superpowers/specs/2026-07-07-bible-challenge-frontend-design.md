# 성경통독 챌린지 프론트엔드 연동 설계

> 2026-07-07 브레인스토밍 확정본. 백엔드 D10 도메인(church-backend
> `docs/superpowers/specs/2026-07-06-bible-challenge-design.md`)의 프론트 연동.
> 스키마 단일 진실은 `docs/api-docs.json` (bible-challenges 9개 엔드포인트 반영됨).
> 이슈: `.issues/20260707_기능추가_성경통독_챌린지_연동.md`

## 1. 핵심 결정 사항

| 갈림길 | 결정 | 근거 |
|---|---|---|
| 브랜치 범위 | **회원 영역 + 어드민 CRUD 전부 한 브랜치** | 어드민 없이는 챌린지를 만들 수 없어 회원 영역 단독 검증 불가. 규모는 기존 어드민 트랙 1개 분량 |
| 네비 위치 | **예배·설교 그룹, `/challenges`** | 성경 읽기는 신앙 활동 — 의미상 자연스러움 |
| 접근 제어 | **전 엔드포인트 회원 전용** (`CHALLENGE_PARTICIPATE`, 어드민 `CHALLENGE_MANAGE`) | 백엔드 확정. 공개 페이지 없음 → RSC/ISR 불가, 전부 클라이언트 (갤러리 패턴) |
| 대시보드 디자인 | **C-2 다크 몰입**: 오늘 블록만 다크 밴드, 그 안에 초대형 타이포 | 고령 사용자 — 명암 대비 최대, "오늘의 무대" 단일화. 기존 다크 밴드 토큰 재사용 |
| 문구 | **일상어만** — "23일 연속으로 읽고 있어요", "목표보다 3일 빨라요" | 스트릭·페이스 등 전문용어 금지 |
| 달력 | **벽걸이 달력식** (읽은 날 ✓), 히트맵 아님. **달력 탭 = 소급 기록/취소 입구** | 어르신에게 익숙한 형태. 빈 날 탭 → 기록, 읽은 날 탭 → 확인·취소 |
| 목록 구성 | **참여 중 ONGOING 피처 카드 + 지난·예정 그리드** | 매일 오는 사람은 클릭 한 번으로 대시보드 도달 |
| 낙관적 업데이트 | **안 씀** — join/read/취소가 모두 `MyProgressResponse` 반환 → `setQueryData`로 즉시 반영 | 응답이 완전한 대시보드라 낙관적 롤백은 순수 비용 |

## 2. 라우트 · 컴포넌트 구조

```
src/app/(site)/challenges/page.tsx              # 얇은 RSC: Container+h1+ChallengeGate>ChallengeList
src/app/(site)/challenges/[id]/page.tsx         # 얇은 RSC: ChallengeGate>ChallengeDetail
src/app/(site)/mypage/manage/challenges/page.tsx # RequirePermission("CHALLENGE_MANAGE")>ChallengeManager

src/components/challenges/
  ChallengeGate.tsx        # GalleryGate 동형: 하이드레이션→비로그인 안내(/login?next)→권한 안내→통과
  ChallengeList.tsx        # 피처 카드 + 카드 그리드 + Pagination + EmptyState
  ChallengeDetail.tsx      # joined 분기 조립 (참여 전 CTA / 참여 후 대시보드)
  TodayBand.tsx            # 다크 밴드: 초대형 타이포·다읽었어요 버튼·완료 카드·진행바·문장형 통계
  ReadingCalendar.tsx      # date-fns 월 달력 (라이브러리 금지 — 일정 캘린더 선례)
  ReadDialog.tsx           # 장 수 입력·소급 기록·취소 다이얼로그 (오늘/과거 공용)
  queries.ts               # 컴포넌트 폴더 로컬 훅 (갤러리 컨벤션)
  schema.ts                # 장 수 입력 zod

src/components/mypage/MyChallengeHistory.tsx    # 내 참여 이력 (MypageContent에 <Reveal> 섹션 삽입)
src/components/admin/challenges/
  ChallengeManager.tsx     # DataTable + 등록/수정/삭제
  ChallengeFormDialog.tsx  # create/edit 공용, 낙관락 version 시드
  schema.ts

src/lib/api/challenges.ts        # 회원 GET/POST/DELETE — authFetch+parseJson+buildListQuery
src/lib/api/challenges.admin.ts  # 어드민 쓰기 — apiMutate, 요청 타입 도메인 로컬 (client 전용)
src/constants/bible.ts           # 66권 한글 이름 + 권별 장 수 + 헬퍼 (아래 5장)
```

- 공개 GET 응답 타입은 `src/lib/api/types.ts`에, 어드민 요청 타입(`version` 포함)은 `.admin.ts` 로컬 — 기존 규약.
- 네비: `navigation.ts` `WORSHIP_LINKS`에 `{ label: "성경통독", href: "/challenges", icon: "bookOpenCheck" }` 추가.
  `NavIconKey`에 `bookOpenCheck` 유니온 추가 + MegaMenu lucide 매핑(`BookOpenCheck`) 한 줄. 푸터·모바일은 자동 전파.
- 메인 페이지 배너는 제외 (메인은 공개 RSC, 챌린지 API는 회원 전용 — 데이터 노출 불가).

## 3. 데이터 흐름

### 쿼리 키 (짧은 배열, `retry: false`)

| 키 | 소스 | 비고 |
|---|---|---|
| `["challenges", params]` | `GET /api/bible-challenges` | keepPreviousData |
| `["challenge", id]` | `GET /{id}` | `joined` 플래그 포함 |
| `["challenge", id, "progress"]` | `GET /{id}/my-progress` | **joined일 때만 enabled** |
| `["challenge", id, "logs", month]` | `GET /{id}/my-logs?from&to` | 표시 중인 월 범위 |
| `["my-participations", page]` | `GET /my-participations` | 마이페이지 + 피처 판별 |

### 뮤테이션 (join / read / cancelRead — 모두 `MyProgressResponse` 반환)

```
onSuccess(progress):
  setQueryData(["challenge", id, "progress"], progress)   # 재요청 없이 즉시 반영
  invalidate(["challenge", id])                            # joined 플래그 (join 시)
  invalidate(["challenge", id, "logs"])                    # 달력 ✓ (read·cancel 시)
  invalidate(["my-participations"])                        # 마이페이지 숫자
```

- 뮤테이션 `isPending` 동안 버튼 비활성 + 스피너 (이중 클릭 1차 방어).
- 목록 피처 판별: 목록 응답(`ChallengeCardResponse`)에 `joined` 없음 → `my-participations` 1페이지에서
  `challenge.status === "ONGOING"`인 참여 건 탐색. 있으면 그 챌린지 피처(진행 요약은 `my-progress` 재사용),
  없는데 목록에 ONGOING 있으면 "참여하기" CTA 피처, 둘 다 없으면 피처 생략.
- 어드민 목록: 전용 GET이 없으므로 회원 `GET /api/bible-challenges` 재사용(`["challenges"]` 키 공유 —
  태그 관리자의 공개 `getTags` 재사용 선례). 쓰기 성공 시 `["challenges"]`·`["challenge", id]` invalidate.
  **ISR revalidate 불필요** (공개 페이지 없는 도메인).
- "오늘" 계산은 전부 서버(KST) — 프론트는 달력의 오늘 표시만 기존 `date.ts` 유틸 사용.
  progress는 `refetchOnWindowFocus`(기본값)로 자정 경계 자연 갱신.

## 4. 화면별 상세

### 목록 `/challenges`

- 피처 카드(다크 밴드 미니): 참여 중 = "오늘 읽을 곳 · 진행률 · [오늘 기록하러 가기]" / 미참여 ONGOING = 소개 + [참여하기].
- 카드 그리드(2-up, 모바일 1-up): 상태 Badge + 제목 + 기간 + "마태복음~요한계시록 · 260장 · 하루 4장".

### 상세 `/challenges/[id]` — `joined` 분기

- **참여 전**: 헤더 + 다크 밴드 자리에 참여 CTA("260장을 65일 동안, 하루 4장씩" + [챌린지 참여하기]) + 소개(`MarkdownContent`).
- **참여 후 (C-2)**: `TodayBand` + `ReadingCalendar` + 소개.

### TodayBand 상태표

| 상태 | 표시 |
|---|---|
| 기록 전 | "오늘 읽을 곳 · 1월 27일 (화)" + **초대형 "마태복음 5~8장"** + "오늘 4장을 읽어요" + [다 읽었어요](풀폭 56px) + 보조(장 수 바꾸기·지난 날짜 기록) + 진행바 + 문장형 통계 |
| 기록 후 (`todayDone`) | ✓ 완료 카드 "오늘 4장을 다 읽었어요 / 내일은 마태복음 9장부터예요" + 보조(더 읽었어요·오늘 기록 취소) |
| UPCOMING | "1월 5일에 시작해요 (D-7)" 카운트다운 (참여는 가능) |
| ENDED | "종료된 챌린지예요. 끝까지 완주해요!" — 기록 계속 허용(백엔드 의도), `paceDays` null → 해당 줄 생략 |
| 완독 (`roundsCompleted ≥ 1`) | "1회 완독 · 2회차 진행 중" 문구 추가 |

- 문장형 통계 3줄: "260장 중 89장 읽었어요 (34%)" / "23일 연속으로 읽고 있어요" / "목표보다 3일 빨라요"(음수면 "3일 늦어요").
- 모바일: 다크 밴드 좌우 풀블리드, 초대형 타이포 clamp 축소, 버튼 풀폭.

### ReadingCalendar

- 월 이동(챌린지 시작월 ~ 현재월), 읽은 날 = ✓ + 장 수, 오늘 = primary 테두리.
- 읽은 날 탭 → `ReadDialog`: "1월 20일 · 5장 읽음" + [기록 취소].
- 빈 날 탭(시작일~오늘 범위만) → `ReadDialog` 기록 모드: 장 수 입력(기본값 = 하루 목표).
- 미래·시작 전 날짜 비활성. 월 전환 시 해당 월 범위로 `my-logs` 조회(월별 캐시).

### 마이페이지 `MyChallengeHistory`

- 참여 이력 행 카드: 제목 · 기간 · 상태 배지 · "34% · 23일 연속" · 완독 배지(completed). 클릭 → 상세.
- 0건이면 섹션 비노출(ManageHub 관례).

### 어드민 `/mypage/manage/challenges`

- `MANAGE_DOMAINS`에 카드 등록(content 카테고리, permission `CHALLENGE_MANAGE`) +
  `PERMISSION_LABELS`에 `CHALLENGE_MANAGE`("통독 챌린지 관리")·`CHALLENGE_PARTICIPATE`("통독 챌린지 참여") 라벨 추가.
- `ChallengeManager`: DataTable(제목·범위(권 이름)·기간·목표 일수·상태) + 새 챌린지 + 행별 수정/삭제(`DeleteConfirmDialog`,
  경고문 "참여 기록도 함께 숨겨집니다").
- `ChallengeFormDialog`: 제목(`Input`)·소개(`MarkdownEditor`)·시작/끝 권 select(66권 한글) + **프리셋 3개(전체 1~66/구약 1~39/신약 40~66)**·
  시작일(date)·목표 일수(number). **파생 미리보기 실시간**: "총 260장 · 하루 4장 · 3월 10일 종료"
  (`constants/bible.ts`로 프론트 계산 — 생성 후 진실은 서버 응답).
- 수정: edit 시 fresh 상세 조회로 version 시드(`staleTime:0·gcTime:0·retry:false`, 부서 관리 선례) → PATCH.
  `zod` 검증: `startBook ≤ endBook`, `targetDays 1~3650`, 제목 1~100자.

## 5. constants/bible.ts

- 66권 한글 이름 + 권별 장 수 배열 (백엔드 `BibleStructure`와 동일 숫자 — 구약 929 · 신약 260 · 전체 1,189장 스냅샷 테스트로 드리프트 방어).
- 헬퍼: `bookName(n)`, `chapterCount(startBook, endBook)`(구간 총 장 수), `dailyGoal = ⌈장 수/targetDays⌉`,
  `endDate = startDate + targetDays - 1` — 어드민 미리보기·범위 표시용.
- 콘텐츠 하드코딩 금지 예외 아님: 성경 구조는 교회별로 변하지 않는 불변 상수 (백엔드도 동일 판단).

## 6. 디자인 시스템 반영 (DESIGN.md 등록 항목)

구현 전 DESIGN.md `components:` 블록에 추가:

- **`challenge-today-band`**: 오늘의 통독 다크 밴드. `{colors.surface-dark}` 계열 배경 + on-dark 텍스트,
  초대형 타이포는 `{typography.display-xl}`(모바일 clamp 축소), CTA는 `button-pill-cta`급 풀폭(모바일) 56px.
  구절 강조는 신규 토큰 **`--color-primary-on-dark`**(다크 배경 위 밝은 블루 — `#0052ff`는 다크 위 대비 부족) 사용.
  기록 완료 상태는 밴드 내 반투명 카드 + `{rounded.full}` 체크 플레이트.
- **`reading-calendar`**: 월 달력(벽걸이식). 읽은 날 `{colors.primary-soft}` 채움 + ✓, 오늘 `{colors.primary}` 2px 테두리,
  셀 `{rounded.sm}`, 탭 = 기록/취소 다이얼로그 입구. date-fns 직접 구현.
- **`challenge-feature-card`**: 목록 상단 피처 카드(참여 중 ONGOING). 다크 밴드 미니 + 오늘 요약 + 이동 CTA.
- 신규 토큰: `--color-primary-on-dark` 1건 (globals.css `@theme` + DESIGN.md 색 목록 등재). 그 외 전부 기존 토큰.

## 7. 에러 · 엣지 (errorCode로만 분기)

| errorCode | 상황 | 처리 |
|---|---|---|
| `DUPLICATE_RESOURCE` | 중복 참여 | "이미 참여 중이에요" 토스트 + `["challenge", id]` invalidate (자기치유) |
| `OPTIMISTIC_LOCK_CONFLICT` | 동시 기록 | "잠시 후 다시 시도해 주세요" + progress refetch |
| `INVALID_INPUT_VALUE` | date 범위 밖·장 수 0 / 참여자 존재 시 범위·기간 수정 거부 | 회원: `ReadDialog` 인라인 에러 / 어드민: 폼 상단 detail 배너 |
| `RESOURCE_NOT_FOUND` | 삭제된 챌린지·미참여 read | 목록으로 안내 (joined 분기 덕에 정상 흐름 미발생) |

- 401/403은 `ChallengeGate`가 흡수 (권한 없으면 API 0회). `INVALID_TOKEN` refresh는 authFetch 전담.
- 어드민 엣지: `CHALLENGE_MANAGE`만 있고 `CHALLENGE_PARTICIPATE` 없는 계정은 목록 403 →
  ChallengeManager 안내 배너("목록 조회에는 통독 챌린지 참여 권한도 필요합니다").

## 8. 테스트 전략 (TDD, 80%+)

기존 관례(co-located vitest + testing-library, `vi.hoisted` mock, QueryClientProvider 래퍼, jest-dom 없음):

1. 순수 유닛 — `bible.ts`: 929/260/1189 스냅샷, 권 경계, 파생 계산(하루 목표·종료일).
2. API 함수 — `challenges.ts`/`challenges.admin.ts`: 쿼리스트링·파싱·204.
3. 컴포넌트 — Gate 4분기 / TodayBand 5상태 / Calendar(✓·탭 다이얼로그·미래 비활성) / ReadDialog(기본값·검증·취소) /
   List(피처 3케이스) / MyChallengeHistory(0건 비노출) / Manager(version 시드·409 재편집·400 detail) / FormDialog(프리셋·미리보기).
4. 회귀 — `navigation.test`(새 링크·아이콘 키), 페이지 얇은 렌더.

## 9. 제외 (YAGNI)

메인 페이지 배너(공개 RSC ↔ 회원 API 불일치), 리더보드/랭킹(백엔드 없음), 알림·리마인더, 소셜 공유,
지난 기록 "수정" UI(취소 후 재기록으로 충분 — 백엔드 동일 판단), 챌린지 복제(폼 프리필로 충분하나 이번 범위 밖),
다크 모드(1차 범위 밖 — 사이트 공통).
