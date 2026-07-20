# 설교 등록 UX 개선 및 예배 안내 페이지 보강 — 설계 (#109)

2026-07-20 · 브레인스톰 확정안

## 배경

교회(운영자) 피드백: 설교 등록 시 설교자·설교일을 매번 손으로 채워야 하고,
설교일 연도 칸은 6자리까지 받아 월로 자동 이동하지 않으며, 백스페이스 삭제가
세그먼트 단위라 번거롭다. 예배 안내 페이지에서는 설교 목록으로 가는 길이 없고,
예배 카드의 시간 표기가 예배명보다 묻힌다.

전제: 교회 템플릿이므로 특정 교회 콘텐츠는 코드에 하드코딩하지 않고
`src/constants/church.ts`(교회별 상수)로 주입한다.

## 결정 사항

| 주제 | 결정 |
|---|---|
| 설교자 기본값 | church.ts 상수 (최근 설교 자동·localStorage 안 대신) |
| 설교일 입력 | 네이티브 date 유지 + `max` 보정 + 오늘(KST) 기본값 (커스텀 3분할 입력 안 대신) |
| 백스페이스 연속 삭제 | 이번 범위 제외 — 브라우저 세그먼트 동작 한계. 기본값+덮어쓰기 입력으로 "지울 일" 자체를 제거 |
| 예배 카드 가시성 | 시간을 크게·진하게 + primary 색 (구현 후 실화면 확인에서 사용자가 primary 강조로 확정 — 시간이 이 페이지의 핵심 행동 정보라 단일 액센트 예외) |
| 예배→설교 연결 | 진입 CTA만 (예배별 필터는 설교에 예배 구분 데이터가 없어 보류) |

## 1. 설교자 기본값

- `src/constants/church.ts`에 `SERMON_DEFAULT_PREACHER = "홍성균 목사"` 추가.
  교회 교체 시 이 상수만 바꾸면 되고, 빈 문자열이면 기본값 없음과 동일하게 동작.
- `SermonForm` defaultValues: `preacher: initial?.preacher ?? SERMON_DEFAULT_PREACHER`.
  등록(create) 모드만 채워지고 수정(edit) 모드는 기존 값 유지.

## 2. 설교일 입력

- `SermonForm`의 date `Input`에 `max="9999-12-31"` 추가 — 크롬이 연도 세그먼트를
  4자리로 제한하고, 4자리 입력 시 월로 자동 이동한다(연도가 6자리까지 확장 가능할 때는
  입력 대기하던 동작이 사라짐).
- `src/lib/date.ts`에 `todayKstDate(): string` 헬퍼 추가 —
  `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" })`로 `YYYY-MM-DD` 생성.
  러너 로컬 TZ와 무관하게 KST 자정 기준으로 날짜가 바뀐다(요구: "00시 기준").
  하이드레이션 불일치 없음 — `Intl`이 timeZone을 Asia/Seoul로 고정하고, RHF `register`는
  defaultValues를 HTML에 직렬화하지 않고 마운트 시 주입하기 때문(서버 TZ는 애초에 무관).
- defaultValues: `preachedAt: initial?.preachedAt ?? todayKstDate()` — 등록 모드만 오늘.

## 3. 예배 카드 시간 강조 (신규 typo 위계)

- 신규 위계 `datetime-lg`: 22px / 600 / tnum. 등록 절차 준수:
  1. DESIGN.md 타이포 표에 `{typography.datetime-lg}` 행 추가 (용도: 예배 카드 대표시간 등 강조 날짜·시간)
  2. `globals.css` `@theme`에 `--text-datetime-lg` 계열 추가
  3. `src/constants/typography.ts`에 `typo.datetimeLg` 추가
  4. `src/lib/utils.ts` extendTailwindMerge 목록에 등록 (누락 시 `cn()`이 크기를 색상으로 오인해 제거)
- `WorshipRegular` 카드 대표시간: `typo.datetime` + `text-body` → `typo.datetimeLg` + `text-primary`
  (최초 확정은 `text-ink`였으나 실화면 확인 후 primary로 상향 — 위 결정 표 참조).
- 찬양시간 서브라인(praise)은 현행 유지(muted) — 대표시간과의 위계 대비 확보.
- 메인 페이지 `ScheduleCard`는 변경하지 않는다(범위 밖).

## 4. 예배 페이지 → 설교 진입 CTA

- `/worship` 정기예배 섹션(`WorshipRegular`) 카드 그리드 아래에 `/sermons` 링크
  CTA 1개: `Link` + `buttonVariants`(primary, 48px). 이 페이지에 primary CTA가 없어
  "밴드당 primary 한 번" 원칙에 부합.
- 라벨 "설교 말씀 보기"는 `src/constants/content.ts`의 `WORSHIP` 상수에 추가
  (콘텐츠 하드코딩 금지).
- 설교 목록은 회원전용(MemberGate) — 비회원 클릭 시 로그인·승인 안내를 만나는
  현행 게이트 동작을 그대로 둔다(확정).

## 테스트

- `todayKstDate()` 단위 테스트: `YYYY-MM-DD` 형식·Asia/Seoul 기준 확인.
- `SermonForm` 테스트: create 모드에서 설교자 상수·오늘 날짜 프리필, date 입력 `max` 속성,
  edit 모드에서 initial 값 우선.
- `WorshipRegular` 테스트: 대표시간에 강조 클래스 적용, CTA 링크(`/sermons`) 존재.
- 기존 vitest 관례(globals:false 명시 import, jest-dom 없음) 준수.

## 범위 제외

- 백스페이스 연속 삭제(커스텀 date 입력) — 사용해 보고 여전히 불편하면 별도 이슈로.
- 예배별 설교 필터(태그 관례·백엔드 예배구분 필드) — 설교에 예배 구분 데이터가 생기면 재논의.
- 메인 페이지 `ScheduleCard` 타이포.
- 일정용 `DateTimePicker`(datetime-local) — 이번 대상은 설교 폼의 date 입력만.
