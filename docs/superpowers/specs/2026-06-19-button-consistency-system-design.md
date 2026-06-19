# 버튼 일관성 시스템 설계 (Button Consistency System)

- **날짜**: 2026-06-19
- **상태**: 설계 승인됨 (구현 계획 대기)
- **근거 데이터**: 8개 도메인 전수 감사(약 100개 액션 버튼, 파일:라인 단위) — `docs/superpowers/` 워크플로 산출

## 1. 배경 / 문제

`src/components/ui/Button.tsx`와 variant(`primary`·`secondary`·`outlineOnDark`·`tertiary`·`pillCta`·`destructive`)는 잘 정의돼 있으나, **사용처에서 variant·라벨·아이콘이 "의미"가 아니라 "어느 도메인이/어디에 있는지"로 갈린다.** 전수 감사로 확인된 핵심 불일치:

1. **삭제 variant가 4형태** — `destructive`(확인 모달만)·`secondary`(콘텐츠 도메인)·`tertiary`(어드민 관리)·raw `<button>`(사진 제거·역할 회수).
2. **행(row) 액션 variant가 도메인별로 분기** — 같은 목록 행의 수정/삭제가 어드민 관리화면은 `tertiary`, 콘텐츠 도메인은 `secondary`.
3. **raw `<button>`/`<a>` 12곳+이 Button을 우회** — chevron·라이트박스 nav·회수 X·제거 X·회원탈퇴·전문보기·재동의·미디어 열기 링크가 각자 인라인 스타일.
4. **아이콘 정책 분열** — `DepartmentTree`만 아이콘+텍스트, 나머지 Button은 전부 text-only, raw 버튼은 icon-only.
5. **라벨 흔들림** — 생성='새 X' 우세인데 `역할 추가`만 예외 / 삭제='삭제' vs `제거`·`회수` / 저장='저장' vs `변경`.
6. **다이얼로그 푸터 미정의** — `[취소, 저장]` vs `[저장, 취소]` vs 취소 없음 혼재.

## 2. 설계 원칙 (UX 법칙 → 버튼 규칙)

| 법칙 | 적용 |
|---|---|
| **오컴의 면도날** | 새 추상화를 만들지 않는다. variant 의미 중복(`secondary`/`tertiary`)을 제거하고 기존 Button만 최소 확장. |
| **파레토(80/20)** | 추가·수정·삭제·저장·취소 5개 핵심 액션을 먼저 고정하면 일관성의 80%가 확보된다. |
| **포스텔의 법칙** | 같은 의미는 항상 같은 형식(출력 일관). variant·라벨·아이콘·순서를 의미별로 못박는다. |
| **피크-엔드** | 파괴적 액션의 "절정"은 확인 모달 — 거기서만 `destructive` 빨강+경고. 트리거는 중립. 완료 토스트로 끝을 긍정적으로. |
| **능동적 사용자 패러독스** | 사용자는 학습 없이 바로 누른다 → 모호어('회수'·'제거')를 '삭제'로, 아이콘으로 자명성↑. |
| **파킨슨의 법칙** | 규칙을 상수·문서로 명문화 → 개발자가 매번 고민 없이 정해진 형식을 쓴다(제약이 일관성을 만든다). |
| **CTA 색상** | `primary`는 화면(밴드)당 하나. 주 CTA(생성·저장)에만(기존 DESIGN.md 강화). |

## 3. 단일 진실 규칙표 (SSOT)

### 3.1 핵심 액션

| 액션 | variant | 라벨(고정) | lucide 아이콘 | 위치 |
|---|---|---|---|---|
| 생성/추가 | `primary` | `새 {엔티티}` | `Plus` | toolbar·page-header |
| 수정 | `tertiary` | `수정` | `Pencil` | row-inline·card |
| 삭제(트리거) | `tertiary` | `삭제` | `Trash2` | row-inline·card |
| 삭제(확인) | `destructive` | `삭제` | 없음 | dialog-footer |
| 저장/제출 | `primary` | `저장` | 없음 | dialog-footer·form |
| 취소 | `tertiary` | `취소` | 없음 | dialog-footer(취소-first) |

### 3.2 보조/특수 액션

