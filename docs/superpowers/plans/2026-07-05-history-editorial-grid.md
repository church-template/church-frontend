# 연혁 에디토리얼 그리드 개편 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/about/history` 연혁 페이지를 좌 sticky 2단에서 카카오 지속가능성풍 헤어라인 그리드 챕터(대형 번호 01~07 · 지그재그 미러 · 마지막 다크 밴드)로 전면 개편한다.

**Architecture:** 스펙 `docs/superpowers/specs/2026-07-05-history-editorial-grid-design.md` 기반. `HistoryChapter`를 CSS Grid(`grid-template-areas`) 챕터 블록으로 재작성하고 `HistoryStory`에서 sticky aside·스크롤 엔진을 제거한다. 셀 구분선은 "컨테이너 배경(헤어라인색) + `gap: 1px`" 트릭으로 구현해 미러·모바일에서 보더 방향 관리가 필요 없다. 미러는 `grid-template-areas`만 뒤집고 DOM 순서는 유지한다(읽기 순서 보존).

**Tech Stack:** Next.js App Router + TypeScript, CSS Modules, Tailwind 토큰 유틸(`typo.*`, `text-*`), vitest + @testing-library/react. 신규 라이브러리 없음.

## Global Constraints

- 패키지 매니저 **pnpm**. 답변·주석은 **한국어**(주석은 WHY 중심, 과하지 않게)
- ⚠️ 이 Next.js는 일반 버전과 다르다 — 기존 파일 패턴을 벗어나는 Next API를 쓰게 되면 먼저 `node_modules/next/dist/docs/`를 확인한다 (이 계획은 기존 패턴 내에서만 움직이므로 통상 불필요)
- **hex·px 인라인 금지** — 색·간격은 `var(--*)` 토큰. 이 계획의 허용 예외(스펙 §3.2·§3.3·§6 확정): 헤어라인 `1px`·인용 보더 `3px`(기존 모듈 관례), 다크 챕터 내부 구분선 `rgba(255, 255, 255, 0.16)`(다크 밴드 내부 전용, DESIGN 구현 노트 3), 사진 셀 `min-height: 16rem`(연출 기하 수치)
- **JSX 조건부는 삼항** — `{cond && <X/>}` 금지, `{cond ? <X/> : null}`. 단 `cn()` 내부 클래스 조합의 `&&`는 허용
- 텍스트 스타일은 `typo.*` 상수, 색은 Tailwind 토큰 유틸(`text-ink`·`text-primary`·`text-on-dark`·`text-on-dark-soft` 등)
- 커밋 메시지: `<type> : <설명> #86` 형식, **Co-Authored-By 태그 금지**. 커밋은 Task 3·4의 지정 지점에서만(마이크로 커밋 금지 — 사용자 관례)
- **기존 실패 테스트**: `SymbolismList`·`VisionHero`·`HeroHeaderSync`·`about/photos/page` 4개 파일 8건은 이 작업 전(main)부터 실패하는 무관한 이슈다. 게이트 기준은 "이 8건 외 신규 실패 0건". 이들을 고치려 들지 말 것(범위 밖)
- 파일 삭제는 Task 3의 `useHistoryScrollEngine.ts`·`useHistoryScrollEngine.test.tsx` 2건만 — 사용자 삭제 승인 완료(2026-07-05 스펙 리뷰 게이트)
- 테스트에서 CSS 모듈 클래스 검증은 반드시 `import styles from "./HistoryStory.module.css"` 후 `classList.contains(styles.foo)`로 한다 — 이 저장소 vitest는 CSS Modules를 해시 스코핑으로 처리(`styles.card` = `"_card_a0c4b0"` 확인됨). 리터럴 클래스명 문자열 매칭 금지

---

### Task 1: HistoryStory.module.css + HistoryChapter 그리드 재작성

**Files:**
- Modify(전체 재작성): `src/components/history/HistoryStory.module.css`
- Modify(전체 재작성): `src/components/history/HistoryChapter.tsx`
- Test(전체 재작성): `src/components/history/HistoryChapter.test.tsx`

