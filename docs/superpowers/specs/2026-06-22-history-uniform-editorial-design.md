# 연혁 — 균일 에디토리얼 복구 설계 (2026-06-22)

> 이전 v2(2026-06-21 `history-hero-dock`)의 **풀스크린 중앙 축소 히어로(`HistoryHero`)를 폐기**한다.
> 첫 시대만 풀스크린으로 특별취급하던 연출을 걷어내고, **모든 시대를 균일하게** 처리하는
> 에디토리얼 타임라인(2단)으로 복구한다. "연혁" 제목은 상단 고정 히어로가 아니라
> 시대 카드와 **동일한 Reveal 등장**을 쓰는 흐름의 한 블록이 된다.

## 1. 배경 · 결정

- 직전 세션에서 사용자가 요청·승인했던 풀스크린→중앙 축소 히어로(`clip-path` 스크럽)를 **이번에 반대로 폐기** 요청.
- "모든 시대를 균일하게" = 어느 시대(특히 첫 시대)도 다른 연출로 특별취급하지 않는다.
- 데스크톱 레이아웃은 **2단 유지**(좌측 sticky = 현재 시대 사진 / 우측 = 시대 카드 스택). 단일 컬럼 전환은 채택하지 않음(사용자 선택).
- 풀스크린 히어로 제거만으로 "모든 시대 균일"이 달성되며, 변경 최소·기존 에디토리얼 느낌 유지가 이 방향의 장점.

## 2. 변경 후 구조 (`HistoryStory.tsx`)

```
<>
  ┌ 제목 섹션 (Container · Reveal) ── 고정·pinned 아님. 흐름의 '0번 챕터'
  │   <h1>  연혁        (typo.displayLg · text-ink)
  │   <p>   {intro}     (typo.displaySm · text-muted · container-narrow 폭 캡)
  └
  ┌ 타임라인 (Container as="section" · 2단) ── 현행 유지
  │   <aside sticky aria-hidden>  현재 시대 사진만 (useHistoryScrollEngine 추적)
  │   <ol>  HistoryChapter × N  (각자 Reveal fade+slide-up)
  └
</>
```

- 기존 `HistoryHero` 분기(`content.items[0]?.media ? <HistoryHero/> : <텍스트 히어로>`)를 **제거**하고, 텍스트 제목 섹션을 단일 기본 경로로 승격한다.
- `HistoryHero` import·사용 제거 후 `@/hero/scrub` 의존은 history 영역에서 사라진다(공유 `scrub.ts` 자체는 MediaCollage 등이 계속 사용하므로 유지).

## 3. 제목 블록 상세

- 의미구조 정정: 현재 `else` 분기는 `<p>{title}</p>` + `<h1>{intro}</h1>`(인트로가 h1). 이를 **`<h1>연혁`**(페이지 제목) + 리드 **`<p>{intro}`**로 바로잡는다.
- 토큰: 제목 `typo.displayLg`(44, text-ink), 리드 `typo.displaySm`(text-muted). 중앙정렬·`word-break: keep-all`·`padding-block: var(--spacing-section)`은 기존 `.hero`/`.heroHead` 스타일 그대로 재사용. 리드 폭은 `--container-narrow`(42rem) 캡.
- 등장: `Reveal`로 감싸 fade+slide-up 1회. 시대 카드(`HistoryChapter`)와 **동일한 연출**.

### 결정 (스크롤 등장의 의미)

제목은 페이지 최상단에 있어 로드 시 뷰포트 안에 들어오므로 Reveal이 **즉시 1회** 발화한다. "스크롤하면서 등장"은 *고정/pinned 히어로가 아니라 다른 시대 카드처럼 흐름을 따라 올라가며 Reveal로 나온다*는 의미로 확정한다(첫 시대 카드도 동일하게 로드 시 보이는 위치라면 즉시 발화). **제목 위에 의도적 스크롤 여백(빈 공간)은 두지 않는다.**

## 4. 타임라인 (유지)

