# 공개 페이지 텍스트 가시성 상향 — 설계 (2026-07-03)

이슈: #80 · 라우트: 공개 콘텐츠 페이지 전반 · 선행 사례: `/about`(#69 빅타이포 에디토리얼)

> 상태: **확정·구현 완료.** 사용자 확인: 방식=페이지별 상향, 범위=공개 콘텐츠 전부(auth 제외),
> 강도=한 단계. 21개 컴포넌트에 적용, lint·tsc·build 통과(테스트 3건 실패는 선행·범위 밖 /about).

## 1. 배경 · 목표

`/about`(소개 및 비전)은 #69에서 "빅타이포 에디토리얼"로 재디자인되며 **고령 교인 가독성**이
확연히 올라갔다. 사용자는 이 결과를 좋게 평가하고, **나머지 공개 페이지들도 텍스트를 키워
가시성을 맞추고 싶다**고 요청했다. (테스트 코드는 불필요 — 텍스트 크기 조정이므로.)

핵심 관찰:
- 기본 타이포 스케일은 이미 고령 최적화(본문 20px·보조 18px, DESIGN.md 타이포 원칙). 일반 웹(16/14)보다 두 단계 큼.
- `/about`이 더 커 보이는 이유는 **토큰값을 바꾼 게 아니라, 요소별로 한 단계 큰 `typo.*` 토큰을 쓴 것**
  (읽는 본문 `bodyLg` 24px, 넉넉한 디스플레이). 기본 `--text-*` 값은 그대로다.
- 반면 다른 공개 페이지의 지배 토큰은 `bodySm`(18px, 공개 컴포넌트에서 93곳) — 읽는 보조 텍스트가
  스케일 최소치에 몰려 있다.

**목표:** 공개 콘텐츠 페이지의 읽는/보조 텍스트를 `/about`과 동일한 방식으로 한 단계 키워
가시성을 통일한다. 단일 액센트·`typo.*` 상수·중첩 라디우스 등 DESIGN.md 규칙은 그대로 유지한다.

## 2. 방식 · 범위 (가정 — 확인 필요)

### 방식(가정 A): 페이지별 토큰 상향 — `/about` 방식 재현
- 각 페이지/컴포넌트에서 **읽는·보조 텍스트 요소의 `typo.*` 토큰을 한 단계 올린다**(§3 규칙).
- 장점: `/about` 보존, 페이지별 미세조정 가능, **새 토큰·DESIGN.md 위계 변경 없음**, 각 변경이
  토큰 한 개 교체(저위험). UI 크롬·밀도 제약 영역을 선택적으로 제외 가능.
- 단점: 건드리는 파일 수가 많다(공개 콘텐츠 컴포넌트 ~30개). 단 각 diff는 사소.

대안(가정에서 제외):
- **전역 스케일 상향** — `globals.css`의 `--text-*` 기준값 자체를 키움. 파일 1~2개로 전 페이지가
  한 번에 커지지만 **블런트**: `/about`이 더 커지고, 입력·뱃지·네비 등 UI 크롬까지 부풀어 예외
  처리가 필요하며, DESIGN.md 타이포 표도 갱신해야 한다. → 좋아한 결과(`/about`)를 재현하는 데는 부적합.
- **혼합** — 가장 작은 토큰만 전역으로 살짝 올리고 주요 읽기 페이지만 페이지별 상향.

### 범위(가정 A): 공개 콘텐츠 페이지 전부
- 대상: 예배 · 설교(목록/상세) · 소식/공지(목록/상세) · 행사 · 주보 · 갤러리 · 교육부서(목록/상세) ·
  교회안내 하위(인사말 · 연혁 · 오시는 길 · 교회사진) · 사이트 푸터 안내 텍스트.
- 제외: `/about`(완료) · auth(로그인/가입/약관, 폼 스케일 이미 적정) · `mypage`/`manage`/어드민(DESIGN.md 범위 밖).

## 3. 상향 규칙 (한 단계 리프트)

`/about`의 가독성 규칙(섹션 라벨 고대비, 설명은 muted 금지·대비 확보, 읽는 본문 ≈24px)을 일반화한다.

| 역할 | 현재(대표) | 상향 후 | 근거 |
|---|---|---|---|
| 상세/도입 **리드 문단**(읽는 본문) | `bodyMd` 20 | `bodyLg` 24 | `/about` 소망·이야기 lead와 동일 스케일 |
| 콘텐츠 **보조 텍스트**(카드 설명·요약, 목록행 부제, 예배 안내 3줄, 푸터 안내) | `bodySm` 18 | `bodyMd` 20 | 읽는 정보인데 최소치(18)에 몰려 있음 |
| 카드 **subtitle 대비**(series·scripture 등 `caption` muted) | `caption` 16 muted | 대비 상향(`muted`→`body`) 또는 `caption`→`bodySm` | `/about` 규칙: 설명을 muted 회색으로 흐리지 않는다 |
| 목록행/카드 **주제목** | `titleMd` 22 | 유지 | 이미 적정 |
| **날짜·시간 메타** | `datetime` 18(tnum) | 유지 | 자릿수 고정 유지, 이미 적정 |
| 페이지/섹션 **헤딩** | `displayMd`/`titleLg` | 유지(유독 작은 곳만 +1단계) | 이미 큼 |
| 폼 라벨·헬퍼·검증문 | `caption`/`bodySm` | 유지 | UI 프리미티브(크롬) |