**Interfaces:**
- Consumes: `HistoryItem`(`@/constants/content` — id·year·text·desc·details·significance·media?), `HistoryMedia({ media, priority? })`, `Reveal({ children })`, `typo`, `cn`
- Produces: `HistoryChapter({ item: HistoryItem; index: number; dark?: boolean })` — `index`는 0기준(번호 `01`~ 파생, `index % 2 === 1`이면 미러), `dark`는 마지막 챕터 다크 밴드. Task 2의 `HistoryStory`가 이 시그니처를 사용한다. CSS 클래스 `card`·`chapter`·`mirrored`·`dark`·`hero`·`heroHead`·`timeline`·`cards`는 Task 2도 사용

**참고:** 이 태스크 완료 시점에 구 `HistoryStory.tsx`가 옛 CSS 클래스(`aside` 등)와 옛 props(`ref`, index 없음)를 참조하지만, vitest는 타입 오류를 무시하고 렌더도 깨지지 않으므로 `HistoryStory`·페이지 테스트는 계속 통과한다. tsc 정합은 Task 2·3에서 회복된다.

- [ ] **Step 1: HistoryChapter.test.tsx를 새 인터페이스 기준으로 재작성 (RED 준비)**

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import { HistoryChapter } from "./HistoryChapter";
import styles from "./HistoryStory.module.css";

afterEach(() => vi.unstubAllGlobals());

// Reveal reduced 경로 — IO 미등록으로 즉시 표시
const reduced = () => vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));

describe("HistoryChapter (챕터 그리드)", () => {
  const item = HISTORY.items[0];

  it("연도·제목·설명·세부·의의를 렌더한다", () => {
    reduced();
    render(
      <ol>
        <HistoryChapter item={item} index={0} />
      </ol>,
    );
    expect(screen.getByText(item.year)).toBeDefined();
    expect(screen.getByText(item.text)).toBeDefined();
    expect(screen.getByText(item.desc)).toBeDefined();
    expect(screen.getByText(item.significance)).toBeDefined();
    for (const d of item.details) expect(screen.getByText(d)).toBeDefined();
  });

  it("챕터 번호를 2자리 장식(aria-hidden)으로 렌더한다", () => {
    reduced();
    render(
      <ol>
        <HistoryChapter item={item} index={0} />
      </ol>,
    );
    expect(screen.getByText("01").getAttribute("aria-hidden")).toBe("true");
  });

  it("홀수 index는 미러, dark는 다크 변형 클래스를 얻는다", () => {
    reduced();
    const { container } = render(
      <ol>
        <HistoryChapter item={HISTORY.items[0]} index={0} />
        <HistoryChapter item={HISTORY.items[1]} index={1} />
        <HistoryChapter item={HISTORY.items[2]} index={2} dark />
      </ol>,
    );
    const chapters = container.querySelectorAll(`.${styles.chapter}`);
    expect(chapters.length).toBe(3);
    expect(chapters[0].classList.contains(styles.mirrored)).toBe(false);
    expect(chapters[1].classList.contains(styles.mirrored)).toBe(true);
    expect(chapters[0].classList.contains(styles.dark)).toBe(false);
    expect(chapters[2].classList.contains(styles.dark)).toBe(true);
  });

  it("사진을 alt=''로 렌더하고 헤딩 aria-labelledby를 연결한다", () => {
    reduced();
    const { container } = render(
      <ol>
        <HistoryChapter item={item} index={0} />
      </ol>,
    );
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
    const li = container.querySelector("li[id]");
    expect(li?.getAttribute("aria-labelledby")).toBe(`${item.id}-h`);
    expect(container.querySelector(`[id="${item.id}-h"]`)).not.toBeNull();
  });
});
```

- [ ] **Step 2: RED 확인**

Run: `npx vitest run src/components/history/HistoryChapter.test.tsx`
Expected: FAIL — "01" 텍스트 부재, `styles.chapter` 셀렉터 매치 0개 (구 컴포넌트에는 번호·chapter 클래스가 없다)

- [ ] **Step 3: HistoryStory.module.css 전체 재작성**

파일 내용 전체를 아래로 교체:

```css
/* 연혁 — 에디토리얼 챕터 그리드(카카오 지속가능성 재해석, 스펙 2026-07-05 §3).
 * 셀 구분선 = 컨테이너 배경(헤어라인색) + gap 1px 트릭: 셀별 보더 방향 관리 없이
 * 미러·모바일 스택에서 구분선이 자동 정합된다. 다크 챕터는 비치는 배경만 on-dark
 * 헤어라인(rgba — 다크 밴드 내부 전용, DESIGN 구현 노트 3)으로 교체. */