- 좌측 `<aside>`: `position: sticky`, 현재 시대 사진만 표시(`aria-hidden`, 의미는 우측 카드가 담당). 활성 시대는 `useHistoryScrollEngine`(scroll + rAF, 뷰포트 중앙 최근접 카드)로 추적.
- 우측 `<ol>`: `HistoryChapter`(연도 라벨 `typo.datetime`·text-primary / 헤드라인 `typo.displayMd`·text-ink / 설명·세부 `typo.bodyMd` / 의의 풀쿼트 left-border primary). 각 카드 `Reveal`.
- 2단 CSS(`.timeline`/`.aside`/`.cards`/`.card*`)는 변경 없음.

## 5. 반응형 · 폴백

- **모바일(<1024px)**: 단일 컬럼. 좌측 aside 숨김, 카드마다 자기 사진(`.cardMedia`)을 노출(현행 CSS 그대로).
- **reduced-motion / 무JS**: `Reveal`이 IO 미등록·CSS 즉시 표시, `useHistoryScrollEngine`은 정적 첫 시대로 폴백. h1 포함 전 콘텐츠 가시(`display:none` 금지).

## 6. 제거 파일 (삭제 승인 완료)

| 파일 | 사유 |
|---|---|
| `HistoryHero.tsx` / `HistoryHero.module.css` / `HistoryHero.test.tsx` | 폐기된 풀스크린 중앙 축소 히어로(분기 제거 후 미사용) |
| `historyScrub.ts` / `historyScrub.test.ts` | 고아(테스트 외 import 0) |
| `HistoryYearRail.tsx` / `HistoryYearRail.test.tsx` | 고아(테스트 외 import 0) |
| `tone.ts` / `tone.test.ts` | 고아(테스트 외 import 0) |
| `HistoryIntro.tsx` / `HistoryIntro.test.tsx` | 고아(테스트 외 import 0). 브리프엔 없었으나 displayMega 교회명 인트로로 현재 미사용 |

삭제 후 `pnpm exec tsc --noEmit`·`pnpm lint`로 잔여 참조(import·테스트)가 없는지 검증한다.

## 7. 유지 파일

`useHistoryScrollEngine.ts` · `HistoryChapter.tsx` · `HistoryMedia.tsx` · `HistoryStory.module.css`(2단) · `src/hero/scrub.ts`(공유).

## 8. 제약 (CLAUDE.md / DESIGN.md)

- 인라인 hex/px/z 금지 — 토큰만. 텍스트는 `typo.*`. 아이콘 `lucide-react`, 이모지 금지.
- JSX 조건부는 삼항(`{cond ? <X/> : null}`). 주석 한국어, WHY 중심.
- 콘텐츠 하드코딩 금지 — 텍스트는 `HISTORY`(content.ts) 상수에서 주입.

## 9. 테스트

- `HistoryStory.test.tsx`: 기존(intro·전 시대 카드·aside 사진-only) 유지 + **제목 "연혁" 노출** 단언 추가. 히어로 분기 제거 반영.
- 삭제 컴포넌트의 테스트 동반 제거.
- `page.test.tsx`에 히어로 참조가 있으면 정리(현재 import만 확인).

## 10. 인수 기준

1. `/about/history` 상단에 풀스크린 히어로 없음 — "연혁" 제목이 일반 흐름의 Reveal 블록으로 등장.
2. 모든 시대가 균일(첫 시대 특별취급 없음). 데스크톱 2단(좌 sticky 사진 / 우 카드) 유지, 스크롤 시 좌측 사진이 현재 시대로 교체.
3. 모바일 단일 컬럼·시대별 자기 사진. reduced/무JS에서 h1 포함 전 콘텐츠 가시.
4. 삭제 대상 5묶음(+테스트) 제거, 잔여 참조 0.
5. `pnpm exec tsc --noEmit` · `pnpm exec vitest run` · `pnpm lint` 통과. Playwright 데스크톱·모바일 시각 확인.
