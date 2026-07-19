# 등록·수정 폼 페이지 통일 (일정·갤러리·주보)

- **날짜**: 2026-07-19
- **상태**: 설계 확정 (사용자 승인)
- **관련**: 공지·설교 폼 페이지 선례(`/notices/new` 등), DESIGN.md 어드민 공용 구획

## 문제

등록·수정 폼의 진입 방식이 도메인마다 다르다.

- **공지·설교**: 전용 페이지 (`/notices/new`, `/notices/[id]/edit`, sermons 동일)
- **일정·갤러리·주보**: Dialog 모달 (`EventFormDialog`·`AlbumFormDialog`·`BulletinFormDialog`)

모달 폼은 모바일에서 반복적으로 문제를 일으켰다 — 태그 팝오버가 모달 뒤에 깔림(#103으로
수정), 다이얼로그가 폰 화면에 꽉 붙어 깨져 보임. UI 일관성도 없다.

## 결정

**전 도메인을 페이지 폼으로 통일한다.** 공지·설교의 검증된 패턴을 일정·갤러리·주보에
복제한다. 폼을 모달에 넣어 생기는 문제 계열이 뿌리째 사라지고, 모바일에서 공간·뒤로가기가
자연스럽다.

기각한 대안:

- **다이얼로그로 통일**: 공지·설교의 마크다운 에디터(작성+미리보기)가 모달에 구겨져
  모바일에서 오히려 악화.
- **현행 유지 + 모바일 다이얼로그 풀스크린화**: 최소 비용이지만 UI 이질감이 남고,
  폼-in-모달 문제 계열(레이어·공간)이 잠복 상태로 유지됨.

**소형 다이얼로그(삭제 확인·MediaPicker·캘린더 상세·약관 등)는 모달을 유지한다** — 이건
모달이 맞는 UI다. 대신 공용 `DialogContent`에 모바일 여백을 보정한다(§5).

## 1. 라우트

페이지 셸은 공지 선례와 동일: `Container as="section" className="py-section"` + sr-only h1 +
`RequirePermission permission=... fallback={<EditAccessDenied />}`.

| 도메인 | 라우트 | 게이트 | edit 시드 |
|---|---|---|---|
| 일정 | `/events/new` | `EVENT_WRITE` | — |
| 일정 | `/events/[id]/edit` | `EVENT_WRITE` | RSC에서 공개 `getEvent` → `initial` (공지 edit 페이지와 동형: 비정상 id·미존재 시 `notFound()`, 저장 시 `revalidateEvents()`가 캐시를 무효화하므로 신선도 보장도 공지와 동일) |
| 주보 | `/bulletins/new` | `BULLETIN_WRITE` | — |
| 주보 | `/bulletins/[id]/edit` | `BULLETIN_WRITE` | RSC에서 `getBulletin`(no-store) → `initial`. 현행 다이얼로그의 useEffect 시드·`seeding` 상태·재오픈 리셋이 통째로 삭제됨 |
| 갤러리 | `/gallery/albums/new` | `GALLERY_WRITE` | — |
| 갤러리 | `/gallery/albums/[id]/edit` | `GALLERY_WRITE` | **클라 시드** — 갤러리는 회원 전용(authFetch, 토큰이 클라에만 있음)이라 RSC fetch 불가. 페이지는 `GalleryGate`로 감싸고, 클라 래퍼가 `useQuery(["album", id])`(staleTime/gcTime 0·retry false — 어드민 다이얼로그 시드 관례)로 시드 후 폼 마운트 |

갤러리 edit의 폼 마운트는 데이터 도착 후 keyed 마운트(`<AlbumForm key={album.id} initial={album} />`)로
defaultValues를 고정한다 — effect로 reset하지 않는다(set-state-in-effect lint 관례).

## 2. 폼 컴포넌트 전환

`EventFormDialog` → `EventForm` / `AlbumFormDialog` → `AlbumForm` / `BulletinFormDialog` → `BulletinForm`.
파일은 각 도메인 디렉터리에 새 이름으로 두고 기존 다이얼로그 파일은 삭제한다(소비처가 전부
전환되므로 병행 유지 불필요).

**유지(그대로 이식)**: 필드 구성·zod 검증·낙관락 version·mutation(onError의 fieldErrors/
onReedit 포함)·revalidate/invalidate 로직·`Field` 레이블 래퍼.

**제거**: Dialog 래퍼(`Dialog`·`DialogContent`·`DialogHeader`·`DialogFooter`·`DialogClose`)·
`open`/`onOpenChange` props·열림 리셋 useEffect(BulletinFormDialog·AlbumFormDialog).

**변경**:

- props는 NoticeForm 동형: `{ mode: "create" | "edit"; initial?: <DetailResponse> }`
  (주보 edit도 RSC 시드라 `initial: BulletinDetailResponse`로 통일 — `bulletinId` prop 삭제)
- 페이지 제목은 라우트 페이지의 sr-only h1이 담당(NoticeForm 선례 — 폼 자체는 제목 미렌더)
- 푸터: `DialogFooter`+`DialogClose` → NoticeForm 동형의 `<div className="flex gap-sm">` +
  취소 버튼 `onClick={() => router.back()}`
