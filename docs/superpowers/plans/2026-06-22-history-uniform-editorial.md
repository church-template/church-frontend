# 연혁 균일 에디토리얼 복구 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 연혁 페이지의 풀스크린 축소 히어로(`HistoryHero`)를 폐기하고, "연혁" 제목을 시대 카드와 동일한 Reveal로 등장시키는 균일 에디토리얼(데스크톱 2단)로 복구한다.

**Architecture:** `HistoryStory.tsx`의 히어로 분기를 제거하고 텍스트 제목 섹션을 단일 기본 경로로 승격한다(의미구조 `h1=연혁` + 리드 `p=intro`). 데스크톱 2단(좌 sticky 현재 시대 사진 / 우 카드 스택)과 `useHistoryScrollEngine`은 그대로 유지한다. 폐기된 히어로와 이전 이터레이션의 고아 모듈 5묶음을 삭제한다.

**Tech Stack:** Next.js(App Router) · TypeScript · Tailwind v4 · CSS Modules · vitest(globals:false) · @testing-library/react · Playwright(시각 검증).

## Global Constraints

각 태스크의 요구사항은 아래를 암묵적으로 포함한다(스펙 §8 / CLAUDE.md / DESIGN.md에서 그대로 옮김).

- 인라인 hex/px/z 금지 — 색·크기·간격·z는 토큰만. arbitrary value(`bg-[#...]`) 금지.
- 텍스트 스타일은 `typo.*` 의미 상수만. 폰트 크기/굵기/행간 직접 작성 금지.
- 아이콘은 `lucide-react`만. UI 이모지 금지.
- JSX 조건부 렌더링은 삼항(`{cond ? <X/> : null}`). `{cond && <X/>}` 금지.
- 주석은 한국어, WHY 중심, 주변 스타일에 맞춘다.
- 콘텐츠 하드코딩 금지 — 사용자 노출 텍스트는 `HISTORY`(`src/constants/content.ts`) 상수에서 주입.
- 테스트: vitest globals:false → `import { describe, it, expect, vi, afterEach } from "vitest"`. jest-dom 없음 → `toBeDefined()`/`querySelector`/`getAttribute`로 단언(`toBeInTheDocument` 금지).
- 커밋·푸시는 **명시 요청 시에만**. 커밋 메시지 끝에 이슈 태그 `#64` 필수, 형식 `<type> : <설명> #64`, **Co-Authored-By 금지**. 파일 삭제는 승인 완료됨.
- 검증 명령: `pnpm exec tsc --noEmit` · `pnpm exec vitest run` · `pnpm lint`.

**현 디스크 베이스라인(2026-06-22 측정):** `HistoryStory.test.tsx` 2개 실패(`mq.addEventListener is not a function` — HistoryHero→useMediaFlag 경로). 나머지 history 테스트 9파일 통과. Task 1 리팩터가 이 실패를 GREEN으로 전환한다.

---

### Task 1: HistoryStory를 균일 에디토리얼로 전환 (히어로 분기 제거 + 제목 의미구조 정정)

**Files:**
- Modify: `src/components/history/HistoryStory.tsx`
- Test: `src/components/history/HistoryStory.test.tsx`

**Interfaces:**
- Consumes: `HISTORY: HistoryContent`(`{ title: string; intro: string; items: HistoryItem[] }`), `Reveal`(`@/components/main/Reveal`), `Container`(`@/components/shell/Container`), `HistoryMedia`, `HistoryChapter`, `useHistoryScrollEngine(cardsRef): number`, `typo.*`(`@/constants/typography`).
- Produces: `HistoryStory({ content }: { content: HistoryContent })` — 더 이상 `HistoryHero`/`@/hero/scrub`/`useMediaFlag`를 사용하지 않는다.

- [ ] **Step 1: 새 계약으로 테스트 갱신 (RED 작성)**

`src/components/history/HistoryStory.test.tsx` 전체를 아래로 교체한다.

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import { HistoryStory } from "./HistoryStory";