/* 히어로 — 중앙 정렬. word-break: keep-all로 한글 단어 중간 줄바꿈 방지. */
.hero { padding-block: var(--spacing-section); text-align: center; word-break: keep-all; }
.heroHead { margin-top: var(--spacing-sm); margin-inline: auto; max-width: var(--container-narrow); }

/* 챕터 목록 */
.timeline { padding-block: var(--spacing-section); }
.cards { display: flex; flex-direction: column; gap: var(--spacing-xl); list-style: none; word-break: keep-all; }
.card { scroll-margin-top: calc(var(--spacing-nav) + var(--spacing-lg)); }

/* 챕터 그리드 — 모바일: 세로 스택(번호 → 연도·제목 → 사진 → 본문) */
.chapter {
  display: grid;
  gap: 1px;
  background: var(--color-hairline);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-xl);
  overflow: hidden;
  grid-template-areas: "num" "title" "media" "body";
}
.cell { background: var(--color-canvas); padding: var(--spacing-lg); }
.numCell { grid-area: num; }
.titleCell { grid-area: title; display: flex; flex-direction: column; justify-content: flex-end; gap: var(--spacing-xs); }
.mediaCell { grid-area: media; padding: 0; aspect-ratio: 16 / 9; }
.mediaCell :global(img),
.mediaCell :global(video) { width: 100%; height: 100%; object-fit: cover; display: block; }
/* 데스크톱 2행의 번호 열 자리 맞춤용 빈 셀 — 모바일 스택에선 숨김 */
.spacerCell { grid-area: spacer; display: none; }
.bodyCell { grid-area: body; }
.bodyDetails { display: flex; flex-direction: column; gap: var(--spacing-xs); margin-top: var(--spacing-sm); padding-left: var(--spacing-lg); list-style: disc; }
.bodySig { margin-top: var(--spacing-sm); border-left: 3px solid var(--color-primary); padding-left: var(--spacing-base); }

/* 다크 챕터(마지막) — 셀 배경·구분선만 반전, 구조 동일(스펙 §3.3) */
.dark { background: rgba(255, 255, 255, 0.16); border-color: var(--color-surface-dark); }
.dark .cell { background: var(--color-surface-dark); }

@media (min-width: 1024px) {
  /* 1행 [번호|연도·제목|사진] + 2행 [자리맞춤|본문(2열 스팬)] */
  .chapter {
    grid-template-columns: 1.1fr 2fr 2.4fr;
    grid-template-areas:
      "num    title media"
      "spacer body  body";
  }
  /* 짝수 번째 챕터(0기준 홀수 index) 좌우 반전 — 지그재그. DOM 순서는 그대로. */
  .mirrored {
    grid-template-columns: 2.4fr 2fr 1.1fr;
    grid-template-areas:
      "media title num"
      "body  body  spacer";
  }
  .mirrored .numCell { text-align: right; }
  .spacerCell { display: block; }
  /* 1행 최소 높이 확보(스펙 §3.2) — 사진이 행 높이를 채우도록 비율 대신 min-height */
  .mediaCell { aspect-ratio: auto; min-height: 16rem; }
}
```

- [ ] **Step 4: HistoryChapter.tsx 전체 재작성**

```tsx
"use client";

import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Reveal } from "@/components/main/Reveal";
import { HistoryMedia } from "./HistoryMedia";
import styles from "./HistoryStory.module.css";
import type { HistoryItem } from "@/constants/content";

export interface HistoryChapterProps {
  item: HistoryItem;
  index: number; // 0기준 — 챕터 번호(01~)·미러 방향 파생
  dark?: boolean; // 마지막 챕터 다크 밴드(스펙 §3.3)
}

