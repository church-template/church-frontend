# 목회자 인사말 페이지 UI/UX 재디자인 — 설계 (Design Spec)

- 날짜: 2026-06-22
- 대상 라우트: `/about/pastor` (`src/app/(site)/about/pastor/page.tsx`)
- 관련 이슈: `.issues/20260622_디자인_목회자_인사말_재디자인.md`
- 성격: 공개 정적 페이지(Server Component + ISR/SSG), 콘텐츠는 `src/constants/content.ts`의 `PASTOR` 주입

---

## 1. 개요 / 목표

현재 목회자 인사말 페이지는 흰 배경 위에 텍스트만 세로로 나열된 평면 레이아웃이다(사진·밴드 리듬·등장 연출 없음). DESIGN.md의 성격("조용히 신뢰를 주는", 사진이 주인공, 밴드 교차 리듬)을 살려, **디자인 시스템의 절제를 깨지 않으면서** 페이지를 "편집된 인물 지면"처럼 끌어올린다.

핵심 레버는 DESIGN.md가 명시한 정공법 — **다크 밴드 위 elevated 카드**(`깊이가 더 필요하면 다크 밴드 위 elevated 카드 패턴을 쓴다`). 새 그림자 단계·두 번째 브랜드 컬러를 하나도 추가하지 않고 깊이와 무게감을 만든다.

성공 기준:
- 흰 → 다크(인용) → 회색 → 다크(전역 CTA)의 밴드 교차 리듬이 성립한다(dark↔dark 인접 없음).
- 평면 `<ul>` 두 개(약력·철학)가 정돈된 정보 위계로 승격된다.
- hex·px 인라인 0, 두 번째 색 0, 700+ 굵기 0, 새 그림자 단계 0, arbitrary value 0(검수 게이트).
- RSC 유지 + 기존 `Reveal` 클라이언트 island만으로 등장 연출, `prefers-reduced-motion` 안전, CLS 0.
- 테스트 커버리지 80%+.

---

## 2. 현재 상태와 문제

- `page.tsx`: `Container` 한 개 안에 제목(`displayMd`) → 이름/직분(`titleLg`) → 학위(`bodySm`) → intro → greeting → 학력 `<ul>` → 철학 `<ul>`. 단일 컬럼, 정적.
- `PASTOR` 상수에 **사진(image) 필드 없음**, **pullQuote 필드 없음**(주석: "사진은 자산 준비 후 추가"). `public/`에 목회자 사진 자산 없음.
- `greeting`은 2문단으로 짧다 → 다크 밴드에 장문 본문을 흘리면 휑하거나 고령 가독성을 해친다.
- `credentials.items` 5개 중 연도 보유 항목은 "2011년 개척" 1건뿐 → 연도 타임라인 연출은 빈약(채택 안 함, §12).

---

## 3. 결정 사항 (Decisions)

| 항목 | 결정 | 근거 |
|---|---|---|
| 도입부 레이아웃 | 비대칭 5/7 스플릿 포트레이트 | 세로 인물 사진 최적·서버 컴포넌트 친화(사용자 선택 A) |
| 사진 자산 | `PASTOR.image` 필드 추가 + 플레이스홀더 폴백, 자산은 곧 교체 | 현재 자산 없음, 사진 중심 방향(사용자 선택) |
| 인용 연출 | 다크 밴드 elevated 카드(핵심 1문장) | 단일 최대 "있어보임" 레버(사용자 선택), 심사 만장일치 fidelity 5 |
| 인용 텍스트 | `PASTOR.pullQuote` 신규 필드로 주입(컴포넌트 발췌 금지) | 콘텐츠 하드코딩 금지 |
| 다크 밴드 본문 | 핵심 1문장만, `text-on-dark` | 고령 가독성(장문·on-dark-soft 회피) |
| 철학 표현 | lucide 아이콘 그리드(MinistryCards 패턴) | 시각 임팩트(사용자 선택) |
| 약력 표현 | 무번호 헤어라인 행(notice-row 톤) | 연도 데이터 빈약 → 타임라인 미채택 |
| 이미지 태그 | `<img>` + `eslint-disable @next/next/no-img-element` | 코드베이스 관례(전 카드 동일, next/image는 후속) |
| 3:4 비율 | CSS 모듈 `aspect-ratio: 3/4` | arbitrary value(`aspect-[3/4]`) 금지, 선례 `HistoryStory.module.css` |
| 모션 | 기존 `Reveal`만 | parallax island는 phantom hook·CLS·과함으로 미채택(§12) |