원칙: **콘텐츠(읽는) 텍스트만 올린다. UI 프리미티브·밀도 제약 영역·메타는 건드리지 않는다.**
"블라인드 grep 치환"이 아니라 요소 역할을 보고 판단(그래서 페이지별 방식).

## 4. 제외 대상 (건드리지 않음)

- **UI 프리미티브**: `ui/Badge`, `ui/Input`, `ui/Textarea`, `ui/Checkbox`, `ui/select`,
  `ui/dropdown-menu`, `ui/sonner` — `bodySm`/`caption`이 구조적 크기.
- **밀도 제약 UI**: `EventCalendar`, `EventChip`, `EventDayPopover`(달력 밀도), `PhotoLightbox`
  컨트롤(라이트박스 밀도) — 크기를 키우면 레이아웃이 깨진다.
- **어드민/운영**: `mypage/manage/*`, admin 공용 컴포넌트 — DESIGN.md 범위 밖.
- **auth 폼**: 기본 제외(범위에 포함 선택 시만).
- **`/about`**: 완료.
- **날짜·시간 메타**(`datetime`): tnum 유지.

### 후속 — 마크다운 상세 본문(`.prose-church`)

상세 본문(설교·공지·일정·앨범·부서 `description`)은 `typo.*`가 아니라 `MarkdownContent`의 `.prose-church`
CSS로 렌더된다(dangerouslySetInnerHTML). 1차에선 "스코프 밖"으로 뒀으나 부서 description이 여전히
작다는 피드백에 따라 근본 위치인 `globals.css .prose-church` 기준 `font-size`를 `--text-body-md`(20px)
→ `--text-body-lg`(24px)로 상향(line-height도 body-lg로). 토큰만 참조(px 인라인 아님). 모든 마크다운
상세 본문이 한 번에 `/about` 읽는 본문 스케일로 통일된다. h1~h3는 명시 크기라 영향 없음.

## 5. 대상 컴포넌트 인벤토리 (가정 A 기준)

구현(writing-plans) 단계에서 각 파일을 열어 §3 규칙으로 요소별 판단한다. 후보 목록:

- **예배**: `worship/WorshipRegular`, `worship/WorshipPlace`
- **설교**: `cards/SermonCard`, `sermons/*`(목록·상세 뷰)
- **소식/공지**: `cards/NoticeRow`(있으면), `notices/*`(목록·상세)
- **행사**: `cards/EventCard`, `events/EventDetailView` (달력/칩/팝오버 제외)
- **주보**: `cards/BulletinRow`
- **갤러리**: `gallery/AlbumList`, `gallery/AlbumDetail`, `gallery/GalleryGate` (PhotoLightbox 컨트롤 제외)
- **교육부서**: `departments/*` 목록·상세(`DeptInfo` + #78 학생부 보강 섹션 포함; DeptHero 카피는 이미 디스플레이)
- **교회안내 하위**: `about/PastorIntro`·`PastorQuote`·`PastorDossier`(인사말),
  연혁(`about/history` 페이지), `about/LocationDirections`·`LocationContact`(오시는 길),
  `about/ChurchPhotos`(교회사진)
- **공용**: `shell/SiteFooter`(안내 텍스트)

## 6. 검증 (테스트 코드 없음 — 사용자 지시)

- **육안 검증**: `pnpm dev`로 대상 페이지를 데스크톱·모바일 폭에서 확인 — 텍스트가 커졌고
  레이아웃(카드 그리드·정렬·줄바꿈)이 깨지지 않는지.
- **정적 게이트**: `pnpm lint` + `npx tsc --noEmit` + `pnpm build`(정적 페이지, CI 백엔드 무관) 통과.
- **회귀**: 기존 테스트는 `text-*` 클래스를 검증하지 않음(확인됨, 0곳) → 토큰 스왑으로 깨지지 않음.
  단 페이지 실행 자체를 렌더하는 테스트는 그대로 통과해야 함(`pnpm test`).

## 7. 프로세스 · 결정 (확정)

- **이슈 번호**: #80 (브랜치 `20260702_#80_공개_페이지_텍스트_가시성_상향`). 커밋 태그 `#80`.
- **확정 결정**: 방식=페이지별 상향, 범위=공개 콘텐츠 전부(auth·mypage·어드민 제외), 강도=한 단계.
- **선행 실패(범위 밖)**: `SymbolismList`·`VisionHero`·`ChurchPhotos`(/about) 테스트 3건은 본 작업 전부터
  콘텐츠-테스트 드리프트로 실패 중(git stash로 확인). 본 작업이 건드리지 않은 파일이라 미수정.

## 8. 완료 기준 (DoD)

- 대상 공개 페이지의 읽는·보조 텍스트가 `/about`과 정합하는 스케일로 커졌다.
- DESIGN.md 준수: `typo.*` 상수만 사용(px·hex 인라인 없음), 단일 액센트·라운드/간격 토큰 유지.
- UI 프리미티브·밀도 제약 영역·`/about`·어드민은 변경되지 않았다.
- 육안(데스크톱·모바일) + lint·tsc·build·test 통과.
