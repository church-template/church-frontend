# 목회자 인사말 — 리딩 스포트라이트 (reading-spotlight)

- 날짜: 2026-07-13
- 대상: `/about/pastor` 의 `PastorIntro` 우측 본문(intro 1문단 + greeting 2문단 = 문장 6개)
- 목표: 섹션이 화면에 고정된 채 스크롤이 **한 문장씩** 강조를 밟고 내려가고, 다 읽히면 페이지가 다음으로 넘어간다.

## 동작 (Behavior)

본문을 **문장 단위 `<span>`** 으로 쪼개고, 스크롤 진행에 따라 정확히 한 문장만 켠다.

- 켜진 문장: `{colors.ink}` + `{typography.body-xl}`(32px/600) — **크기·굵기까지 부푼다.**
- 나머지 문장: `{colors.muted-soft}` + `{typography.body-lg}`(24px/400).
- 형광펜 배경은 쓰지 않는다(단일 액센트·문서 톤 유지).
- 줄 높이는 **큰 글자 기준으로 고정**(`line-height: calc(var(--text-body-xl) * 1.5)`) — 문장이 부풀 때 줄 간격까지
  벌어지면 본문 전체가 출렁인다. 이 고정으로 블록 높이 변동이 실측 6px(696→702)에 머문다. 줄바꿈이 다소
  밀리는 것은 글자 크기가 변하는 이상 불가피하다(그게 이 연출의 값이다).

**JS 0줄** — CSS 스크롤 타임라인만 쓴다.

- **데스크톱(≥64rem 폭·≥48rem 높이) = 고정(pin)**: 섹션이 `position: sticky` 로 화면에 멈춘 채
  강조가 문장 1 → n 을 차례로 밟는다. 마지막 문장이 끝나면 sticky가 풀리며 다음 섹션으로 이어진다.
- **모바일·짧은 뷰포트 = 비고정**: 콘텐츠(초상 + 본문)가 화면보다 커서 고정하면 잘린 채 멈춘다.
  대신 **본문 블록**(`.reading`)을 타임라인으로 삼아 뷰포트 중앙이 문장 i의 띠를 지나는 동안 켠다.
  문장마다 자기 `view()` 를 주면 안 된다 — 켜짐 구간 폭(`0.35 × (문장높이 + 뷰포트)` ≈ 320~390px)이
  문장 간격(48~300px)보다 넓고, 한 줄을 두 문장이 나눠 쓰면 박스까지 겹쳐 **두 문장이 함께 켜진다**
  (실측 확인). 고정/비고정 모두 인덱스 등분 = 배타 구간이라 겹침이 원천 차단된다.
- **강조 밖 문장은 사라지지 않는다** — 흐려질 뿐이라 되돌아가 다시 읽을 수 있다(고령 가독성 > 몰입).

## 대수 (Algebra)

### 고정 구간 = `contain` 구간

stage(외곽 `section`) 안에 `pinned`(`sticky top: 0; min-height: 100vh`)를 둔다. sticky는 stage 상단이
뷰포트 상단에 닿을 때 붙고, stage 하단이 뷰포트 하단에 닿을 때 풀린다 — 이는 `view-timeline` 의
`contain 0% → contain 100%` 구간과 정확히 같다. 따라서 별도 계산 없이:

```css
.stage    { height: calc(100vh + var(--sentences) * 35vh); view-timeline-name: --pastor-read; }
.sentence { animation-timeline: --pastor-read; }
```

고정된 채 스크롤되는 길이 = `stage 높이 - 100vh` = `문장수 × 35vh` — 본문이 길어지면 고정도 그만큼 길어진다.

### 한 문장씩 = 등분된 `animation-range` + `fill-mode: none`

문장 `i`(0-based, 총 `n`)의 구간은 고정 구간을 `n` 등분한 `i/n ~ (i+1)/n`:

```css
.sentence {
  color: var(--color-muted-soft);          /* 기본 = 흐림·기본 크기(블록의 body-lg 상속) */
  animation: pastor-read-on linear;        /* fill-mode 기본값 none */
  animation-range: contain calc(var(--i) * 100% / var(--sentences))
                   contain calc((var(--i) + 1) * 100% / var(--sentences));
}
@keyframes pastor-read-on {
  0%   { color: var(--color-muted-soft); font-size: var(--text-body-lg); font-weight: 400; }
  6%,
  94%  { color: var(--color-ink); font-size: var(--text-body-xl); font-weight: 600; }  /* 켜짐: 부푼다 */
  100% { color: var(--color-muted-soft); font-size: var(--text-body-lg); font-weight: 400; }
}
```

**`fill-mode: none` 이 핵심**이다 — 자기 구간 밖에서는 애니메이션이 적용되지 않아 기본색(흐림)으로
돌아간다. 구간 안에서만 ink로 켜지므로 "동시에 한 문장"이 자동으로 성립한다(별도 상태·JS 불필요).

`--i`(문장 인덱스)는 span의 인라인 커스텀 속성, `--sentences`(총 문장 수)는 stage의 인라인 커스텀 속성.
둘 다 모듈 로드 시 1회 계산(상수 콘텐츠).

