# 교회사진 페이지(`/about/photos`) UI/UX 설계

> 신규 이슈: 🎨 [디자인][소개][사진] 교회사진 페이지(/about/photos) UI/UX 신규 디자인
> 작성일: 2026-06-25

## 1. 배경·핵심 결정

`/about/photos`는 현재 `CHURCH_PHOTOS = { title, empty }` 빈 껍데기 상수를 h1 + 안내문으로 렌더하는 스텁이다(`src/app/(site)/about/photos/page.tsx`). 교회 내부/외부 시설 사진을 **누구나(비인증) 볼 수 있는** 공개 페이지로 채운다.

조사 결과로 굳힌 결정(근거: api-docs.json·가이드 15.1·DESIGN.md):

- **데이터 출처 = 프론트 상수 + `public/` 정적 에셋.** 백엔드에는 비인증 공개 *사진 목록* API가 없다(갤러리 조회 `/api/gallery/**`는 전부 로그인+GALLERY_VIEW 회원전용, 익명 차단). `/api/media/{id}`는 바이트 서빙만 가능하고 목록 발견 불가. 그리고 `/about` 도메인 전체(소개·인사말·연혁·부서)가 이미 **상수 구동 정적 생성**이라 동일 패턴이 일관된다.
- **사진은 사용자가 업로드 완료:** `public/photos/interior/`(in_1~in_5 `.jpg`, in_6 `.jpeg` — 6장), `public/photos/exterior/`(out_1 `.jpg`, out_2 `.jpg`, out_3 `.jpeg`, out_4 `.jpg`, out_5 `.jpeg` — 5장).
- **인터랙션 = 카테고리 토글 + 그리드, 클릭 시 확대 모달.** 상단 토글 [교회 내부 | 교회 외부]로 아래 그리드를 통째 교체, 썸네일 클릭 시 확대 모달(좌우 이동).
- **갤러리 컴포넌트 미재사용(자체 컴포넌트).** `PhotoGrid`/`PhotoLightbox`는 이미지 URL을 `/api/media/{mediaId}`로 하드코딩해 정적 경로와 안 맞는다. 이를 리팩터(url 분리)하지 않고, about 전용 자체 컴포넌트가 정적 `<img src="/photos/...">`를 직접 렌더한다. 단 **동작 프리미티브(`@/components/ui/dialog`·`Button`·`Tabs`)와 `EmptyState`·`Reveal`은 재사용**(임의 신규 동작 컴포넌트 금지 규칙 준수).

## 2. 데이터 모델 — `src/constants/content.ts`

`CHURCH_PHOTOS`를 확장한다. `title`·`empty`는 유지하고 `groups`를 추가:

```ts
export const CHURCH_PHOTOS = {
  title: "교회 사진",
  empty: "교회 사진을 준비 중입니다.",
  groups: [
    {
      key: "interior",
      title: "교회 내부",
      photos: [
        { src: "/photos/interior/in_1.jpg", alt: "교회 내부 1" },
        { src: "/photos/interior/in_2.jpg", alt: "교회 내부 2" },
        { src: "/photos/interior/in_3.jpg", alt: "교회 내부 3" },
        { src: "/photos/interior/in_4.jpg", alt: "교회 내부 4" },
        { src: "/photos/interior/in_5.jpg", alt: "교회 내부 5" },
        { src: "/photos/interior/in_6.jpeg", alt: "교회 내부 6" },
      ],
    },
    {
      key: "exterior",
      title: "교회 외부",
      photos: [
        { src: "/photos/exterior/out_1.jpg", alt: "교회 외부 1" },
        { src: "/photos/exterior/out_2.jpg", alt: "교회 외부 2" },
        { src: "/photos/exterior/out_3.jpeg", alt: "교회 외부 3" },
        { src: "/photos/exterior/out_4.jpg", alt: "교회 외부 4" },
        { src: "/photos/exterior/out_5.jpeg", alt: "교회 외부 5" },
      ],
    },
  ],
} as const;
```

- `alt`는 인덱스 기본값으로 채워 두고(편집 쉬움), 더 좋은 문구는 상수만 고치면 된다. 시설 사진은 장식이 아니므로 의미 있는 alt를 둔다(빈 alt 금지).
- 콘텐츠 하드코딩 금지 규칙: 분류명·alt·경로 전부 상수에서 주입, 컴포넌트엔 텍스트/경로 인라인 없음.
- `HeroMedia`(media `{type,src,alt}`)·`PASTOR.image`(`{src,alt}`) 선례와 동형 — 직렬화 가능한 키만 상수에.

## 3. 컴포넌트

### `src/components/about/ChurchPhotos.tsx` (`"use client"`)

토글 상태와 모달 상태를 가진 단일 자체 컴포넌트.