// 챕터 그리드(카카오 지속가능성 재해석, 스펙 §3.2). 번호는 장식(aria-hidden) — 순서 의미는 연도가 담당.
// 미러는 grid-template-areas만 뒤집고 DOM 순서는 유지해 읽기 순서를 보존한다.
export function HistoryChapter({ item, index, dark = false }: HistoryChapterProps) {
  const headingId = `${item.id}-h`;
  const num = String(index + 1).padStart(2, "0");
  const mirrored = index % 2 === 1;
  return (
    <li id={item.id} aria-labelledby={headingId} className={styles.card}>
      <Reveal>
        <div className={cn(styles.chapter, mirrored && styles.mirrored, dark && styles.dark)}>
          <div className={cn(styles.cell, styles.numCell)}>
            <span aria-hidden="true" className={cn(typo.displayXl, dark ? "text-on-dark" : "text-ink")}>
              {num}
            </span>
          </div>
          <div className={cn(styles.cell, styles.titleCell)}>
            <p className={cn(typo.datetime, dark ? "text-on-dark-soft" : "text-primary")}>{item.year}</p>
            <h2 id={headingId} className={cn(typo.displayMd, dark ? "text-on-dark" : "text-ink")}>
              {item.text}
            </h2>
          </div>
          <div className={cn(styles.cell, styles.mediaCell)}>
            {item.media ? <HistoryMedia media={item.media} priority={index === 0} /> : null}
          </div>
          <div className={cn(styles.cell, styles.spacerCell)} aria-hidden="true" />
          <div className={cn(styles.cell, styles.bodyCell)}>
            <p className={cn(typo.bodyLg, dark ? "text-on-dark-soft" : "text-body")}>{item.desc}</p>
            <ul className={styles.bodyDetails}>
              {item.details.map((d) => (
                <li key={d} className={cn(typo.bodyLg, dark ? "text-on-dark-soft" : "text-body")}>
                  {d}
                </li>
              ))}
            </ul>
            <p className={cn(typo.bodyLg, dark ? "text-on-dark" : "text-ink", styles.bodySig)}>
              {item.significance}
            </p>
          </div>
        </div>
      </Reveal>
    </li>
  );
}
```

- [ ] **Step 5: GREEN 확인**

Run: `npx vitest run src/components/history/HistoryChapter.test.tsx`
Expected: PASS (4 tests)

커밋은 아직 하지 않는다(Task 3에서 기능 단위로 1회).

---

### Task 2: HistoryStory 단순화 (aside·스크롤 엔진 제거)

**Files:**
- Modify(전체 재작성): `src/components/history/HistoryStory.tsx`
- Test(전체 재작성): `src/components/history/HistoryStory.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `HistoryChapter({ item, index, dark? })`, CSS 클래스 `hero`·`heroHead`·`timeline`·`cards`, `Container({ as?, className, children })`, `Reveal`, `typo`, `cn`, `HistoryContent`
- Produces: `HistoryStory({ content: HistoryContent })` — 기존과 동일 시그니처(페이지 `page.tsx` 무변경)

- [ ] **Step 1: HistoryStory.test.tsx를 그리드 기준으로 재작성 (RED 준비)**

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import { HistoryStory } from "./HistoryStory";
import styles from "./HistoryStory.module.css";

afterEach(() => vi.unstubAllGlobals());

const reduced = () => vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));

describe("HistoryStory (에디토리얼 챕터 그리드)", () => {
  it("제목 h1·intro와 모든 시대 챕터를 렌더한다", () => {
    reduced();
    const { container } = render(<HistoryStory content={HISTORY} />);
    expect(container.querySelector("h1")?.textContent).toBe(HISTORY.title);
    expect(screen.getByText(HISTORY.intro)).toBeDefined();
    expect(container.querySelectorAll("ol > li").length).toBe(HISTORY.items.length);
    for (const item of HISTORY.items) {
      expect(screen.getAllByText(item.text).length).toBeGreaterThan(0);
    }
  });

  it("좌측 sticky aside를 렌더하지 않는다(그리드 전면 개편)", () => {
    reduced();
    const { container } = render(<HistoryStory content={HISTORY} />);
    expect(container.querySelector("aside")).toBeNull();
  });

  it("마지막 챕터만 다크 변형이다", () => {
    reduced();
    const { container } = render(<HistoryStory content={HISTORY} />);
    expect(container.querySelectorAll(`.${styles.dark}`).length).toBe(1);
    const chapters = container.querySelectorAll(`.${styles.chapter}`);
    expect(chapters.length).toBe(HISTORY.items.length);
    expect(chapters[chapters.length - 1].classList.contains(styles.dark)).toBe(true);
  });
});
```

- [ ] **Step 2: RED 확인**

Run: `npx vitest run src/components/history/HistoryStory.test.tsx`
Expected: FAIL — 구 컴포넌트에 aside가 존재하고 다크 챕터가 0개

- [ ] **Step 3: HistoryStory.tsx 전체 재작성**

```tsx
"use client";