---

## 4. 페이지 구성 (밴드 교차)

```
밴드1  흰 canvas ───────────────────────── py-section
┌─────────┬─────────────────────────────┐
│         │ 목회자 인사말  ← 키커(captionStrong, text-muted)
│  3:4    │ 홍성균  담임목사  ← displayMd(500) text-ink + titleMd text-muted
│  초상   │ M.Div  ← datetime(tnum) text-muted
│ (액자)  │ intro 본문  ← bodyMd(1.7) text-body
│         │ greeting 2문단  ← bodyMd(1.7) text-body
└─────────┴─────────────────────────────┘   lg:grid-cols-[5fr_7fr] gap-xxl, items-start

밴드2  다크 surface-dark ────────────────── py-section
   ┌──────────────────────────────────┐
   │ "  ← lucide Quote(size 32, on-dark-soft, aria-hidden)
   │  pullQuote 핵심 1문장             │  displayLg(500) text-on-dark
   │              [담임목사 홍성균]  ← Badge primary (이 페이지 유일 액센트)
   └──────────────────────────────────┘   bg-surface-dark-elevated 카드(rounded-xl p-xxl)

밴드3  surface-soft 회색 ────────────────── py-section
┌──────────────────────────────────────┐
│ 학력 및 경력  ← titleLg(600) h2        │
│  · 항목  ← bodyMd, border-t hairline-soft 행 구분
│  · 항목 …                              │
│                                        │  mt-xl
│ 목회 철학  ← titleLg(600) h2           │
│ ┌────┐ ┌────┐ ┌────┐                  │  grid gap-base sm:grid-cols-2 lg:grid-cols-3
│ │◆라벨│ │◆라벨│ │◆라벨│   ← 셀: bg-canvas rounded-xl p-xl
│ └────┘ └────┘ └────┘                  │     lucide(32, ink) + titleMd 라벨
└──────────────────────────────────────┘  각 행/셀 Reveal delay={i*120}

(전역) 다크 CtaBand + SiteFooter  ← SiteShell이 자동 부착
리듬: 흰 → 다크(인용) → 회색 → 다크(CTA)
```

- 모든 섹션은 `bg-*` 풀밴드 `<section>` + 내부 `Container`(1200px·24px) 패턴. 폭 규칙 단일 유지.
- 다크 밴드(인용)는 본문 **중간**에 둔다 → 전역 다크 CtaBand와 회색 밴드(3)가 사이에 끼어 dark↔dark 인접을 막는다(하드 제약).
- 모바일(`< lg`)은 밴드1이 1-up 스택(초상 위·텍스트 아래), 밴드3는 1-up.

---

## 5. 컴포넌트 아키텍처

| 파일 | 역할 | 종류 |
|---|---|---|
| `app/(site)/about/pastor/page.tsx` | `metadata` + `PASTOR` 주입, 3개 밴드 합성 | 서버(재작성) |
| `components/about/PastorIntro.tsx` | 밴드1 — 5/7 스플릿(초상+폴백 / 키커·이름·직분·학위·intro·greeting) | 서버(신규) |
| `components/about/PastorIntro.module.css` | 초상 프레임 `aspect-ratio: 3/4` | CSS 모듈(신규) |
| `components/about/PastorQuote.tsx` | 밴드2 — 다크 elevated 인용 카드 + Badge + lucide Quote | 서버(신규) |
| `components/about/PastorDossier.tsx` | 밴드3 — 약력 헤어라인 행 + 철학 아이콘 그리드 | 서버(신규) |

