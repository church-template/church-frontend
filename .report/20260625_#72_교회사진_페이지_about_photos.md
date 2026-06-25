# 교회사진 페이지 구현 (#72)

## 작업 개요

`/about/photos` 페이지를 교회 내부·외부 시설 사진을 카테고리 토글로 탐색하고 클릭으로 확대하는 공개 정적 페이지로 구현. 백엔드에 비인증 공개 사진 목록 API가 없고(갤러리 조회 `/api/gallery/**`는 로그인 + `GALLERY_VIEW` 회원전용), `/about` 도메인 전체가 이미 상수 구동 정적 생성 패턴이므로, 동일 관례대로 **프론트 상수 + `public/photos/**` 정적 에셋** 구동으로 구현. API 호출 0.

## 구현 내용

### `src/constants/content.ts` — CHURCH_PHOTOS 확장 + 타입

기존 `{ title, empty }` 두 필드짜리 스텁 상수에 `groups` 배열과 타입 선언을 추가.

- `ChurchPhoto = { src: string; alt: string }` 타입 추가
- `PhotoGroup = { key: string; title: string; photos: ChurchPhoto[] }` 타입 추가
- `CHURCH_PHOTOS.groups` 두 그룹 정의
  - `interior`: 내부 사진 6장(`in_1~in_5.jpg`, `in_6.jpeg`)
  - `exterior`: 외부 사진 5장(`out_1~out_2.jpg`, `out_3.jpeg`, `out_4.jpg`, `out_5.jpeg`)
- 분류명·경로·alt 전부 상수에만, 컴포넌트 인라인 없음. alt는 인덱스 기본값으로 채워 편집 용이.

### `src/components/about/ChurchPhotos.tsx` — 신규 자체 컴포넌트

`"use client"` 단일 컴포넌트. 갤러리 `PhotoGrid`/`PhotoLightbox`는 이미지 URL을 `/api/media/{mediaId}`로 고정해 정적 경로와 맞지 않으므로 재사용하지 않고 자체 구현.

**Props:** `{ empty: string; groups: PhotoGroup[] }` — 서버 컴포넌트 페이지에서 상수 주입.

**상태:**
- `activeKey: string` — 활성 그룹 키(기본 첫 그룹 `interior`)
- `lightboxIndex: number | null` — 확대 대상 인덱스(`null` = 닫힘)

**카테고리 토글:** shadcn `Tabs`(controlled `value`/`onValueChange`) 재사용. 토글 전환 시 `lightboxIndex`를 `null`로 초기화해 이전 그룹 모달이 남지 않도록 처리.

**썸네일 그리드:** 활성 그룹 사진을 `aspect-square` + `rounded-md` 그리드(`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, `gap-xs`)로 렌더. 각 셀은 `<button>`(포커스 링 포함)으로 클릭 시 `lightboxIndex` 설정. hover `scale-[1.03]` 0.3s ease 전환. 이미지는 `<img>` 프레젠테이션 셸(`no-img-element` eslint 주석 처리).

**확대 모달:** `@/components/ui/dialog`(`Dialog/DialogContent/DialogTitle`) 재사용. 폭 `max-w-[var(--container-lightbox)]`(DESIGN.md 라이트박스 폭 토큰). 이미지 `max-h-[70vh] object-contain`. 좌우 이동 `Button`(iconOnly, `ChevronLeft`/`ChevronRight` lucide `size={24}`), `ArrowLeft`/`ArrowRight` 키보드 지원. `n / total` 인디케이터(`typo.datetime` + `text-muted`). `DialogTitle`은 `sr-only`(시각 숨김·aria 연결 유지). 이동 범위는 현재 활성 그룹 내부로 제한. ESC·포커스트랩·스크롤락은 Dialog 내장.

**빈 처리:** 활성 그룹 사진 0장 → `EmptyState`(삼항 분기, `&&` 미사용).

### `src/app/(site)/about/photos/page.tsx` — 스텁 교체

기존 `CHURCH_PHOTOS.title`·`.empty`만 쓰는 스텁에서 실제 페이지로 교체.

- `export const metadata: Metadata = { title: CHURCH_PHOTOS.title }` — 형제 about 페이지 관례
- `Container as="section"` + `py-section` 96px 리듬
- `h1` `typo.displayMd` + `text-ink`
- `<ChurchPhotos empty={...} groups={...} />` 에 상수 주입

서버 컴포넌트, fetch/ISR/TanStack 없음 — 순수 정적 생성.

### `.claude/rules/DESIGN.md` — church-photos 컴포넌트 등록

`### 연출` 섹션 내 `department-card` 항목 아래에 `church-photos` 항목 추가(line 484). "문서에 없는 컴포넌트 구현 금지" 규칙 준수.

## 주요 결정

| 결정 | 근거 |
|---|---|
| 갤러리 컴포넌트 미재사용 | `PhotoGrid`/`PhotoLightbox`가 `/api/media/{id}` URL을 내부 고정 — 정적 `public/` 경로와 인터페이스 불일치. 리팩터(url 분리) 없이 자체 컴포넌트로 격리. |
| 프론트 상수 구동 | 백엔드 공개 사진 목록 API 없음. `/about` 도메인 전체 관례와 일관성 유지. |
| `<img>` 프레젠테이션 셸 | 라이트박스 포함 갤러리 선례(`PhotoLightbox.tsx`) 동일. next/image 미사용. |
| 단위 테스트 생략 | 사용자 명시 지시. 검증은 tsc + lint + build로 대체. |

## 데이터 흐름

```text
content.ts CHURCH_PHOTOS (상수)
  └─ page.tsx (서버, 정적 생성) ── props ──▶ ChurchPhotos (client)
                                              ├─ Tabs(activeKey) → 그룹 그리드 교체
                                              └─ Dialog(lightboxIndex) → 확대(그룹 내 좌우 이동)
이미지 바이트: /public/photos/** 정적 서빙 (API 호출 0)
```

## 검증 결과

사용자 지시에 따라 단위 테스트 미작성. 검증 게이트:

- `npx tsc --noEmit` — PASS
- `pnpm lint` — PASS
- `pnpm build` — PASS (`/about/photos` 정적 생성 확인)

## 비범위 (YAGNI)

백엔드 연동·신규 공개 엔드포인트, 사진 캡션/태그/검색, 페이지네이션·무한스크롤, 이미지 최적화 파이프라인, 갤러리 컴포넌트 리팩터(url 분리).