afterEach(() => vi.unstubAllGlobals());

describe("HistoryStory", () => {
  it("제목 '연혁'을 h1로, intro와 모든 시대 카드를 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true }))); // Reveal reduced 경로
    const { container } = render(<HistoryStory content={HISTORY} />);
    expect(container.querySelector("h1")?.textContent).toBe(HISTORY.title); // "연혁"
    expect(screen.getByText(HISTORY.intro)).toBeDefined();
    for (const item of HISTORY.items) {
      // 활성 시대 제목은 좌측 aside엔 없고(사진만) 우측 카드에서 1개 이상 확인.
      expect(screen.getAllByText(item.text).length).toBeGreaterThan(0);
    }
  });

  it("폐기된 고정 히어로(풀스크린 오버레이)를 렌더하지 않는다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<HistoryStory content={HISTORY} />);
    // HistoryHero 오버레이 마커(#history-hero-title) 부재 = 히어로 제거 검증.
    expect(container.querySelector("#history-hero-title")).toBeNull();
  });

  it("좌측 aside는 활성 시대 사진만 렌더한다(라벨·연도 없음)", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<HistoryStory content={HISTORY} />);
    const aside = container.querySelector("aside");
    expect(aside).not.toBeNull();
    expect(aside?.querySelector("img")).not.toBeNull(); // 사진
    expect((aside?.textContent ?? "").trim()).toBe(""); // 텍스트 없음
  });
});
```

- [ ] **Step 2: 테스트 실패 확인 (RED)**

Run: `pnpm exec vitest run src/components/history/HistoryStory.test.tsx`
Expected: FAIL — 현재 `HistoryStory`가 `HistoryHero`(→`useMediaFlag`)를 렌더하므로 `mq.addEventListener is not a function`로 3개 테스트 모두 에러/실패.

- [ ] **Step 3: HistoryStory 리팩터 (GREEN 구현)**

`src/components/history/HistoryStory.tsx` 전체를 아래로 교체한다.

```tsx
"use client";

import { useRef } from "react";
import styles from "./HistoryStory.module.css";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { HistoryMedia } from "./HistoryMedia";
import { HistoryChapter } from "./HistoryChapter";
import { useHistoryScrollEngine } from "./useHistoryScrollEngine";
import type { HistoryContent } from "@/constants/content";

export interface HistoryStoryProps {
  content: HistoryContent;
}