| 액션 | variant | 비고 |
|---|---|---|
| 연결해제(역할 회수·사진 제거) | `tertiary`/오버레이 `iconOnly` | `X` 유지(Trash2 아님). 라벨 `회수`/`제거` 유지 — **영구 삭제 아님(원본 미디어·역할 보존)**. 삭제와 의미·아이콘 구분. |
| 토글(펼치기/접기·전문 보기·필터) | `tertiary` (또는 `iconOnly`) | chevron은 `iconOnly`. 필터 토글은 상태기반 강조 유지(아래 4.3). |
| 라이트박스 nav | `tertiary` `iconOnly` | `ChevronLeft`/`ChevronRight` + `aria-label`. |
| 복사 | `tertiary` `iconOnly` | `Copy` + `aria-label="복사"`. |
| picker/업로드 트리거 | `secondary` | 라벨은 도메인 의미 유지(`파일 선택`·`PDF 선택`·`사진 추가`). |
| picker 확정 | `primary` | `선택 (N)` 유지(저장 성격). |
| 검색 | `secondary` | toolbar 보조 제출. |
| 재시도(에러 복구) | `secondary` | `다시 시도` — 에러 카드의 주 액션. |
| 로그아웃 | `secondary` | 파괴적 아님 → `destructive` 빨강 금지. |
| 미디어 열기 링크 | `tertiary`/`secondary` `<a>` | `buttonVariants()` className 재사용(아래 4.2). |
| 위저드 nav/제출(인증) | 규칙표 따름 | 도메인 카피(`동의하고 계속하기`·`이전`·`건너뛰기`)는 유지, variant만 규칙 적용. |

### 3.3 `secondary` vs `tertiary` 구분 규칙 (오컴: 중복 제거)

- **`tertiary`** = 가장 낮은 강조. 텍스트/아이콘 버튼. **행 안의 인라인 액션**(수정·삭제·상세·권한·회수), **다이얼로그 취소**, **토글**.
- **`secondary`** = 회색 필. 중간 강조. **행 밖의 독립 보조 CTA**(검색·picker 트리거·재시도·로그아웃).
- 규칙 한 줄: **"행 안 = `tertiary`, 행 밖 독립 보조 = `secondary`. primary는 화면당 하나(생성/저장)."**

## 4. 컴포넌트 변경

### 4.1 `Button` 확장 — `iconOnly` (최소)

`src/components/ui/Button.tsx`에 `iconOnly?: boolean` 추가:
- 정사각 패딩 + 아이콘 중앙 정렬, 색은 기존 variant 상속.
- `aria-label` 필수(문서·리뷰 규칙. 타입 강제는 하지 않되 PR 체크).
- 흡수 대상: 라이트박스 prev/next, tree chevron, 역할 회수 X, 사진 제거 X, 복사.
- 신규 variant·신규 추상화는 만들지 않는다(오컴).

### 4.2 링크형(`<a>`/`<Link>`)은 기존 `buttonVariants()` 재사용

코드에 이미 존재하는 `buttonVariants(variant)` 함수를 `className`으로 사용 → **추가 코드 0**.
- 흡수 대상: 미디어 `열기`, `영상 보기`/`오디오 듣기`, `재동의하기 →`, 갤러리 `로그인`.

### 4.3 비대상(Non-goals)

- `PhotoGrid` 썸네일 트리거(이미지 전체가 클릭 영역, `aria-label` 적절) — 버튼 형식 통일 대상 아님, 유지.
- **인라인 텍스트 링크** — `AgreementStatus` 재동의하기 →(primary-soft 배너 CTA), `TermsDialog` 전문 보기(체크박스 옆 밑줄 더보기), `WithdrawDialog` 회원 탈퇴(밑줄 `DialogTrigger` — 파괴 트리거를 일부러 조용히). 의도된 텍스트 링크라 Button 흡수 비대상, 유지.
- `MediaLibrary` 필터 토글(`전체`/`이미지`/`PDF`의 상태기반 `primary|secondary`) — 유효 패턴, 유지.
- 인증/위저드 도메인 카피 문구 — 유지(variant만 규칙 적용).
- 어드민 화면의 비(非)버튼 레이아웃·디자인 — 범위 밖(DESIGN.md Known Gaps).

### 4.4 액션 메타 상수 — `src/constants/actionButton.ts`

핵심 액션의 `{label, Icon}`을 한 곳에 정의해 도메인이 import(파킨슨·포스텔 구현):

```ts
import { Plus, Pencil, Trash2, X, Copy } from "lucide-react";
export const ACTION = {
  edit:   { label: "수정", Icon: Pencil },
  delete: { label: "삭제", Icon: Trash2 },
  save:   { label: "저장" },
  cancel: { label: "취소" },
  create: { Icon: Plus },   // 라벨은 '새 {엔티티}'로 동적 → 호출부에서 조합
} as const;
```

- 생성 라벨은 엔티티명이 들어가 동적이므로 상수에 고정 라벨을 넣지 않고 `Icon`만 공유.
- 행 아이콘은 `lg` 미만 아이콘만, `lg+` 아이콘+텍스트(`DepartmentTree` 기존 패턴 표준화).

### 4.5 다이얼로그 푸터 표준