import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { HistoryChapter } from "./HistoryChapter";
import styles from "./HistoryStory.module.css";
import type { HistoryContent } from "@/constants/content";

export interface HistoryStoryProps {
  content: HistoryContent;
}

// 연혁 — 에디토리얼 챕터 그리드(카카오 지속가능성 재해석, 스펙 2026-07-05).
// sticky aside·스크롤 엔진 없음: 챕터 <ol> + Reveal 등장만. 마지막 챕터는 다크 밴드.
export function HistoryStory({ content }: HistoryStoryProps) {
  const lastIndex = content.items.length - 1;
  return (
    <>
      {/* 제목 — 고정 히어로가 아니라 흐름의 한 블록. 챕터와 동일한 Reveal로 등장. */}
      <section className={styles.hero}>
        <Container>
          <Reveal>
            <h1 className={cn(typo.displayLg, "text-ink")}>{content.title}</h1>
            <p className={cn(typo.displaySm, "text-muted", styles.heroHead)}>{content.intro}</p>
          </Reveal>
        </Container>
      </section>

      <Container as="section" className={styles.timeline}>
        <ol className={styles.cards}>
          {content.items.map((item, i) => (
            <HistoryChapter key={item.id} item={item} index={i} dark={i === lastIndex} />
          ))}
        </ol>
      </Container>
    </>
  );
}
```

- [ ] **Step 4: GREEN 확인 (history 전체)**

Run: `npx vitest run src/components/history src/app/\(site\)/about/history`
Expected: PASS — HistoryChapter 4 + HistoryStory 3 + page 1. (구 `useHistoryScrollEngine.test.tsx`도 아직 존재·통과 — 삭제는 Task 3)

---

### Task 3: 스크롤 엔진 삭제 + 전체 게이트 + 기능 커밋

**Files:**
- Delete: `src/components/history/useHistoryScrollEngine.ts` (사용자 삭제 승인 완료)
- Delete: `src/components/history/useHistoryScrollEngine.test.tsx` (사용자 삭제 승인 완료)

**Interfaces:**
- Consumes: Task 1·2 완료 상태(엔진 import가 어디에도 없어야 함)
- Produces: 기능 커밋 1개 — Task 4는 이 커밋 위에 문서 커밋을 쌓는다

- [ ] **Step 1: 잔존 참조 확인 후 삭제**

Run: `grep -rn "useHistoryScrollEngine" src/`
Expected: 정의 파일 2개 외 매치 0건 (매치가 있으면 Task 2가 미완 — 중단하고 원인 확인)

Run: `rm src/components/history/useHistoryScrollEngine.ts src/components/history/useHistoryScrollEngine.test.tsx`

- [ ] **Step 2: 전체 게이트**

Run: `pnpm lint`
Expected: 에러 0

Run: `npx tsc --noEmit`
Expected: 에러 0 (lint는 타입체크를 안 하므로 별도 실행 필수)

Run: `pnpm test`
Expected: Global Constraints의 기존 실패 8건(SymbolismList·VisionHero·HeroHeaderSync·photos) 외 실패 0건. history 관련 테스트 전부 통과

- [ ] **Step 3: 기능 커밋**

```bash
git add src/components/history/
git commit -m "feat : 연혁 에디토리얼 챕터 그리드 개편 및 스크롤 엔진 제거 #86"
```

---

### Task 4: DESIGN.md 등록 + 스펙 정정 + 문서 커밋

**Files:**
- Modify: `.claude/rules/DESIGN.md` — `### 연출` 구획의 `history-band` 항목 **바로 아래**에 1개 항목 추가
- Modify: `docs/superpowers/specs/2026-07-05-history-editorial-grid-design.md` — 구현 확정 반영 2건

