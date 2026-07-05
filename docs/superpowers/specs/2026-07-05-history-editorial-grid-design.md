# 연혁 에디토리얼 그리드 설계 스펙 — 카카오 지속가능성 스타일 재해석

> 2026-07-05 브레인스토밍 확정본. `/about/history` 페이지 전면 개편.
> 참조: sustainability.kakao.com/ko — Playwright로 직접 스크롤·관찰(아래 §1).
> 선행 스펙 `2026-06-22-history-uniform-editorial-design.md`(현행 좌 sticky 2단)를 **대체**한다.

## 1. 목적·참조 연출

카카오 지속가능성 사이트의 시각 언어를 은샘교회 디자인 시스템 토큰으로 재해석해
연혁 페이지를 재구성한다. 참조 사이트 관찰 결과(스크롤 단계 스크린샷 분해):

- **헤어라인 그리드 셀 레이아웃** — 1px 선으로 구획된 에디토리얼 표 구조. 대형 챕터
  번호(01/02/03)·제목·사진·설명이 각각 셀에 담기고 섹션마다 좌우가 어긋나는 지그재그
- **초대형 챕터 숫자** — 각 장을 넘버링하는 픽셀풍 숫자
- 도트 매트릭스(픽셀) 아이콘 장식 + 그리드 교차점 `+` 마크
- 다크 밴드(검정 배경 아젠다 그리드)로 페이지 리듬 전환

## 2. 확정 결정

| # | 결정 | 내용 · 근거 |
|---|---|---|
| H1 | **채택: 헤어라인 그리드 + 챕터 숫자** | 카카오 인상의 본체. 기존 `{colors.hairline}` 토큰·에디토리얼 톤과 자연 정합 |
| H2 | **채택: 다크 밴드 1곳(마지막 챕터)** | 마지막 시대(07 디지털 사역)를 `surface-dark` 톤 반전으로 마무리 — DESIGN.md 페이지 리듬 원칙(흰↔다크 교차) 준수 |
| H3 | **기각: 도트 매트릭스 장식·`+` 마크** | 카카오의 '디지털 픽셀' 브랜드 아이덴티티라 교회 사이트에서 의미가 겉돌고, lucide 외 장식 그래픽 규칙 신설 마찰만 유발 |
| H4 | **기각: 스크롤 연출 추가** | 기존 `Reveal`(fade+slide-up) 유지. 절제가 브랜드 보이스(DESIGN 개요) |
| H5 | **좌 sticky 2단 폐기 → 풀폭 그리드** | 카카오 레이아웃은 풀폭이 본질. sticky aside·스크롤 엔진 삭제로 코드 단순화(브라우저 목업 A안 사용자 확정) |
| H6 | **챕터 외곽 라운드 `{rounded.xl}`(24px) 유지** | "직각(0px) 금지" 규칙과 그리드 인상의 양립: 외곽만 라운드, 내부 셀 구분선은 직선 헤어라인 |
| H7 | **데이터 무변경** | `HISTORY` 상수(`src/constants/content.ts`) 스키마·내용 그대로. 챕터 번호는 `index + 1`을 2자리 패딩("01"~"07")으로 파생 |
| H8 | **메인 `HistoryBand` 무변경** | 범위는 `/about/history`만(사용자 확정) |

## 3. 레이아웃 스펙

### 3.1 페이지 히어로 (현행 유지)

중앙 정렬 제목 블록 그대로: `{typography.display-lg}` 제목 + `{colors.muted}` 인트로,
`Reveal` 등장, `word-break: keep-all`. 고정 히어로 없음.

### 3.2 챕터 블록 (데스크톱 ≥1024px)

챕터 = 외곽 1px `{colors.hairline}` 보더 + `{rounded.xl}` 라운드 + `overflow: hidden`.
내부는 CSS Grid 2행, 셀 구분선은 1px 헤어라인.

**표준 방향(홀수 챕터 01·03·05·07):**

```
┌─────────┬──────────────┬────────────────┐
│ 번호     │ 연도          │                │
│ "01"    │ 제목          │  사진           │
├─────────┼──────────────┴────────────────┤
│ (빈 셀)  │ 설명 + 세부 목록 + 의의 인용      │
└─────────┴───────────────────────────────┘
컬럼 비율: 1.1fr / 2fr / 2.4fr (2행: 1.1fr / 4.4fr)
```

**미러 방향(짝수 챕터 02·04·06):** 1행 `[사진 | 연도·제목 | 번호]`, 2행 `[본문 | 빈 셀]`.
번호는 우측 정렬. 챕터마다 표준↔미러 교차(지그재그).

- 번호: `typo.displayXl`(56px·500) + `text-ink`, tnum. **장식이므로 `aria-hidden`**
  (순서 의미는 연도 텍스트가 담당)