- 순서 **`[취소, 저장]`** (취소 먼저, primary 오른쪽 끝)로 통일. 인라인 폼의 `[저장, 취소]`도 정렬.
- 파괴 확인 다이얼로그는 **`[취소, 삭제(destructive)]`**.
- **취소 버튼이 없던 폼 다이얼로그에 명시적 `취소` 추가**(능동적 사용자: X 닫기보다 취소 버튼이 자명).
  - 대상: `RoleFormDialog`·`RolePermissionsDialog`·`PositionFormDialog`·`TagFormDialog`·`BulletinFormDialog`·`AlbumFormDialog`.

## 5. 마이그레이션 매핑 (파일별 작업 목록)

> 변경 유형 약어: **V**=variant, **L**=라벨, **I**=아이콘 추가, **R**=raw→Button/buttonVariants, **F**=푸터 순서/취소 추가.
>
> 아래 표는 **대표 항목**이다. 표에 직접 적히지 않았더라도 동일 패턴(모든 다이얼로그 `취소`=`tertiary`, 모든 생성=`Plus`, 모든 행 수정/삭제=Pencil/Trash2)은 §3 규칙표를 그대로 따른다. 예: `members/ResetPasswordSection.tsx:45` 취소 `secondary`→`tertiary`.

### 5.1 어드민 관리 (roles·positions·tags·departments·members·media)

| 파일:라인 | 현재 | 변경 |
|---|---|---|
| `roles/RoleManager.tsx:62` | `역할 추가` primary | **L** `새 역할` · **I** Plus |
| `roles/RoleManager.tsx:78,80` | 수정/삭제 tertiary | **I** Pencil/Trash2 · actionCls 제거(공통화) |
| `roles/RoleFormDialog.tsx:98` | 저장(취소 없음) | **F** 취소 추가 `[취소, 저장]` |
| `roles/RolePermissionsDialog.tsx:67` | 저장(취소 없음) | **F** 취소 추가 |
| `positions/PositionManager.tsx:64,65` | 수정/삭제 tertiary | **I** Pencil/Trash2 |
| `positions/PositionFormDialog.tsx:88` | 저장(취소 없음) | **F** 취소 추가 |
| `tags/TagManager.tsx:58,59` | 수정/삭제 tertiary | **I** Pencil/Trash2 |
| `tags/TagFormDialog.tsx:65` | 저장(취소 없음) | **F** 취소 추가 |
| `departments/DepartmentTree.tsx:38,42,46` | 추가/수정/삭제 tertiary+아이콘 | **표준 기준점**(변경 없음, 다른 도메인이 이 패턴에 맞춤) |
| `departments/DepartmentTree.tsx:69` | chevron raw-button | **R** Button `iconOnly` |
| `departments/DepartmentFormDialog.tsx:241,242` | `[취소, 저장]` | 순서 OK(기준) |
| `members/MemberRolesSection.tsx:79` | 회수 raw-button X | **R** Button `iconOnly` `aria="역할 회수"` |
| `members/MemberRolesSection.tsx:110` | 부여 secondary | 유지(행 밖 보조) |
| `members/ResetPasswordSection.tsx:36` | 복사 tertiary Copy | 유지(기준) |
| `members/MemberProfileForm.tsx:50,80,81` | 수정 tertiary / 취소 secondary / 저장 | **V** 취소 `tertiary` · **I** 수정 Pencil · **F** `[취소, 저장]` |
| `media/MediaLibrary.tsx:139,143` | 열기 raw-`<a>` / 삭제 secondary | **R** 열기 `buttonVariants("tertiary")` · **V**+**I** 삭제 `tertiary`+Trash2 |

### 5.2 콘텐츠 (bulletins·sermons·notices·events) — 행 액션 `secondary`→`tertiary`+아이콘

| 파일:라인 | 현재 | 변경 |
|---|---|---|
| `bulletins/BulletinAdminActions.tsx:21,45,46` | 새 주보 primary / 수정·삭제 secondary | **I** 새 주보 Plus · **V+I** 수정 `tertiary`+Pencil, 삭제 `tertiary`+Trash2 |
| `bulletins/BulletinFormDialog.tsx:114` | 저장(취소 없음) | **F** 취소 추가 |
| `sermons/SermonAdminActions.tsx:21,45,46` | 동일 | **I**+**V+I** 동일 |
| `sermons/SermonForm.tsx:143,144` | `[저장, 취소]` | **F** `[취소, 저장]` |
| `sermons/SermonVideo.tsx:28`·`SermonAudio.tsx:23` | 영상/오디오 raw-`<a>` | **R** `buttonVariants("secondary")` |
| `notices/NoticeAdminActions.tsx:21,63,64` | 동일 | **I**+**V+I** 동일 |
| `notices/NoticeForm.tsx:126,127` | `[저장, 취소]` | **F** `[취소, 저장]` |
| `events/EventAdminActions.tsx:23,55,58` | 동일 | **I**+**V+I** 동일 |
| `events/EventFormDialog.tsx:194,197` | `[취소, 저장]` | 순서 OK |

