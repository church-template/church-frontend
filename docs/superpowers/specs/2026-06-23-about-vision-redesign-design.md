# 소개 및 비전 페이지 재디자인 — 설계 (2026-06-23)

이슈: #69 · 라우트: `/about` (내비 "소개 및 비전")

## 1. 배경 · 목표

현재 `/about` 페이지(`src/app/(site)/about/page.tsx`)는 가운데 정렬 제목 + `surface-soft` 카드 그리드(4색) + 텍스트 두 섹션의 "기능하지만 밋밋한" 평면이다. 사용자는 이를 "이전 홈페이지와 같다"고 평가하며 **분명한 업그레이드**를 원했다. 단, 풀스크린 시네마틱 챕터·배경 회전·로고 회전 등 **과한 연출은 거절**("너무 거창함")했다.

확정된 타깃: **"조용한 신뢰" 브랜드 보이스를 유지한 세련된 빅타이포 에디토리얼.** 평면을 분명히 탈피하되 풀스크린·스크롤 하이재킹은 없다. 참고 무드는 사용자가 제시한 `aikawakenichi.com`(순백·큰 타이포·미니멀·은은한 모션)이되, 그 사이트의 풀스크린 3D 연출은 배제하고 "페이지" 스케일로 절제한다.

브레인스토밍 과정에서 채택한 방향 = **방향 B "빅타이포 에디토리얼"** (목업 4종 병렬 생성·심사에서 1순위: 밴드 평면 탈피 + 4색을 큰 색면이 아닌 마이크로 액센트로만 사용해 단일 액센트 원칙 유지 + 기존 `Reveal` 패턴에 그대로 이식 + 스크롤 하이재킹 0).

### 선행 정리 (완료)
- 고아 라우트 `/about/vision`(내비 미연결·무참조) 삭제됨: `page.tsx`·`page.test.tsx` 제거(사용자 승인).
- `VISION` 상수(`src/constants/content.ts`)는 **유지** — 그 6개 비전 항목을 새 `/about`에 흡수한다(아래 §3 D).

## 2. 디자인 원칙 · 제약 (DESIGN.md 준수)