- 성공 시 이동(모두 create 응답이 상세 응답이므로 id 사용 가능):
  - 일정: `router.push(\`/events/${res.id}\`)` (create·edit 공통, `EventDetailResponse` 반환)
  - 갤러리: `router.push(\`/gallery/albums/${res.id}\`)` (create), edit는 `router.push(\`/gallery/albums/${initial.id}\`)`
  - 주보: `router.push("/bulletins")` (상세 페이지 없음 — 행 자체가 PDF 링크)
  - 기존 `revalidateXxx()`/쿼리 invalidate·`notify.success("저장했습니다.")`는 push 전에 그대로 수행
- 주보의 `MediaPicker`는 페이지 폼 안에서 여는 Dialog로 그대로 유지(모달 안 모달이 해소되어
  구조가 오히려 단순해짐)
- `onSaved` 콜백(부모 모달 닫기용)은 페이지 전환으로 무의미 → props에서 삭제

## 3. 호출부: 버튼 → 링크

링크형 CTA는 기존 패턴 `<Link className={buttonVariants(...)}>`를 쓴다(Button.tsx가 이를 위해
`buttonVariants`를 노출).

| 컴포넌트 | 변경 |
|---|---|
| `EventListAction` | 다이얼로그 상태 제거 → `RequirePermission` + `<Link href="/events/new" className={buttonVariants("primary")}>` (CREATE_ICON + "새 일정" 유지) |
| `BulletinListAction` | 동일 → `/bulletins/new` |
| `AlbumListAction` | 동일 → `/gallery/albums/new` (갤러리 페이지 제목 행 배치는 유지) |
| `EventDetailActions` | 수정 버튼 → `<Link href={\`/events/${event.id}/edit\`}>`(tertiary 변형), `EventFormDialog` import·상태 제거. 삭제 확인 다이얼로그 유지 |
| `BulletinRowActions` | 수정 버튼 → `/bulletins/${b.id}/edit` 링크. 삭제 유지 |
| `AlbumDetailActions` | 수정 버튼 → `/gallery/albums/${album.id}/edit` 링크. 삭제 유지 |

캘린더 상세 모달(EventDetailModal) 안의 "수정"은 링크 클릭 → 라우트 전환으로 모달이 자연
해소된다. 별도 닫기 처리 불필요.

## 4. 접근성·모바일

- 페이지 폼은 문서 흐름이라 포커스 트랩·z-index 관리가 불필요해진다
- 폼 최대 폭은 페이지 `Container`(1200px) 그대로 — 공지·설교 선례와 동일(별도 폭 캡 없음)
- 저장·취소 버튼은 48px(`button-primary`·기존 Button) 유지

## 5. 남는 다이얼로그 모바일 여백

`src/components/ui/dialog.tsx` `DialogContent`의 `w-full` →
`w-[calc(100%-var(--spacing-base)*2)]`. 삭제 확인·MediaPicker·캘린더 상세·약관 등 남는 모든
다이얼로그가 폰에서 좌우 `{spacing.base}`(16px) 여백을 갖는다. calc는 스페이싱 토큰 참조라
인라인 수치 금지 위반이 아니다(vh 선례와 동일한 레이아웃 값 예외).

## 6. 문서 갱신 (DESIGN.md)

- `event-form-modal` → **`event-form-page`**: "일정 등록·수정 전용 페이지(`/events/new`·`/events/[id]/edit`). DateTimePicker·MarkdownEditor·TagMultiSelect·Checkbox(종일) 조합, 종료>시작 검증, 낙관락 version. 공지·설교 폼 페이지와 동형" 취지로 교체
- `bulletin-form-modal` → **`bulletin-form-page`**: "주보 등록·수정 전용 페이지. Input(제목)·DateTimePicker(예배일)·MediaPicker(pdf·single). edit는 RSC `getBulletin`(no-store) 시드 + 낙관락 version" 취지로 교체
- `album-form-modal` → **`album-form-page`**: "갤러리 앨범 등록·수정 전용 페이지(회원 영역, GalleryGate). Input(제목)·MarkdownEditor(설명)·TagMultiSelect. edit는 클라 useQuery 시드 + 낙관락 version" 취지로 교체
- `admin-inline-action` 항목의 "목록 toolbar 등록 버튼" 서술에 "등록·수정 진입은 Link(전용 페이지)" 취지 반영

각 항목은 자기 구획 라인만 수정한다(병렬 머지 충돌 규칙).

## 7. 테스트 계획

- **폼 3종**: 기존 다이얼로그 테스트를 페이지 폼 기준으로 갱신 — open prop 없이 즉시 렌더,
  제출 성공 시 mutation 호출·push 경로, 필드 에러 표시. mock 관례(vi.hoisted·next/navigation
  mock) 유지
- **액션 3종**: "새 ○○" 버튼과 수정 버튼이 올바른 href의 링크로 렌더되는지(`getAttribute("href")`)
- **라우트 페이지**: new 페이지 스모크(권한 게이트 fallback 포함), edit 페이지는 비정상 id
  `notFound()` (공지 edit 테스트 선례 있으면 동형)
- 회귀: 전체 테스트에서 기존 실패 4파일(소개·히어로·사진, 무관) 외 신규 실패 0

## 비범위 (Out of Scope)

- 백엔드·API 변경 없음
- 공지·설교 폼은 무변경(이미 목표 패턴)
- 어드민 관리 화면(`/mypage/manage/*`)의 다이얼로그들(태그·직분·역할·회원 등)은 이번 범위
  밖 — 목록 위 소형 CRUD라 모달 유지가 합리적이며, §5 여백 보정의 혜택은 공유