// 연혁 — 차분한 에디토리얼 스크롤(당근 컬처 참고). 제목·시대 모두 동일 Reveal 등장(특별취급 히어로 없음).
// 데스크톱 2단: 좌 sticky 현재 시대 사진 / 우 카드 스택. active = 뷰포트 중앙 최근접 카드.
export function HistoryStory({ content }: HistoryStoryProps) {
  const cardsRef = useRef<(HTMLElement | null)[]>([]);
  const active = useHistoryScrollEngine(cardsRef);
  const activeItem = content.items[active] ?? content.items[0];

  return (
    <>
      {/* 제목 — 고정 히어로가 아니라 흐름의 한 블록. 시대 카드와 동일한 Reveal로 등장. */}
      <section className={styles.hero}>
        <Container>
          <Reveal>
            <h1 className={cn(typo.displayLg, "text-ink")}>{content.title}</h1>
            <p className={cn(typo.displaySm, "text-muted", styles.heroHead)}>{content.intro}</p>
          </Reveal>
        </Container>
      </section>

      <Container as="section" className={styles.timeline}>
        {/* 좌측 sticky — 현재 시대 사진만(라벨·연도 제거, 의미는 우측 카드가 담당) */}
        <aside className={styles.aside} aria-hidden="true">
          <div className={styles.asideMedia}>
            {activeItem.media ? <HistoryMedia media={activeItem.media} priority /> : null}
          </div>
        </aside>

        {/* 우측 카드 스택 */}
        <ol className={styles.cards}>
          {content.items.map((item, i) => (
            <HistoryChapter
              key={item.id}
              item={item}
              ref={(el) => {
                cardsRef.current[i] = el;
              }}
            />
          ))}
        </ol>
      </Container>
    </>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인 (GREEN)**

Run: `pnpm exec vitest run src/components/history/HistoryStory.test.tsx`
Expected: PASS — 3개 테스트 모두 통과(`HistoryStory`가 더 이상 `useMediaFlag`를 마운트하지 않음).

- [ ] **Step 5: 타입·린트 확인**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: 에러 없음. `HistoryHero` 파일은 아직 디스크에 남아 있으나 어디서도 import하지 않으므로 통과(미사용 파일은 ESLint 오류 아님).

> 커밋은 하지 않는다(Task 4에서 사용자 요청 시 일괄). 

---

### Task 2: 폐기/고아 파일 5묶음 삭제 + 잔여 참조 검증

**Files (삭제 — 승인 완료):**
- Delete: `src/components/history/HistoryHero.tsx`
- Delete: `src/components/history/HistoryHero.module.css`
- Delete: `src/components/history/HistoryHero.test.tsx`
- Delete: `src/components/history/historyScrub.ts`
- Delete: `src/components/history/historyScrub.test.ts`
- Delete: `src/components/history/HistoryYearRail.tsx`
- Delete: `src/components/history/HistoryYearRail.test.tsx`
- Delete: `src/components/history/tone.ts`
- Delete: `src/components/history/tone.test.ts`
- Delete: `src/components/history/HistoryIntro.tsx`
- Delete: `src/components/history/HistoryIntro.test.tsx`

**Interfaces:**
- Consumes: 없음(삭제 작업).
- Produces: 없음. 삭제 후 `src/components/history/`에는 `HistoryStory`·`HistoryChapter`·`HistoryMedia`·`useHistoryScrollEngine`(+각 테스트)·`HistoryStory.module.css`만 남는다.

- [ ] **Step 1: 잔여 참조 사전 검증**

Run:
```bash
cd /Users/luca/workspace/NextJs_Project/church-frontend
grep -rn "HistoryHero\|historyScrub\|HistoryYearRail\|HistoryIntro\|from \"./tone\"\|history/tone" src --include="*.tsx" --include="*.ts" | grep -v "src/components/history/HistoryHero\.\|src/components/history/historyScrub\.\|src/components/history/HistoryYearRail\.\|src/components/history/HistoryIntro\.\|src/components/history/tone\."
```
Expected: 출력 없음(0줄). (주의: `MinistryCards.tsx`/`HistoryBand.tsx`의 `const tone = ...`은 지역 변수일 뿐 history `tone.ts` import이 아니므로 `from "./tone"` 패턴으로만 매칭 — 위 grep에 안 잡힘이 정상.)

- [ ] **Step 2: 파일 삭제**

> 사전 정리: 브랜치가 `a29b779`로 soft-reset된 상태라 아래 11개 파일은 **모두 미커밋(HEAD에 없음)**이다. 따라서 `git rm`이 아니라 일반 `rm -f`로 삭제하고, 인덱스 동기화는 커밋 시점(Task 4)의 `git add -A`가 처리한다.

Run:
```bash
cd /Users/luca/workspace/NextJs_Project/church-frontend
rm -f src/components/history/HistoryHero.tsx \
      src/components/history/HistoryHero.module.css \
      src/components/history/HistoryHero.test.tsx \
      src/components/history/historyScrub.ts \
      src/components/history/historyScrub.test.ts \
      src/components/history/HistoryYearRail.tsx \
      src/components/history/HistoryYearRail.test.tsx \
      src/components/history/tone.ts \
      src/components/history/tone.test.ts \
      src/components/history/HistoryIntro.tsx \
      src/components/history/HistoryIntro.test.tsx
```
Expected: 11개 파일이 디스크에서 제거됨. 커밋은 Task 4에서 진행.

- [ ] **Step 3: 타입·린트·전체 테스트 통과 확인**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm exec vitest run`
Expected: 전부 통과. 삭제된 모듈의 테스트는 사라지고, 잔여 참조로 인한 컴파일 오류 없음.

---

### Task 3: 시각 검증 (Playwright) + 최종 전체 검증

**Files:** 없음(검증 전용).

- [ ] **Step 1: 개발 서버 기동(백그라운드)**

Run: `pnpm dev` (백그라운드 실행). 포트(기본 3000) 확인 후 다음 단계.

- [ ] **Step 2: 데스크톱 시각 검증**

Playwright로 viewport 1280×800, `http://localhost:3000/about/history` 접속.
- 상단 스크린샷: 풀스크린 히어로 없음 / "연혁" 제목 + intro가 일반 흐름 블록으로 보임.
- 아래로 스크롤하며 스크린샷: 좌측 sticky 사진이 우측 활성 시대에 맞춰 교체, 우측 카드가 Reveal로 등장.
Expected: 첫 시대 특별취급 없음. 2단 레이아웃 정상.

- [ ] **Step 3: 모바일 시각 검증**

Playwright로 viewport 390×844, 같은 URL 접속·스크롤.
Expected: 단일 컬럼, 시대마다 자기 사진(`.cardMedia`) 노출, 좌측 aside 숨김. h1 "연혁" 가시.

- [ ] **Step 4: 최종 전체 검증**

Run: `pnpm exec tsc --noEmit && pnpm exec vitest run && pnpm lint`
Expected: 3개 모두 통과. (인수 기준 §10 충족.)

---

### Task 4: 커밋 (사용자가 명시 요청 시에만)

**Files:** 없음(기능별 단일 커밋).

- [ ] **Step 1: 사용자에게 커밋 의사 확인**

프로젝트 규칙상 커밋은 명시 요청 시에만. 사용자가 "커밋해줘"라고 하면 진행, 아니면 이 태스크는 건너뛴다.

- [ ] **Step 2: 기능별 단일 커밋**

Run:
```bash
cd /Users/luca/workspace/NextJs_Project/church-frontend
git add src/components/history/ docs/superpowers/specs/2026-06-22-history-uniform-editorial-design.md docs/superpowers/plans/2026-06-22-history-uniform-editorial.md
git commit -m "refactor : 연혁 풀스크린 히어로 폐기·균일 에디토리얼 복구(제목 스크롤 등장) #64"
```
Expected: 리팩터·삭제·문서가 한 커밋으로 기록. Co-Authored-By 태그 없음.

---

## Self-Review

**1. Spec coverage (스펙 §1~§10 → 태스크 매핑):**
- §2 구조(히어로 분기 제거, 제목 섹션 승격) → Task 1 Step 3.
- §3 제목 의미구조 정정(h1=연혁 + 리드 p, displayLg/displaySm, container-narrow) → Task 1 Step 3(`.heroHead`가 container-narrow max-width 제공).
- §3 결정(스크롤 여백 없음, 즉시 Reveal) → Task 1 Step 3(제목을 페이지 최상단 Reveal 블록으로 둠) + Task 3 시각 검증.
- §4 타임라인 유지 → Task 1 Step 3(2단·aside·useHistoryScrollEngine 보존).
- §5 반응형/폴백 → Task 3 Step 2~3 시각 검증(기존 CSS 미변경).
- §6 삭제 5묶음 → Task 2.
- §7 유지 파일 → Task 1·2에서 보존.
- §9 테스트 → Task 1 Step 1.
- §10 인수 기준 → Task 3.
- 갭 없음.

**2. Placeholder scan:** TBD/TODO/“적절히 처리” 없음. 모든 코드/명령 실체 기재.

**3. Type consistency:** `HistoryStory({ content }: HistoryStoryProps)` 시그니처·`useHistoryScrollEngine(cardsRef): number`·`HISTORY.title/intro/items` 사용이 Task 전반에서 일치. 삭제 모듈은 어디서도 참조하지 않음(Task 2 Step 1로 보장).