- **단일 액센트**: `primary`(#0052ff)는 CTA·링크·강조 한 곳에만. 로고 4색(파랑·초록·빨강·주황)은 `content.ts:11` 주석대로 **신학적 상징 콘텐츠**(브랜드 팔레트 아님) → UI 풀필·버튼 색으로 쓰지 않고 **작은 점·가는 룰·인라인 단어 색**으로만 절제 사용. 이 4색은 브랜드 토큰과 구분되도록 `--color-symbol-*` 별도 토큰으로 노출.
- **타이포는 `typo.*` 상수만**(폰트 크기/굵기/행간 직접 지정 금지). 디스플레이 굵기 500 유지(700+ 금지).
- **고령 사용자 가독성(중요·사용자 강조)**: 섹션 라벨(eyebrow)·4색 설명·소망/이야기 본문이 작거나 흐리면 안 된다. (1) 섹션 라벨 ≥ 19px·고대비(`primary` 또는 `ink`), (2) 4색 설명(`lines`)은 `muted` 회색이 아니라 `body`/`ink` 계열로 대비 확보 + ≥ 21px, (3) 소망·이야기 같은 '읽는 본문'은 더 큰 lead(≈24px) 적용. 현 `typo`에 22px 위가 본문용으로 없으므로 **`--text-body-lg`(≈24px·weight 400·행간 1.7) + `typo.lead` 신설**(DESIGN.md 타이포 표 → globals.css `@theme` → `typo` 절차). 본문 최소 20px·15px 미만 금지 규칙 준수.
- **한글 줄바꿈**: 본문/제목에 `word-break: keep-all` 적용해 단어 중간 끊김("교회입니/다") 방지. 페이지 루트 또는 텍스트 컴포넌트에 일괄 적용 권장.
- **hex·px 인라인 금지** → 색·간격·라운드는 토큰/Tailwind 유틸. 4색도 토큰화.
- **이모지 금지 · 아이콘은 `lucide-react`만**(currentColor·size prop).
- **JSX 조건부는 삼항**(`cond ? <X/> : null`).
- **콘텐츠 하드코딩 금지** → 모든 텍스트는 `content.ts`(`ABOUT`, `VISION`)에서 주입.
- **데이터 패칭 경계**: 공개 페이지 → 서버 컴포넌트(상수 구동, ISR). 인터랙션(Reveal)만 client island.
- 섹션 리듬: 흰 ↔ `surface-soft` 교차. 섹션 상하 `py-section`(96px). 컨테이너 `Container`(1200/24px) 공유.

## 3. 페이지 구조 (섹션)

서버 컴포넌트 `page.tsx`가 5개 섹션 컴포넌트를 조합한다. 인사말 페이지(`PastorPage`)와 동일한 합성 패턴. 배경은 흰/soft 교차.

| # | 섹션 | 컴포넌트 | 배경 | 콘텐츠 소스 |
|---|------|----------|------|-------------|
| 1 | 히어로 | `VisionHero` | 흰 | `ABOUT.title`·`ABOUT.statement`·`ABOUT.intro` + 로고 |
| 2 | 네 가지 고백 | `SymbolismList` | soft | `ABOUT.symbolism[]` (4색) |
| 3 | 우리의 소망 | `HopeStatement` | 흰 | `ABOUT.hope` |
| 4 | 비전 | `VisionGoals` | soft | `VISION.title`·`VISION.points[]` (6항목) |
| 5 | 우리의 이야기 | `ChurchStory` | 흰 | `ABOUT.story` |

### A. `VisionHero` (흰)
- 비대칭 레이아웃: 좌측 텍스트(eyebrow `ABOUT.title` "소개 및 비전" → h1 `ABOUT.statement` 큰 디스플레이 타이포 → `ABOUT.intro` 본문), 우측 로고(`/onlyLogo.png`).
- h1은 `typo.displayMega`/`displayXl` 급(페이지 대표 헤드라인). 좌측 정렬·큰 스케일이 "업그레이드"의 핵심.
- 로고: `next/image`(또는 프로젝트 기존 이미지 방식, `HistoryMedia` 참조) `object-contain`. **현재는 `public/onlyLogo.png`(임시), 추후 누끼 PNG로 교체** — `<img>`가 배경 가정 없이 투명 PNG도 수용하도록. **로고는 크게(데스크톱 우측, 텍스트와 세로 가운데 정렬), 히어로 상하 패딩은 절제**(과한 여백 금지).
- `Reveal`로 진입 fade-up(스태거: eyebrow→h1→intro).
- (선택) `statement`의 한 단어 `primary` 강조는 콘텐츠 분리 이슈가 있어 1차는 평문 렌더. 강조가 필요하면 `ABOUT`에 `statementAccent` 필드 추가로 처리(하드코딩 금지 준수).

### B. `SymbolismList` (soft) — 시그니처
- 좌측 섹션 헤딩(예: "하나의 로고, 네 가지 고백") + 우측 인트로 한 줄(`typo.bodySm`/`muted`)의 2단 헤더.
- 본문: `ABOUT.symbolism`를 **01–04 넘버드 에디토리얼 리스트**로. 각 행 = 인덱스 번호(`typo.datetime`/`muted`) + 작은 색 점(`--color-symbol-*`, 지름 ~12px) + `color`(색이름) — `title` + `lines` 설명. 1px 헤어라인 행 구분.
- 4색은 **점/가는 룰**로만 등장(큰 색면 금지 → 단일 액센트 유지).
- `Reveal` 행별 스태거(i*120ms 권장, `RevealProps.delay`).

### C. `HopeStatement` (흰)
- 좌측 소제목(`ABOUT.hope.heading` "우리의 소망") + 우측 본문(`ABOUT.hope.body`, `typo.bodyMd` 행간 1.7).
- 본문 내 (파랑)(초록)(빨강)(주황)은 이미 텍스트에 포함 — 1차는 평문. (선택) 해당 단어만 `--color-symbol-*` 인라인 색 강조는 후속.
- (선택) 4색 가는 바 액센트 한 줄.

### D. `VisionGoals` (soft) — 신규(흡수)
- 헤딩 `VISION.title`("비전") 또는 "우리가 꿈꾸는 교회".
- `VISION.points`(6개 문장)를 차분한 2~3열 그리드 또는 리스트로. 각 항목 = `lucide-react` 아이콘(32px·currentColor) + 문장.
- 아이콘은 **표현용**이라 컴포넌트 내 인덱스→아이콘 매핑(콘텐츠 텍스트는 상수 유지). 매핑 예: 예배=`Church`, 성경=`BookOpen`, 교제=`Users`, 지역사회=`HeartHandshake`, 다음세대=`Sprout`, 선교=`Globe`.
- `Reveal` 스태거.

### E. `ChurchStory` (흰)
- `ABOUT.story.heading` + `ABOUT.story.paragraphs`. 에디토리얼 본문(최대 폭 제한, `typo.bodyMd`). 현재 `page.tsx`의 story 섹션을 컴포넌트화.

## 4. 코드베이스 매핑 · 재사용

- **신규 파일**(모두 `src/components/about/`, 인사말 컴포넌트와 동거):
  `VisionHero.tsx`, `SymbolismList.tsx`, `HopeStatement.tsx`, `VisionGoals.tsx`, `ChurchStory.tsx` (+ 각 `.test.tsx`).
- **수정**: `src/app/(site)/about/page.tsx` — 5개 섹션 조합으로 교체, `export const metadata = { title: ABOUT.title }`(커밋 #67 관례).
- **재사용**: `@/components/shell/Container`(`as="section" className="py-section"`), `@/components/main/Reveal`(+`delay`), `@/constants/typography`의 `typo.*`, `@/lib/utils`의 `cn`.
- **토큰 추가**: `src/app/globals.css` `@theme` 색 블록에 신학 상징색 4개 — `--color-symbol-blue:#0a3fd0; --color-symbol-green:#157a47; --color-symbol-red:#a81e2c; --color-symbol-orange:#b8590a;` (→ `bg-symbol-*`/`text-symbol-*` 유틸). twMerge 충돌 없는지 확인(색 유틸은 표준 처리, 메모리 `twmerge-custom-typo-tokens`는 text 크기 토큰 한정).
- **상수**: `ABOUT`·`VISION` 기존 값 그대로 사용. 변경 불필요(필요 시 §3A의 `statementAccent`만 선택 추가).

## 5. 인터랙션 · 접근성 · 반응형

- 인터랙션은 `Reveal`(IntersectionObserver fade+slide-up·1회)만. **스크롤 하이재킹·풀스크린·스냅 없음.**
- `prefers-reduced-motion`: `Reveal`이 이미 IO 미등록 → 즉시 정적 표시(추가 작업 불필요).
- 반응형: 데스크톱 비대칭/2~3열 → 모바일 1열 스택. `py-section` 모바일 64px 토큰 규칙 준수. **모바일 히어로는 로고를 가운데 정렬(`justify-self:center`), 텍스트는 좌측 유지.**
- 시맨틱: 섹션당 `<section>` + 적절한 heading 레벨(h1 1개=히어로, 이하 h2). 로고 장식이면 `alt=""`(단 로고는 의미 있으니 `alt="은샘침례교회 로고"`).

## 6. 테스트 (frontend-test-conventions)

각 섹션 컴포넌트별 렌더 테스트(vitest, `globals:false` 명시 import, jest-dom 미사용→`toBeDefined()`/`textContent`/`container.querySelector`, `matchMedia` 스텁):
- `VisionHero`: `ABOUT.statement`·`ABOUT.intro[0]` 렌더, h1 존재, 로고 img/alt.
- `SymbolismList`: 4개 `title` 전부 + 색이름 렌더.
- `HopeStatement`: `ABOUT.hope.heading`·`body` 렌더.
- `VisionGoals`: `VISION.points` 6개 전부 렌더, 아이콘(svg) 존재.
- `ChurchStory`: `ABOUT.story.paragraphs` 렌더.
- 게이트: `pnpm lint`(≠tsc) + `npx tsc --noEmit` + `pnpm test` + `pnpm build`(CI 백엔드 없음 — 정적 페이지라 무관).

## 7. 범위 밖 · 후속

- 실제 교회 사진 도입(방향 B는 사진 없이 완결, 후속에 시네마틱 사진 옵션 가능).
- 누끼 처리된 로고 PNG 교체(슬롯은 본 작업에서 준비).
- `statement`/hope 단어색 강조(선택 enhancement).

## 8. 완료 기준 (DoD)

- `/about`가 5개 섹션의 빅타이포 에디토리얼로 렌더되고, 콘텐츠는 전부 `ABOUT`/`VISION` 주입.
- DESIGN.md 준수: 단일 액센트(4색은 마이크로 액센트·토큰), `typo.*`, 라운드/간격 토큰, lucide, 삼항, 이모지 없음.
- 6개 비전 항목 섹션 포함.
- 반응형·reduced-motion 동작.
- lint·tsc·test 통과.