### 5.3 갤러리

| 파일:라인 | 현재 | 변경 |
|---|---|---|
| `gallery/GalleryAdminActions.tsx:20,45,46` | 새 앨범 primary / 수정·삭제 secondary | **I** Plus · **V+I** `tertiary`+Pencil/Trash2 |
| `gallery/GalleryPhotoManager.tsx:36` | 사진 추가 secondary | 유지(picker 트리거, 행 밖 보조) |
| `gallery/GalleryPhotoManager.tsx:60` | 사진 제거 raw-button X(오버레이) | **R** Button `iconOnly`+오버레이 className 유지, `aria="사진 제거"`·X 아이콘 유지(연결해제) |
| `gallery/PhotoLightbox.tsx:59,68` | 이전/다음 raw-button | **R** Button `iconOnly` |
| `gallery/AlbumFormDialog.tsx:88` | 저장(취소 없음) | **F** 취소 추가 |
| `gallery/GalleryGate.tsx:34` | 로그인 raw-`<a>` | **R** `buttonVariants()` `<Link>` |
| `gallery/PhotoGrid.tsx:36` | 썸네일 트리거 raw-button | 비대상(유지) |

### 5.4 마이페이지·인증

| 파일:라인 | 현재 | 변경 |
|---|---|---|
| `mypage/MypageContent.tsx:76,93` | 로그아웃 tertiary / destructive | **V** 둘 다 `secondary`(로그아웃은 파괴 아님) |
| `mypage/ProfileCard.tsx:41` | 수정 tertiary | **I** Pencil |
| `mypage/ProfileEditForm.tsx:106,107` | `[저장, 취소]`(취소 tertiary) | **F** `[취소, 저장]` |
| `mypage/PasswordChangeSection.tsx:88,89` | `변경` primary / 취소 tertiary | **L** `저장` · **F** `[취소, 저장]` |
| `mypage/WithdrawDialog.tsx:72` | 회원 탈퇴 DialogTrigger(밑줄 링크) | 비대상(파괴 트리거는 조용한 인라인 링크 유지) |
| `mypage/AgreementStatus.tsx:28` | 재동의하기 인라인 링크 | 비대상(인라인 CTA 링크 유지) |
| `auth/TermsDialog.tsx:18` | 전문 보기 인라인 링크(DialogTrigger) | 비대상(밑줄 더보기 링크 유지) |
| `auth/SignupForm.tsx`·`AgreementsForm.tsx`·`LoginForm.tsx` | 제출/nav primary·tertiary | 규칙 합치(대부분 변경 없음) |

## 6. 영향받는 라벨 변경 요약 (회귀 테스트 갱신 필요)

- `역할 추가` → `새 역할`
- `변경` → `저장` (PasswordChangeSection)
- 로그아웃 `destructive` → `secondary` (색만, 라벨 동일)

> 연결해제 라벨(`사진 제거`·`역할 회수`)은 **유지**(영구 삭제가 아니므로 `삭제`로 바꾸지 않는다).

## 7. 검증 기준 (Definition of Done)

1. `pnpm build` 그린 (Next 빌드).
2. `pnpm lint` 그린 (ESLint).
3. 기존 버튼 관련 `*.test.tsx` 통과 — 라벨 변경분은 테스트 기대값 갱신.
4. 규칙표 위반 0: 핵심 액션 버튼이 모두 §3 규칙표의 variant·라벨·아이콘을 따른다.
5. raw `<button>`/`<a>` 잔존 0 (§4.3 비대상 제외) — Button/`buttonVariants()`로 흡수.
6. 다이얼로그 푸터 순서 `[취소, 저장]` 통일, 폼 다이얼로그에 취소 존재.
7. 시각 스폿체크: 주요 도메인 행 액션(어드민·콘텐츠·갤러리) + 다이얼로그 푸터 + 모바일(`lg` 미만 아이콘만).

## 8. 구현 단위 (격리/응집)

독립적으로 작업·검증 가능한 단위로 분해:

1. **기반**: `Button.tsx` `iconOnly` 추가 + `actionButton.ts` 상수 + (필요시) 다이얼로그 푸터 헬퍼.
2. **어드민 관리**: roles·positions·tags·departments·members·media (§5.1).
3. **콘텐츠**: bulletins·sermons·notices·events (§5.2).
4. **갤러리**: (§5.3).
5. **마이페이지·인증**: (§5.4).

각 단위는 기반(1) 완료 후 병렬 가능. 단위별로 빌드·테스트·시각 확인을 게이트로 사용.