**Interfaces:**
- Consumes: Task 3까지의 구현 확정 사항
- Produces: 없음(문서 정합만)

- [ ] **Step 1: DESIGN.md 연출 구획에 항목 추가**

`- **\`history-band\`**: …` 항목 다음 줄에 아래 항목을 삽입:

```markdown
- **`history-editorial-grid`**: 연혁 페이지(`/about/history`) 챕터 그리드(참조: 카카오 지속가능성).
  챕터 = 외곽 `{rounded.xl}` + 1px `{colors.hairline}`, 내부 셀 구분선은 "컨테이너 배경+gap 1px" 트릭.
  대형 챕터 번호(`{typography.display-xl}`·aria-hidden) + 연도(`{typography.datetime}` primary) + 제목 +
  사진(`HistoryMedia`) + 본문 셀, 챕터마다 좌우 미러(지그재그, DOM 순서 유지). 마지막 챕터는
  `{colors.surface-dark}` 다크 밴드(내부 구분선만 on-dark rgba 예외). 도트 픽셀 장식·추가 스크롤
  연출은 채택하지 않음(단일 액센트·절제). 등장은 `Reveal` 재사용, 모바일은 세로 스택.
```

- [ ] **Step 2: 스펙 문서 정정 2건 (구현 확정 반영)**

`docs/superpowers/specs/2026-07-05-history-editorial-grid-design.md`에서:

정정 1 — §3.2 마지막 사진 셀 문장 교체:

```
변경 전: 미디어 없는 항목은 사진 셀 자체를 생략하고 연도·제목 셀이 잔여 폭 차지
변경 후: 미디어 없는 항목은 사진 셀을 빈 셀(캔버스 배경)로 유지한다(grid-template-areas 고정 — 셀 생략 시 헤어라인 배경이 노출되는 것을 방지)
```

정정 2 — §3.4 모바일 스택 순서 표현 교체:

```
변경 전: `[번호·연도 행] → [제목] → [사진] → [본문]`
변경 후: `[번호] → [연도·제목] → [사진] → [본문]` (연도·제목은 데스크톱과 동일 셀 — 셀 분해 없이 스택 전환만)
```

- [ ] **Step 3: 문서 커밋**

```bash
git add .claude/rules/DESIGN.md docs/superpowers/specs/2026-07-05-history-editorial-grid-design.md docs/superpowers/plans/2026-07-05-history-editorial-grid.md
git commit -m "docs : DESIGN.md history-editorial-grid 등록, 구현 계획 및 스펙 정정 #86"
```

---

### Task 5: 수동 검증 (체크포인트 — 사람 확인)

**Files:** 없음(검증만)

- [ ] **Step 1: dev 서버로 페이지 확인**

Run: `pnpm dev` 후 `http://localhost:3000/about/history` 접속

데스크톱(≥1024px) 확인 항목:
- 챕터 01·03·05·07 = `[번호|연도·제목|사진]`, 02·04·06 = 좌우 미러(지그재그)
- 셀 사이 1px 헤어라인 구분선, 외곽 24px 라운드
- 마지막 07 챕터만 다크 밴드(검정 배경 + 흰 텍스트, 내부 구분선 은은한 흰색)
- 스크롤 시 챕터별 Reveal(fade+slide-up) 등장

모바일(<1024px, 개발자도구 반응형) 확인 항목:
- 챕터가 세로 스택(번호 → 연도·제목 → 사진 → 본문), 미러 없음
- 사진 16:9 비율 유지

- [ ] **Step 2: 앵커 확인**

`http://localhost:3000/about/history#2021` 접속 → 2021 챕터가 헤더에 가리지 않고 스크롤 위치 잡히는지(scroll-margin-top)

- [ ] **Step 3: 프로덕션 빌드 확인**

Run: `pnpm build`
Expected: 빌드 성공(타입·lint 에러 0)