- 연도: `typo.datetime` + `text-primary`
- 제목: `typo.displayMd` + `text-ink`, 셀 하단 정렬(`justify-content: flex-end`)
- 사진 셀: `HistoryMedia` 재사용, 패딩 0, `object-fit: cover`로 셀 충전(1행 최소 높이
  기준). 미디어 없는 항목은 사진 셀 자체를 생략하고 연도·제목 셀이 잔여 폭 차지
- 본문 셀: 설명 `typo.bodyLg` + `text-body`, 세부 목록 disc, 의의 인용은 현행
  `border-left 3px {colors.primary}` 스타일 유지
- 챕터 간 간격: `{spacing.xl}`(32px)

### 3.3 다크 밴드 (마지막 챕터)

같은 그리드 구조에 톤만 반전: 배경 `{colors.surface-dark}`, 내부 구분선은 on-dark
헤어라인(`rgba` 화이트 계열 — 다크 밴드 내부 전용, DESIGN 구현 노트 3 준수), 번호·제목
`{colors.on-dark}`, 연도·본문 `{colors.on-dark-soft}`(메인 `HistoryBand` 다크 카드
관례와 동일). 의의 인용은 텍스트 `{colors.on-dark}` + 보더 `{colors.primary}` 유지.
canvas 계열 토큰 재사용 금지.

### 3.4 모바일 (<1024px)

미러 없이 챕터 전부 세로 스택: `[번호·연도 행] → [제목] → [사진] → [본문]`.
외곽 보더·라운드 유지, 셀 구분선은 가로 헤어라인으로 전환. 번호 크기는
`typo.displayXl` 토큰의 기존 반응형 규칙을 그대로 따른다(신규 clamp 정의 없음).

## 4. 컴포넌트 설계

| 파일 | 변경 |
|---|---|
| `src/components/history/HistoryStory.tsx` | sticky aside·스크롤 엔진 제거. 히어로 + 챕터 `<ol>` 렌더만 |
| `src/components/history/HistoryChapter.tsx` | 그리드 셀 마크업으로 재작성. props: `item`, `index`(번호·미러 파생), `dark`(마지막 여부). `forwardRef` 제거(측정 대상 아님) |
| `src/components/history/HistoryStory.module.css` | 그리드 규칙으로 재작성(§3 수치) |
| `src/components/history/HistoryMedia.tsx` | 무변경(사진 셀 재사용) |
| `src/components/history/useHistoryScrollEngine.ts` | **삭제**(사용처 소멸) — 테스트 포함 |
| `src/app/(site)/about/history/page.tsx` | 무변경(서버 컴포넌트 → `HISTORY` 주입 유지) |

데이터 흐름·에러 처리: 정적 상수 구동(API 호출 0) 그대로 — 신규 에러 표면 없음.

## 5. 모션·접근성

- 챕터별 `Reveal`(기존 컴포넌트) 등장 유지. reduced-motion 대응은 Reveal이 담당
- 시맨틱: `<ol>` + `<li aria-labelledby>` + 헤딩 구조 유지, 앵커 `#{id}` +
  `scroll-margin-top` 유지
- 번호 `aria-hidden`, 사진은 장식(`alt=""`) 현행 유지

## 6. 디자인 시스템 등록

DESIGN.md 연출 구획에 항목 추가:

- **`history-editorial-grid`**: 연혁 페이지 챕터 그리드(참조: 카카오 지속가능성).
  외곽 `{rounded.xl}` + 헤어라인, 내부 셀 헤어라인 구획, 대형 챕터 번호(`display-xl`·
  aria-hidden)·지그재그 미러·마지막 챕터 다크 밴드(`surface-dark`·on-dark 토큰).
  도트 픽셀 장식·추가 스크롤 연출은 채택하지 않음(단일 액센트·절제 원칙).

신규 토큰·라이브러리 없음. hex·px 인라인 없음(다크 밴드 내부 on-dark 헤어라인
rgba만 구현 노트 3 관례 적용).

## 7. 테스트 계획 (vitest 현행 관례)

| 파일 | 내용 |
|---|---|
| `HistoryStory.test.tsx` | 전 챕터(7개) 렌더, aside 부재, 마지막 챕터 다크 변형 클래스 |
| `HistoryChapter.test.tsx` | 번호 "01" 표기·`aria-hidden`, 미러 클래스(index 홀짝), 앵커 id·`aria-labelledby` 연결, 의의 인용 렌더 |
| `useHistoryScrollEngine.test.tsx` | 삭제(대상 소멸) |
| `about/history/page.test.tsx` | 무변경 예상(HistoryStory 렌더 확인만) — 깨지면 마크업 기준만 갱신 |

검수 게이트: `pnpm lint` + `npx tsc --noEmit` + `pnpm test` 통과, 데스크톱/모바일
수동 확인(지그재그·다크 밴드·앵커 스크롤).

## 8. 범위 밖 (Out of Scope)

- 메인 `HistoryBand` 재스킨(H8)
- `HISTORY` 콘텐츠·사진 교체(placeholder 유지)
- 도트 장식·카운트업 등 추가 연출(H3·H4)