- **Props:** `{ title: string; empty: string; groups: PhotoGroup[] }` — 페이지(서버 컴포넌트)가 상수를 주입.
- **상태:** `activeKey`(기본 첫 그룹 `interior`), `lightboxIndex: number | null`.
- **토글:** 접근성 있는 세그먼트 토글. shadcn `Tabs`(controlled `value`/`onValueChange`) 재스킨 권장 — 토큰(primary 채움/hairline)으로 세그먼트/필 형태, 고령 터치 48px 이상. (대안: `Button` 2개 + `aria-pressed`.) 토글 변경 시 `lightboxIndex`는 닫힌 상태로 초기화.
- **그리드:** 활성 그룹 사진을 `aspect-square` 썸네일 그리드(`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, `gap-xs`)로. 썸네일은 버튼(focus-ring) → 클릭 시 `lightboxIndex` 설정. hover scale 1.03(0.3s ease), `rounded-md`(중첩 라디우스). 이미지는 갤러리 선례와 동일하게 프레젠테이션 `<img>`(eslint `no-img-element` 비활성 주석) — 라이트박스의 `object-contain max-h-[70vh]`까지 일관되게 `<img>`로 통일(next/image 미사용).
- **확대 모달:** `@/components/ui/dialog`(Dialog/DialogContent/DialogTitle) 재사용. 폭 `--container-lightbox`, 큰 이미지 `max-h-[70vh] object-contain`, 좌우 이동 버튼(`Button` iconOnly + lucide `ChevronLeft`/`ChevronRight` `size={24}`), `ArrowLeft`/`ArrowRight` 키, `n / total` 인디케이터, sr-only DialogTitle. ESC·포커스트랩·스크롤락은 Dialog 내장. **이동 범위는 현재 활성 그룹 내부**(토글로 나눈 묶음 단위).
- **빈 처리:** 활성 그룹 사진 0장 → `EmptyState`. (현재 두 그룹 모두 사진 있음.)

### `src/app/(site)/about/photos/page.tsx` (서버 컴포넌트, 스텁 교체)

- `export const metadata = { title: CHURCH_PHOTOS.title }` (형제 about 페이지 관례).
- 상단 제목 인트로(`Container` + `typo.displayMd`/`displayXl` h1 + 선택적 lead) → `<ChurchPhotos title={...} empty={...} groups={CHURCH_PHOTOS.groups} />`.
- `Reveal`로 제목 등장(about 밴드 관례). 96px 섹션 리듬, `break-keep`.
- fetch/ISR/TanStack 없음 — 순수 정적 생성.

## 4. 디자인 토큰·규칙 준수

- hex·px 인라인 금지 — 색·간격·라운드·z는 DESIGN.md 토큰. 예외: `max-h-[70vh]`(레이아웃 값, dept-hero/PhotoLightbox 선례)·라이트박스 폭 토큰.
- 텍스트는 `typo.*` 의미 상수. lucide 아이콘은 `size` prop + `currentColor`.
- JSX 조건부는 삼항(`{cond ? <X/> : null}`).
- **DESIGN.md `components` 블록에 `church-photos` 항목 등록** 후 구현(문서에 없는 컴포넌트 금지 규칙).
- `prefers-reduced-motion`: hover scale·transition 비활성(또는 최소화).

## 5. 데이터 흐름

```text
content.ts CHURCH_PHOTOS (상수)
  └─ page.tsx (서버, 정적 생성) ── props ──▶ ChurchPhotos (client)
                                              ├─ activeKey 토글 → 그룹 그리드 교체
                                              └─ lightboxIndex → Dialog 확대(그룹 내 좌우 이동)
이미지 바이트: /public/photos/** 정적 서빙 (네트워크 API 호출 0)
```

## 6. 테스트 (vitest, `frontend-test-conventions`)

`src/components/about/ChurchPhotos.test.tsx` — globals:false 명시 import, jest-dom 없음(`getAttribute`/`toBeDefined`), 정적 `<img>`·링크 없음이라 next mock 불필요, Dialog 실제 렌더:

1. 기본(첫 그룹=내부) 사진 수만큼 `img` 렌더 + 각 `alt` 존재(빈 alt 아님).
2. 토글에서 "교회 외부" 활성화 → 외부 그룹 사진(out_*)으로 교체, 내부 미표시.
3. 썸네일 클릭 → 모달(`dialog` role) 열림, 첫 사진에서 "이전" disabled, 마지막에서 "다음" disabled.
4. 빈 그룹 props → `EmptyState` 메시지.

기존 갤러리 테스트는 손대지 않으므로 GREEN 유지(갤러리 코드 불변). `pnpm lint` + `npx tsc --noEmit` 통과 확인.

## 7. 변경 파일 요약

- 신규: `src/components/about/ChurchPhotos.tsx`, `src/components/about/ChurchPhotos.test.tsx`
- 수정: `src/constants/content.ts`(CHURCH_PHOTOS 확장 + `PhotoGroup` 타입), `src/app/(site)/about/photos/page.tsx`(스텁 교체 + metadata), `.claude/rules/DESIGN.md`(`church-photos` 등록)

## 8. 비범위 (YAGNI)

백엔드 연동·신규 공개 엔드포인트, 사진 캡션/태그/검색, 페이지네이션·무한스크롤, 이미지 최적화 파이프라인, 갤러리 컴포넌트 리팩터(url 분리) — 모두 하지 않는다.