- 세 컴포넌트는 서버 컴포넌트. 등장 연출은 각자 내부에서 기존 `Reveal`(client) 자식으로 렌더.
- 초상 폴백·아이콘 매핑은 컴포넌트 책임(상수는 직렬화 가능한 키만 보유 — MinistryCards 선례 §3).

---

## 6. 데이터 모델 변경 (`src/constants/content.ts`)

`PASTOR`에 다음을 적용(비파괴 — 기존 텍스트 필드 유지):

```ts
export const PASTOR = {
  title: "목회자 인사말",
  name: "홍성균",
  position: "담임목사",
  degree: "한국침례신학대학교 석사 (M.Div)",
  // 신규: 포트레이트 자산. 미준비 시 null → 플레이스홀더 폴백(§10).
  image: null as { src: string; alt: string } | null,
  // 신규: 다크 밴드 핵심 인용 1문장(컴포넌트 발췌 금지).
  pullQuote: "은샘에서 함께함이 축복이 되는 행복한 신앙의 삶을 시작하시길 주님의 이름으로 축원합니다.",
  intro: "…",            // 유지
  greeting: ["…", "…"],  // 유지(밴드1 흰 캔버스에 표시)
  credentials: {
    heading: "학력 및 경력",
    items: ["…"],        // string[] 유지(무번호 헤어라인 행)
  },
  philosophy: {
    heading: "목회 철학",
    // 변경: string[] → { key, text }[] (아이콘 매핑용 키 부여)
    items: [
      { key: "worship", text: "예배와 교회가 중심이 되는 신앙생활" },
      { key: "bible", text: "성경 중심의 설교와 목회" },
      { key: "fellowship", text: "성도들과의 따뜻한 교제와 돌봄" },
      { key: "community", text: "지역 사회를 섬기는 교회" },
      { key: "nextgen", text: "다음 세대를 세우는 교육 사역" },
      { key: "mission", text: "선교와 전도에 힘쓰는 교회" },
    ],
  },
};
```

- `philosophy.items` 시그니처 변경 → 기존 `page.test.tsx`의 `items[0]` 텍스트 단언이 깨지므로 테스트 동시 갱신(§11).
- 동일 상수 다른 소비자 없음(단일 소비자 = PastorPage. 머지 전 재확인).

철학 아이콘 매핑(`PastorDossier.tsx` 내부, currentColor=ink 상속·다색 금지):

| key | lucide |
|---|---|
| worship | `Church` |
| bible | `BookOpen` |
| fellowship | `HeartHandshake` |
| community | `HandHeart` |
| nextgen | `GraduationCap` |
| mission | `Send` |

> 아이콘 의미 적합성은 구현 시 1차 검수(추상 항목에 억지 매핑 시 템플릿 인상 — 어색하면 해당 항목만 중립 아이콘으로 교체).

---

## 7. 토큰 매핑 (전부 실재 확인)