### 비고정(모바일) 구간 = 본문 블록 타임라인의 등분

고정이 없으니 `contain` 대신 본문 블록(`.reading`, 높이 `H`)의 `cover`(총 진행 = `H + V`, `V` = 뷰포트)를 쓴다.
문장 `i` 는 **뷰포트 중앙이 문장 i의 띠를 지나는 동안** 켠다 — cover 진행 px 기준:

```
[ V/2 + i·H/n , V/2 + (i+1)·H/n ]
```

`V = 100vh`, `H = 100% − 100vh`(100% = cover 전체 = `H + V`)이므로 실측 없이 CSS로 그대로 쓴다:

```css
.reading  { view-timeline-name: --pastor-read-flow; }
.sentence {
  animation-timeline: --pastor-read-flow;
  animation-range: cover calc(50vh + var(--i) * (100% - 100vh) / var(--sentences))
                   cover calc(50vh + (var(--i) + 1) * (100% - 100vh) / var(--sentences));
}
```

문장 높이가 제각각이라 켜진 문장이 정확히 중앙은 아니다(실측 오차 ≈ 75px) — 등분의 대가이며, 화면 안에
있는 것은 보장된다(첫 문장은 블록 상단이 중앙에 닿을 때, 마지막은 블록 하단이 중앙에 닿을 때 꺼진다).

## 구현 (Implementation)

- `src/components/about/PastorIntro.tsx` — `section.stage > div.pinned > Container.frame > Reveal > grid`.
  본문은 `[data-reading]` 블록 안에서 마침표 뒤(`/(?<=\.)\s+/`)로 쪼갠 문장 span. 인덱스는 **문단을
  가로질러** 이어진다(문단 경계에서 강조가 리셋되지 않게). 서버 컴포넌트 유지.
- `src/components/about/PastorIntro.module.css` — 문장 켜짐(고정/비고정 두 타임라인), stage·pinned·frame.
  색은 전부 토큰(`--color-ink`·`--color-muted-soft`·`--color-body`).
- 새 타이포 토큰 `--text-body-xl`(32px/1.5/600, "지금 읽는 문장") — `globals.css` → `typography.ts`(`typo.bodyXl`) →
  `lib/utils.ts` twMerge `font-size` 목록 등록(미등록 시 `cn()`이 크기 클래스를 색상으로 오인해 제거).
- `.claude/rules/DESIGN.md` — 타이포 위계 표 + `### 연출` 의 `reading-spotlight` 항목.

## 폴백·접근성

| 조건 | 결과 |
|---|---|
| `animation-timeline: view()` 미지원 | 전 문장 `{colors.body}` 평문 + 고정 없음 |
| `prefers-reduced-motion: reduce` | 평문 + 고정 없음 |
| 좁은/낮은 뷰포트 | 고정 없음, 뷰포트 중앙이 문장의 띠를 지날 때 하나씩 켜짐(본문 블록 타임라인 등분) |
| 스크린리더·검색엔진 | 텍스트 노드 그대로(문장 span은 의미 없는 래퍼) |

기존 `Reveal`(1회 fade-up)은 유지 — 등장 연출과 문장 강조는 겹치지 않는다.

## 검증

1. `PastorIntro.test.tsx` — 본문 텍스트 전체 렌더 + 문장 span의 `--i` 가 0..n-1 연속(중복·구멍 = 강조 건너뜀)
   + stage의 `--sentences` = span 수.
2. `about/pastor/page.test.tsx` — 문장 분할 후에도 본문 전문이 페이지에 있다.
3. Playwright — 데스크톱(1440×900): 고정 구간 8%/42%/92% 에서 켜진 문장이 1→3→6 으로 하나씩 이동, 섹션은
   멈춰 있음. 모바일(390×844): 고정되지 않고 문장이 차례로 켜짐. **두 폭 모두 스크롤을 훑어 ink 문장이
   동시에 2개가 되는 지점이 없음을 확인한다**(문장별 `view()` 시절의 회귀 — 실측으로만 잡힌다).
4. `pnpm test` · `npx tsc --noEmit` · `pnpm lint`.

## 노브 (조정 가능한 값)

- **문장당 읽는 시간**: `.stage` 의 `35vh` (키우면 한 문장을 더 오래 붙든다).
- **강조 밖 흐림**: `{colors.muted-soft}`(기본) ↔ `{colors.muted}`(덜 흐림·대비 약함).
- **문장 경계 페이드**: 키프레임 `6% / 94%`(좁힐수록 경계에서 둘 다 흐린 틈이 짧아진다).
- **켜진 문장 크기·굵기**: `--text-body-xl`(32px/600) ↔ 기본 `--text-body-lg`(24px/400).
- **고정 임계값**: `(min-width: 64rem) and (min-height: 48rem)` — 실측 콘텐츠 높이 약 700px 기준.
  **본문·초상을 키우면 이 값도 함께 올려야 한다**(안 올리면 고정된 채 본문이 잘린다).
- **비고정 켜짐 위치**: `.sentence` 의 `50vh`(뷰포트 중앙 기준 — 키우면 강조 지점이 화면 위로 올라간다).