- 타이포: `typo.captionStrong`(키커) · `typo.displayMd`(이름) · `typo.titleMd`(직분·철학 라벨) · `typo.datetime`(학위, tnum) · `typo.bodyMd`(본문 1.7·약력 행) · `typo.displayLg`(인용) · `typo.titleLg`(밴드3 헤딩 h2).
- 색/면: `bg-surface-dark` · `bg-surface-dark-elevated`(#16181c) · `text-on-dark` · `text-on-dark-soft`(인용 글리프 한정) · `bg-surface-soft`(밴드3 바닥) · `bg-canvas`(철학 셀) · `text-ink`/`text-body`/`text-muted` · `bg-primary-soft`/`text-primary`(Badge).
- 라인/형태: `border border-hairline`(초상 프레임) · `border-t border-hairline-soft`(약력 행 구분) · `rounded-xl`(24px 카드·초상·철학 셀) · `rounded-sm`(Badge 8px).
- 간격: `py-section`(96px·모바일 64) · `p-xxl`(다크 카드) · `p-xl`(철학 셀) · `gap-xxl`/`gap-base` · `mt-lg`/`mt-xl`/`mt-base`/`mt-xs`.
- 그리드: `lg:grid-cols-[5fr_7fr]`(밴드1) · 밴드3은 약력·철학 세로 스택 · 철학 `grid gap-base sm:grid-cols-2 lg:grid-cols-3`.
- 그림자: 새 단계 0. 카드 hover 그림자 없음 — 깊이는 다크 elevated 표면 레이어링 + 초상 photographic + 헤어라인으로만.
- 컴포넌트: `Container` · `Reveal`(delay 스태거) · `Badge`(variant primary) · lucide `Quote`/철학 아이콘 6종 · `<img>`(eslint-disable).

---

## 8. 모션 & 접근성

모션(기존 `Reveal`만, 신규 client island 없음):
- 밴드1 스플릿: `Reveal delay={0}`(초상·카피 한 묶음).
- 밴드2 인용 카드: `Reveal delay={0}`("한 호흡 멈춤" 등장).
- 밴드3: 약력 행/철학 셀 각 `Reveal delay={i*120}` 스태거(MinistryCards 곡선). 행이 많아 IO 인스턴스가 과하면 부모 1 Reveal + CSS `nth-child` 지연으로 대체 가능.
- 모든 등장 transform(translateY)+opacity만(reflow 0). `prefers-reduced-motion: reduce` → Reveal이 IO 미등록, CSS가 최종 상태 즉시 표시.

접근성:
- 제목 위계: `h1`(페이지 제목) → `h2`(밴드별: 인사말 본문 섹션 라벨/학력·철학). 키커는 제목이 아닌 보조 라벨.
- 인용은 `<blockquote>`. lucide `Quote` 글리프는 `aria-hidden`(장식).
- 초상 `<img>`: 자산 있을 때 `alt={image.alt}`. 폴백 플레이스홀더의 lucide `UserRound`은 `aria-hidden`(장식), 텍스트 대체 불필요(이미지 없음).
- 다크 밴드 텍스트는 `on-dark` 계열만(canvas/ink 재사용 금지 — DESIGN 구현노트 3). 본문은 `text-on-dark`(soft 아님).
- 철학 아이콘 `aria-hidden`(라벨이 의미 전달).

---

## 9. 단일 액센트(primary) 배분

| 밴드 | primary 등장 |
|---|---|
| 밴드1 (흰) | 0회 (희소성 축적) |
| 밴드2 (다크) | **1회** — elevated 카드 내 `Badge variant="primary"` "담임목사 홍성균" 칩 |
| 밴드3 (회색) | 0회 (헤어라인·ink 아이콘만) |
| 전역 CtaBand | 1회 (전역, 손대지 않음) |

→ 본문 1회 + 전역 CTA 1회. "밴드당 1~2회·희소할수록 강하다" 준수.

---

## 10. 폴백 (자산 미준비)

`PASTOR.image`가 `null`이면 초상 프레임을 다음으로 렌더:
- 동일 프레임(`PastorIntro.module.css` `aspect-ratio: 3/4` + `rounded-xl border border-hairline overflow-hidden`) 안을 `bg-surface-soft`로 채우고, 중앙에 lucide `UserRound`(size 64, `text-muted`, `aria-hidden`).
- 가짜 스톡 사진을 끼우지 않는다(`CHURCH_PHOTOS` 빈 상태 철학과 동일).
- 자산 있을 때(`{ src, alt }`)는 `<img src object-cover>` + `alt`.
- **두 경우 모두 동일 프레임이 박스를 예약** → 자산 도착 시 CLS 0. 자산 도착 절차 = `public/about/`(또는 기존 이미지 규약 폴더)에 파일 배치 + `PASTOR.image` 설정.

---

## 11. 테스트 계획 (프로젝트 관례)

신규/갱신:
- `page.test.tsx`(갱신): 제목·이름·직분·학위, intro·greeting, pullQuote, 약력 5항목, 철학 6항목 텍스트 렌더. `philosophy.items` 객체화에 맞춰 단언 수정.
- `PastorIntro.test.tsx`(신규): 이름/직분/학위/intro/greeting 렌더; `image` 설정 시 `<img>` + `alt`; `null` 시 이미지 없음·플레이스홀더 장식.
- `PastorQuote.test.tsx`(신규): pullQuote 텍스트, Badge 텍스트("담임목사 홍성균"), 인용 글리프 장식(`aria-hidden`).
- `PastorDossier.test.tsx`(신규): 약력 5항목·철학 6항목 렌더, 헤딩, 철학 아이콘 장식(`aria-hidden`).

관례(메모리: frontend-test-conventions):
- vitest `globals: false` 명시 import, jest-dom 미사용(`getAttribute`/`toBeDefined`).
- 링크 없음 → `next/link` mock 불필요. `<img>` 평문이라 `next/image` mock 불필요.
- 장식 이미지/아이콘은 `aria-hidden`/`alt=""` + `container.querySelector` 확인.
- 커버리지 80%+. 검증: `pnpm lint` + `npx tsc --noEmit` + `pnpm test`(메모리: lint≠tsc).

---

## 12. 명시적 비범위 (심사가 걸러낸 것)

- 풀블리드(Container 밖) 다크 시네마틱 히어로 — `SiteShell`이 `SiteHeader variant="light"`를 normal-flow로 하드코딩 → 흰 헤더와 충돌, full-bleed 이탈 선례 없음(CLS·가로스크롤 위험).
- 초상 sticky + scroll parallax island — 참조하려던 `useHistoryScrollEngine` 훅 부재(phantom; 실제는 `src/hero/scrub.ts` + MediaCollage rAF), 자산·체류구간 부족, 인사말 보이스에 과함.
- 약력 "연도 dot 타임라인"/번호 인덱스 — 연도 보유 항목 1건뿐, 단일 액센트 정당성 빈약.
- 풀쿼트 `border-l-4 border-primary` 바 — 시스템 인용 규약(`.prose-church blockquote` 3px hairline)과 불일치·arbitrary px 위험. primary는 Badge 1회로 통일.
- `displayMega` 장식 따옴표·`on-dark-soft` 위 장문 본문 — "장식 아님" 원칙·고령 가독성 위반.
- `next/image` 도입 — 코드베이스가 아직 `<img>` 관례(후속 일괄 전환 대상).

---

## 13. 변경 파일 목록

- 재작성: `src/app/(site)/about/pastor/page.tsx`
- 신규: `src/components/about/PastorIntro.tsx`, `PastorIntro.module.css`, `PastorQuote.tsx`, `PastorDossier.tsx` (+ 각 `*.test.tsx`)
- 편집: `src/constants/content.ts`(`PASTOR.image`·`pullQuote` 추가, `philosophy.items` 객체화)
- 갱신: `src/app/(site)/about/pastor/page.test.tsx`
- (자산은 추후 `public/`에 배치 — 지금 바이너리 커밋 없음)

---

## 14. 리스크 & 완화

| 리스크 | 완화 |
|---|---|
| 다크 인용 밴드가 전역 다크 CtaBand와 인접 | 밴드 순서 흰→다크(인용)→회색→전역다크CTA 고정(하드 제약) |
| greeting 2문단이 짧아 밴드1 우측이 빈약 | 밴드1에 intro+greeting 모두 배치(흰 캔버스 가독), 다크는 1문장 인용만 |
| `philosophy.items` 객체화로 기존 테스트 깨짐 | 동일 PR에서 테스트 갱신(§11) |
| 추상 철학 항목에 억지 아이콘 | 매핑 1차 검수, 어색하면 중립 아이콘 교체 |
| 초상 실비율(3:4)과 프레임 크롭 | `object-cover` + `object-position` 인물 머리 기준 보정 |
| 모바일에서 초상이 첫 화면 점유 | 1-up 스택 시 초상 높이 캡(뷰포트 단위) 검토 |

---

## 15. 다음 단계

스펙 승인 후 `superpowers:writing-plans`로 구현 계획(파일별 작업·TDD 순서) 작성 → TDD(RED→GREEN→REFACTOR) 구현 → `pnpm lint`·`tsc`·`test` 게이트 → 커밋(이슈 태그 `#`).
