# 마크다운 에디터 서식 툴바·도움말 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마크다운을 모르는 관리자가 클릭만으로 본문 서식을 적용하고, 화면 안에서 사용법을 볼 수 있게 한다.

**Architecture:** 모든 확장은 `MarkdownEditor` 내부에서 끝난다(사용처 6개 폼 무변경). 서식 적용은 DOM 없는 순수 함수(`lib/markdownEditing`)로 분리하고, 툴바(`MarkdownToolbar`)가 textarea 선택 범위를 읽어 결과를 반영한다. 링크·유튜브는 주소 입력 Dialog, 이미지는 기존 `MediaPicker` 재사용, 도움말은 치트시트 Dialog(`MarkdownContent` 재사용).

**Tech Stack:** React 19 client component, Radix Dialog/Tabs 재스킨, lucide-react, vitest + @testing-library/react. 신규 라이브러리 없음.

**Spec:** `docs/superpowers/specs/2026-07-20-markdown-editor-toolbar-design.md`

## Global Constraints

- 이슈 번호: **#106** — 모든 커밋 메시지는 `<type> : <설명> #106` 형식. Co-Authored-By 금지, push 금지.
- 패키지 매니저 **pnpm**. 테스트 `pnpm test`(vitest run), 린트 `pnpm lint`, 타입체크 `npx tsc --noEmit`(lint는 타입체크 안 함).
- 신규 라이브러리 추가 금지(가이드 15.1). 아이콘은 lucide-react만, 색은 `currentColor`.
- hex·px 인라인 금지 — 토큰 유틸(`bg-surface-soft`·`gap-xxs` 등)과 `typo.*`(`src/constants/typography.ts`)만 사용.
- UI 이모지 금지. JSX 조건부 렌더링은 삼항(`{cond ? <X/> : null}`) — `{cond && <X/>}` 금지.
- 주석은 한국어, WHY 중심. 답변·문서 한국어.
- 테스트 관례: vitest `globals: false` — `import { describe, it, expect, vi } from "vitest"` 명시. jest-dom 없음(`toBeDefined()`/`getAttribute` 사용). mock은 엘리먼트 반환.
- jsdom에는 `document.execCommand`가 없다(확인됨) → 테스트는 항상 상태 교체 폴백 경로를 탄다.
- lucide-react에 `Youtube` 아이콘은 없다(확인됨) — 유튜브 버튼은 `SquarePlay` 사용. `Heading1~3`·`Bold`·`Italic`·`Strikethrough`·`List`·`ListOrdered`·`Quote`·`Minus`·`Table`·`Link`·`ImagePlus`·`CircleHelp`·`SquarePlay`와 `LucideIcon` 타입 export는 존재 확인됨.

---

### Task 1: 서식 적용 순수 로직 `markdownEditing`

**Files:**
- Create: `src/lib/markdownEditing.ts`
- Test: `src/lib/markdownEditing.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 문자열 로직)
- Produces (Task 2~4가 사용):
  - `interface EditResult { text: string; selStart: number; selEnd: number }`
  - `type InlineAction = "bold" | "italic" | "strike"`
  - `type LineAction = "h1" | "h2" | "h3" | "ul" | "ol" | "quote"`
  - `applyInline(text: string, selStart: number, selEnd: number, action: InlineAction): EditResult`
  - `applyLine(text: string, selStart: number, selEnd: number, action: LineAction): EditResult`
  - `insertInline(text: string, selStart: number, selEnd: number, snippet: string): EditResult`
  - `insertBlock(text: string, selStart: number, selEnd: number, block: string): EditResult`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/markdownEditing.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { applyInline, applyLine, insertInline, insertBlock } from "./markdownEditing";

describe("applyInline", () => {
  it("선택 영역을 마커로 감싼다", () => {
    expect(applyInline("안녕 교회", 3, 5, "bold")).toEqual({
      text: "안녕 **교회**",
      selStart: 5,
      selEnd: 7,
    });
  });

  it("선택이 없으면 자리표시 문구를 넣고 문구만 선택한다", () => {
    expect(applyInline("", 0, 0, "bold")).toEqual({
      text: "**굵은 글씨**",
      selStart: 2,
      selEnd: 7,
    });
  });

  it("기울임·취소선 자리표시 문구", () => {
    expect(applyInline("", 0, 0, "italic").text).toBe("*기울인 글씨*");
    expect(applyInline("", 0, 0, "strike").text).toBe("~~지운 글씨~~");
  });

  it("이미 감싸진 선택은 해제한다(토글)", () => {
    expect(applyInline("**교회**", 2, 4, "bold")).toEqual({
      text: "교회",
      selStart: 0,
      selEnd: 2,
    });
  });

  it("마커까지 통째로 선택해도 해제한다", () => {
    expect(applyInline("**교회**", 0, 6, "bold")).toEqual({
      text: "교회",
      selStart: 0,
      selEnd: 2,
    });
  });

  it("굵게 안에서 기울임을 누르면 겹쳐 적용된다(***)", () => {
    expect(applyInline("**교회**", 2, 4, "italic").text).toBe("***교회***");
  });
});

describe("applyLine", () => {
  it("줄 앞에 제목 접두를 붙이고 줄 전체를 선택한다", () => {
    expect(applyLine("환영합니다", 2, 2, "h2")).toEqual({
      text: "## 환영합니다",
      selStart: 0,
      selEnd: 8,
    });
  });

  it("제목 단계를 교체한다", () => {
    expect(applyLine("## 제목", 3, 3, "h3").text).toBe("### 제목");
  });

  it("같은 제목을 다시 누르면 해제한다", () => {
    expect(applyLine("### 제목", 0, 0, "h3").text).toBe("제목");
  });

  it("선택이 걸친 여러 줄에 글머리를 붙이고 빈 줄은 건너뛴다", () => {
    expect(applyLine("가\n\n나", 0, 4, "ul").text).toBe("- 가\n\n- 나");
  });

  it("모든 줄에 이미 글머리가 있으면 전부 해제한다", () => {
    expect(applyLine("- 가\n- 나", 0, 7, "ul").text).toBe("가\n나");
  });

  it("번호 목록은 1부터 차례로 매긴다", () => {
    expect(applyLine("가\n나", 0, 3, "ol").text).toBe("1. 가\n2. 나");
  });

  it("인용 접두를 붙인다", () => {
    expect(applyLine("말씀", 0, 0, "quote").text).toBe("> 말씀");
  });
});

describe("insertInline", () => {
  it("선택을 스니펫으로 교체하고 커서를 뒤에 둔다", () => {
    expect(insertInline("가나다", 1, 2, "[x](y)")).toEqual({
      text: "가[x](y)다",
      selStart: 7,
      selEnd: 7,
    });
  });
});

describe("insertBlock", () => {
  it("본문 중간이면 앞뒤에 빈 줄을 만든다", () => {
    expect(insertBlock("가\n나", 1, 1, "---")).toEqual({
      text: "가\n\n---\n\n나",
      selStart: 6,
      selEnd: 6,
    });
  });

  it("빈 문서면 블록만 넣는다", () => {
    expect(insertBlock("", 0, 0, "---").text).toBe("---");
  });

  it("이미 빈 줄이 있으면 더 추가하지 않는다", () => {
    expect(insertBlock("가\n\n", 3, 3, "---").text).toBe("가\n\n---");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/lib/markdownEditing.test.ts`
Expected: FAIL — `Cannot find module './markdownEditing'` (또는 export 미존재)

- [ ] **Step 3: 구현**

`src/lib/markdownEditing.ts`:

```ts
// 툴바 서식 적용의 순수 로직 — DOM 없이 문자열·선택 범위만 다룬다(테스트 용이성이 분리 이유).
// 모든 함수는 새 문자열과 적용 후 선택 범위를 반환한다(원본 불변).

export interface EditResult {
  text: string;
  selStart: number;
  selEnd: number;
}

export type InlineAction = "bold" | "italic" | "strike";
export type LineAction = "h1" | "h2" | "h3" | "ul" | "ol" | "quote";

const INLINE: Record<InlineAction, { marker: string; placeholder: string }> = {
  bold: { marker: "**", placeholder: "굵은 글씨" },
  italic: { marker: "*", placeholder: "기울인 글씨" },
  strike: { marker: "~~", placeholder: "지운 글씨" },
};

function surrounded(text: string, start: number, end: number, marker: string): boolean {
  return (
    start >= marker.length &&
    text.slice(start - marker.length, start) === marker &&
    text.slice(end, end + marker.length) === marker
  );
}

export function applyInline(
  text: string,
  selStart: number,
  selEnd: number,
  action: InlineAction,
): EditResult {
  const { marker, placeholder } = INLINE[action];
  const sel = text.slice(selStart, selEnd);
  // 기울임(*)이 굵게(**)의 안쪽 별표를 해제로 오인하지 않게 — 그 경우는 감싸기로 진행(*** = 굵은 기울임).
  const wrapped =
    surrounded(text, selStart, selEnd, marker) &&
    !(action === "italic" && surrounded(text, selStart, selEnd, "**"));
  if (wrapped) {
    return {
      text: text.slice(0, selStart - marker.length) + sel + text.slice(selEnd + marker.length),
      selStart: selStart - marker.length,
      selEnd: selEnd - marker.length,
    };
  }
  if (sel.length >= marker.length * 2 && sel.startsWith(marker) && sel.endsWith(marker)) {
    const inner = sel.slice(marker.length, sel.length - marker.length);
    return {
      text: text.slice(0, selStart) + inner + text.slice(selEnd),
      selStart,
      selEnd: selStart + inner.length,
    };
  }
  const content = sel || placeholder;
  return {
    text: text.slice(0, selStart) + marker + content + marker + text.slice(selEnd),
    selStart: selStart + marker.length,
    selEnd: selStart + marker.length + content.length,
  };
}

// has: 이 액션의 접두가 이미 있는지 / strip: 적용 전 걷어낼 기존 접두(제목은 단계 교체를 위해 1~6 전부).
const LINE_RULES: Record<
  LineAction,
  { prefix: (i: number) => string; has: RegExp; strip: RegExp }
> = {
  h1: { prefix: () => "# ", has: /^# /, strip: /^#{1,6} / },
  h2: { prefix: () => "## ", has: /^## /, strip: /^#{1,6} / },
  h3: { prefix: () => "### ", has: /^### /, strip: /^#{1,6} / },
  ul: { prefix: () => "- ", has: /^- /, strip: /^- / },
  ol: { prefix: (i) => `${i + 1}. `, has: /^\d+\. /, strip: /^\d+\. / },
  quote: { prefix: () => "> ", has: /^> /, strip: /^> / },
};

export function applyLine(
  text: string,
  selStart: number,
  selEnd: number,
  action: LineAction,
): EditResult {
  const rule = LINE_RULES[action];
  const lineStart = text.lastIndexOf("\n", selStart - 1) + 1;
  const nextBreak = text.indexOf("\n", selEnd);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  const lines = text.slice(lineStart, lineEnd).split("\n");
  const nonEmpty = lines.filter((l) => l.trim() !== "");
  // 전부 이미 접두가 있으면 해제(토글), 하나라도 없으면 전체 적용(제목은 단계 교체 포함).
  const remove = nonEmpty.length > 0 && nonEmpty.every((l) => rule.has.test(l));
  let n = 0;
  const block = lines
    .map((line) => {
      if (line.trim() === "") return line; // 빈 줄은 접두 대상이 아니다(문단 경계 보존)
      const stripped = line.replace(rule.strip, "");
      return remove ? stripped : rule.prefix(n++) + stripped;
    })
    .join("\n");
  return {
    text: text.slice(0, lineStart) + block + text.slice(lineEnd),
    selStart: lineStart,
    selEnd: lineStart + block.length,
  };
}

export function insertInline(
  text: string,
  selStart: number,
  selEnd: number,
  snippet: string,
): EditResult {
  const caret = selStart + snippet.length;
  return {
    text: text.slice(0, selStart) + snippet + text.slice(selEnd),
    selStart: caret,
    selEnd: caret,
  };
}

// 블록(구분선·표·media·유튜브)은 앞뒤 빈 줄이 있어야 문단으로 선다(유튜브 임베드 분할도 빈 줄 2개 기준).
export function insertBlock(
  text: string,
  selStart: number,
  selEnd: number,
  block: string,
): EditResult {
  const prefix = text.slice(0, selStart);
  const suffix = text.slice(selEnd);
  const before = prefix === "" || prefix.endsWith("\n\n") ? "" : prefix.endsWith("\n") ? "\n" : "\n\n";
  const after = suffix === "" || suffix.startsWith("\n\n") ? "" : suffix.startsWith("\n") ? "\n" : "\n\n";
  const caret = prefix.length + before.length + block.length;
  return {
    text: prefix + before + block + after + suffix,
    selStart: caret,
    selEnd: caret,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/lib/markdownEditing.test.ts`
Expected: PASS (17 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/markdownEditing.ts src/lib/markdownEditing.test.ts
git commit -m "feat : 마크다운 서식 적용 순수 로직(markdownEditing) 추가 #106"
```

---

### Task 2: MarkdownToolbar 기본 서식 버튼 + MarkdownEditor 장착

**Files:**
- Create: `src/components/admin/MarkdownToolbar.tsx`
- Create: `src/components/admin/MarkdownToolbar.test.tsx`
- Modify: `src/components/admin/MarkdownEditor.tsx` (전체 49줄 → 툴바 장착)
- Modify: `src/components/admin/MarkdownEditor.test.tsx` (테스트 1개 추가)

**Interfaces:**
- Consumes: Task 1의 `applyInline`/`applyLine`/`insertBlock`/`EditResult`/`InlineAction`/`LineAction`
- Produces (Task 3~5가 확장):
  - `MarkdownToolbar({ textareaRef, value, onChange }: MarkdownToolbarProps)` — `textareaRef: RefObject<HTMLTextAreaElement | null>`
  - 내부 `commit(result: EditResult): void` — 네이티브 삽입 시도 후 폴백, 포커스·선택 복원
  - 버튼 `aria-label`: "큰 제목"·"중간 제목"·"작은 제목"·"굵게"·"기울임"·"취소선"·"글머리 목록"·"번호 목록"·"인용"·"구분선"·"표"

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/admin/MarkdownToolbar.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownEditor } from "./MarkdownEditor";

// 툴바는 textarea 선택 범위와 한 몸이라 MarkdownEditor를 통째 렌더해 통합 검증한다.
function Editor({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <MarkdownEditor value={value} onChange={setValue} />;
}

function textarea(): HTMLTextAreaElement {
  return screen.getByRole("textbox") as HTMLTextAreaElement;
}

describe("MarkdownToolbar — 기본 서식", () => {
  it("선택 영역을 굵게로 감싼다", () => {
    render(<Editor initial="안녕 교회" />);
    textarea().setSelectionRange(3, 5);
    fireEvent.click(screen.getByRole("button", { name: "굵게" }));
    expect(textarea().value).toBe("안녕 **교회**");
  });

  it("선택이 없으면 자리표시 문구가 들어간다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "굵게" }));
    expect(textarea().value).toBe("**굵은 글씨**");
  });

  it("제목 버튼이 줄 앞에 접두를 붙인다", () => {
    render(<Editor initial="환영합니다" />);
    fireEvent.click(screen.getByRole("button", { name: "중간 제목" }));
    expect(textarea().value).toBe("## 환영합니다");
  });

  it("글머리 목록 버튼이 여러 줄에 접두를 붙인다", () => {
    render(<Editor initial="가\n나" />);
    textarea().setSelectionRange(0, 3);
    fireEvent.click(screen.getByRole("button", { name: "글머리 목록" }));
    expect(textarea().value).toBe("- 가\n- 나");
  });

  it("표 버튼이 표 템플릿을 넣는다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "표" }));
    expect(textarea().value).toBe("| 항목 | 값 |\n| --- | --- |\n|  |  |");
  });

  it("구분선 버튼이 본문 끝에 빈 줄과 함께 들어간다", () => {
    render(<Editor initial="본문" />);
    textarea().setSelectionRange(2, 2);
    fireEvent.click(screen.getByRole("button", { name: "구분선" }));
    expect(textarea().value).toBe("본문\n\n---");
  });
});
```

`src/components/admin/MarkdownEditor.test.tsx` 마지막 `it(...)` 아래에 추가:

```tsx
  it("작성 탭에 서식 툴바를 보인다", () => {
    render(<MarkdownEditor value="" onChange={() => {}} />);
    expect(screen.getByRole("toolbar", { name: "서식 도구" })).toBeDefined();
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/components/admin/MarkdownToolbar.test.tsx src/components/admin/MarkdownEditor.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "button"` / `"toolbar"`

- [ ] **Step 3: MarkdownToolbar 구현**

`src/components/admin/MarkdownToolbar.tsx`:

```tsx
"use client";

import { Fragment, type RefObject } from "react";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Table,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  applyInline,
  applyLine,
  insertBlock,
  type EditResult,
  type InlineAction,
  type LineAction,
} from "@/lib/markdownEditing";

export interface MarkdownToolbarProps {
  /** 삽입 대상 textarea — 선택 범위를 읽고, 적용 후 포커스·커서를 복원한다. */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}

interface ToolButton {
  label: string;
  Icon: LucideIcon;
  run: () => void;
}

const TABLE_TEMPLATE = "| 항목 | 값 |\n| --- | --- |\n|  |  |";

const toolButtonClass = cn(
  "inline-flex size-9 items-center justify-center rounded-sm text-body",
  "transition duration-150 ease-out hover:bg-surface-strong hover:text-ink",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
);

// 실행취소(Ctrl+Z) 보존을 위해 네이티브 삽입을 먼저 시도한다. execCommand는 deprecated지만
// 실패·미지원(jsdom 포함)이면 상태 교체로 폴백하므로 안전하다. 성공하면 input 이벤트가 React onChange로 전파된다.
function tryNativeInsert(ta: HTMLTextAreaElement, text: string): boolean {
  if (typeof document.execCommand !== "function") return false;
  ta.focus();
  ta.setSelectionRange(0, ta.value.length);
  try {
    return document.execCommand("insertText", false, text);
  } catch {
    return false;
  }
}

export function MarkdownToolbar({ textareaRef, value, onChange }: MarkdownToolbarProps) {
  function selection() {
    const ta = textareaRef.current;
    return { start: ta?.selectionStart ?? value.length, end: ta?.selectionEnd ?? value.length };
  }

  function commit(result: EditResult) {
    const ta = textareaRef.current;
    if (!ta || !tryNativeInsert(ta, result.text)) {
      // ponytail: 폴백은 Ctrl+Z 미보존 — 불편 제기 시 자체 히스토리 스택으로 승격
      onChange(result.text);
    }
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(result.selStart, result.selEnd);
      }
    });
  }

  const runInline = (action: InlineAction) => {
    const { start, end } = selection();
    commit(applyInline(value, start, end, action));
  };
  const runLine = (action: LineAction) => {
    const { start, end } = selection();
    commit(applyLine(value, start, end, action));
  };
  const runBlock = (block: string) => {
    const { start, end } = selection();
    commit(insertBlock(value, start, end, block));
  };

  const groups: ToolButton[][] = [
    [
      { label: "큰 제목", Icon: Heading1, run: () => runLine("h1") },
      { label: "중간 제목", Icon: Heading2, run: () => runLine("h2") },
      { label: "작은 제목", Icon: Heading3, run: () => runLine("h3") },
    ],
    [
      { label: "굵게", Icon: Bold, run: () => runInline("bold") },
      { label: "기울임", Icon: Italic, run: () => runInline("italic") },
      { label: "취소선", Icon: Strikethrough, run: () => runInline("strike") },
    ],
    [
      { label: "글머리 목록", Icon: List, run: () => runLine("ul") },
      { label: "번호 목록", Icon: ListOrdered, run: () => runLine("ol") },
      { label: "인용", Icon: Quote, run: () => runLine("quote") },
      { label: "구분선", Icon: Minus, run: () => runBlock("---") },
      { label: "표", Icon: Table, run: () => runBlock(TABLE_TEMPLATE) },
    ],
  ];

  return (
    <div
      role="toolbar"
      aria-label="서식 도구"
      className="flex flex-wrap items-center gap-xxs rounded-md border border-hairline bg-surface-soft px-xs py-xxs"
    >
      {groups.map((group, gi) => (
        <Fragment key={gi}>
          {gi > 0 ? <span aria-hidden className="mx-xxs h-6 w-px bg-hairline" /> : null}
          {group.map(({ label, Icon, run }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={label}
              onClick={run}
              className={toolButtonClass}
            >
              <Icon size={20} aria-hidden />
            </button>
          ))}
        </Fragment>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: MarkdownEditor에 장착**

`src/components/admin/MarkdownEditor.tsx` 전체를 다음으로 교체:

```tsx
"use client";

import { useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/Textarea";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { MarkdownToolbar } from "./MarkdownToolbar";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  error?: string;
  placeholder?: string;
  /** Textarea 행 수. 미지정 시 Textarea 기본(12) 유지 — 폼별로 높이를 조정할 때 사용. */
  rows?: number;
}

// Radix TabsContent는 비활성 탭의 자식을 아예 마운트하지 않는다.
// → preview 탭이 선택될 때만 MarkdownContent가 마운트되므로 작성 중 renderMarkdown은 실행되지 않는다.
export function MarkdownEditor({ value, onChange, id, error, placeholder, rows }: MarkdownEditorProps) {
  const [tab, setTab] = useState("write");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="write">작성</TabsTrigger>
        <TabsTrigger value="preview">미리보기</TabsTrigger>
      </TabsList>
      <TabsContent value="write">
        <div className="flex flex-col gap-xs">
          <MarkdownToolbar textareaRef={textareaRef} value={value} onChange={onChange} />
          <Textarea
            ref={textareaRef}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error}
            placeholder={placeholder}
            rows={rows}
          />
        </div>
      </TabsContent>
      <TabsContent value="preview">
        {value.trim() ? (
          <MarkdownContent source={value} />
        ) : (
          <p className={cn(typo.bodySm, "text-muted")}>미리볼 내용이 없습니다.</p>
        )}
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm vitest run src/components/admin/MarkdownToolbar.test.tsx src/components/admin/MarkdownEditor.test.tsx`
Expected: PASS (기존 4 + 신규 7)

- [ ] **Step 6: 커밋**

```bash
git add src/components/admin/MarkdownToolbar.tsx src/components/admin/MarkdownToolbar.test.tsx src/components/admin/MarkdownEditor.tsx src/components/admin/MarkdownEditor.test.tsx
git commit -m "feat : 마크다운 에디터 서식 툴바 장착 #106"
```

---

### Task 3: 링크·유튜브 주소 입력 Dialog

**Files:**
- Create: `src/components/admin/MarkdownInsertDialogs.tsx`
- Modify: `src/components/admin/MarkdownToolbar.tsx`
- Test: `src/components/admin/MarkdownToolbar.test.tsx` (describe 블록 추가)

**Interfaces:**
- Consumes: Task 1 `insertInline`/`insertBlock`, Task 2 `commit`, 기존 `parseYouTubeId`(`@/lib/youtube`), `Dialog` 계열(`@/components/ui/dialog`), `Input`, `Button`
- Produces (Task 4~5가 같은 패턴 사용):
  - `LinkInsertDialog({ open, onOpenChange, onInsert }: InsertDialogProps)` — `onInsert(snippet: string)`
  - `YoutubeInsertDialog({ open, onOpenChange, onInsert }: InsertDialogProps)`
  - 툴바 내부: `type DialogKind = "link" | "youtube" | "image" | "help" | null`, `openDialog(kind)`(선택 범위 고정), `insertFromDialog(snippet, asBlock)`
  - 버튼 `aria-label`: "링크"·"유튜브"

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/admin/MarkdownToolbar.test.tsx` 파일 끝에 추가:

```tsx
describe("MarkdownToolbar — 링크·유튜브", () => {
  it("주소가 http로 시작하지 않으면 에러를 보인다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "링크" }));
    fireEvent.change(screen.getByLabelText("주소"), { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "넣기" }));
    expect(screen.getByText("https:// 로 시작하는 주소를 입력해 주세요.")).toBeDefined();
  });

  it("문구와 주소로 링크를 넣는다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "링크" }));
    fireEvent.change(screen.getByLabelText("표시할 문구 (선택)"), { target: { value: "교회 소개" } });
    fireEvent.change(screen.getByLabelText("주소"), { target: { value: "https://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "넣기" }));
    expect(textarea().value).toBe("[교회 소개](https://example.com)");
  });

  it("문구가 비면 주소를 문구로 쓴다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "링크" }));
    fireEvent.change(screen.getByLabelText("주소"), { target: { value: "https://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "넣기" }));
    expect(textarea().value).toBe("[https://example.com](https://example.com)");
  });

  it("유튜브 주소가 아니면 에러를 보인다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "유튜브" }));
    fireEvent.change(screen.getByLabelText("유튜브 주소"), { target: { value: "https://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "넣기" }));
    expect(screen.getByText("유튜브 주소가 아닙니다.")).toBeDefined();
  });

  it("유튜브 주소를 단독 문단으로 넣는다", () => {
    render(<Editor initial="안녕" />);
    textarea().setSelectionRange(2, 2);
    fireEvent.click(screen.getByRole("button", { name: "유튜브" }));
    fireEvent.change(screen.getByLabelText("유튜브 주소"), {
      target: { value: "https://youtu.be/dQw4w9WgXcQ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "넣기" }));
    expect(textarea().value).toBe("안녕\n\nhttps://youtu.be/dQw4w9WgXcQ");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/components/admin/MarkdownToolbar.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "button" and name "링크"`

- [ ] **Step 3: MarkdownInsertDialogs 구현**

`src/components/admin/MarkdownInsertDialogs.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { parseYouTubeId } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

// 마크다운 템플릿을 그대로 꽂으면 결국 문법을 알아야 하므로, 입력을 받아 완성형으로 삽입한다.
// 두 Dialog 모두 조건부 마운트 전제(닫히면 언마운트) — 필드 상태 리셋이 필요 없다.
interface InsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (snippet: string) => void;
}

export function LinkInsertDialog({ open, onOpenChange, onInsert }: InsertDialogProps) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  function confirm() {
    const u = url.trim();
    if (!/^https?:\/\//.test(u)) {
      setError("https:// 로 시작하는 주소를 입력해 주세요.");
      return;
    }
    onInsert(`[${label.trim() || u}](${u})`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>링크 넣기</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-sm">
          <label className="flex flex-col gap-xxs">
            <span className={cn(typo.bodySm, "text-ink")}>표시할 문구 (선택)</span>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 교회 소개" />
          </label>
          <label className="flex flex-col gap-xxs">
            <span className={cn(typo.bodySm, "text-ink")}>주소</span>
            <Input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(undefined);
              }}
              error={error}
              placeholder="https://"
            />
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" variant="primary" onClick={confirm}>
            넣기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function YoutubeInsertDialog({ open, onOpenChange, onInsert }: InsertDialogProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  function confirm() {
    const u = url.trim();
    if (!parseYouTubeId(u)) {
      setError("유튜브 주소가 아닙니다.");
      return;
    }
    onInsert(u);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>유튜브 영상 넣기</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-sm">
          <label className="flex flex-col gap-xxs">
            <span className={cn(typo.bodySm, "text-ink")}>유튜브 주소</span>
            <Input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(undefined);
              }}
              error={error}
              placeholder="https://youtu.be/..."
            />
          </label>
          <p className={cn(typo.caption, "text-muted")}>본문에서 자동으로 영상 화면으로 보입니다.</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" variant="primary" onClick={confirm}>
            넣기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: 툴바 배선**

`src/components/admin/MarkdownToolbar.tsx`에 다음 변경:

react import 교체(`Fragment, type RefObject` → `useRef`·`useState` 추가):

```tsx
import { Fragment, useRef, useState, type RefObject } from "react";
```

lucide import에 `Link`·`SquarePlay` 추가 (알파벳 순서 유지):

```tsx
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  SquarePlay,
  Strikethrough,
  Table,
  type LucideIcon,
} from "lucide-react";
```

markdownEditing import에 `insertInline` 추가, Dialog import 추가:

```tsx
import {
  applyInline,
  applyLine,
  insertBlock,
  insertInline,
  type EditResult,
  type InlineAction,
  type LineAction,
} from "@/lib/markdownEditing";
import { LinkInsertDialog, YoutubeInsertDialog } from "./MarkdownInsertDialogs";
```

`ToolButton` 인터페이스 아래에 타입 추가:

```tsx
type DialogKind = "link" | "youtube" | "image" | "help" | null;
```

컴포넌트 본문 시작(`function selection()` 위)에 상태 추가:

```tsx
  const [dialog, setDialog] = useState<DialogKind>(null);
  // Dialog가 열려 있는 동안 textarea 선택이 바뀔 수 있어, 여는 순간의 선택을 고정한다.
  const savedSel = useRef({ start: 0, end: 0 });
```

`runBlock` 아래에 함수 2개 추가:

```tsx
  const openDialog = (kind: DialogKind) => {
    savedSel.current = selection();
    setDialog(kind);
  };
  const insertFromDialog = (snippet: string, asBlock: boolean) => {
    const { start, end } = savedSel.current;
    commit(asBlock ? insertBlock(value, start, end, snippet) : insertInline(value, start, end, snippet));
    setDialog(null);
  };
```

`groups` 배열 마지막에 그룹 추가:

```tsx
    [
      { label: "링크", Icon: Link, run: () => openDialog("link") },
      { label: "유튜브", Icon: SquarePlay, run: () => openDialog("youtube") },
    ],
```

return을 Fragment로 감싸고 툴바 div 뒤에 Dialog 조건부 마운트(닫히면 언마운트 — 필드 리셋 겸):

```tsx
  return (
    <>
      <div
        role="toolbar"
        aria-label="서식 도구"
        className="flex flex-wrap items-center gap-xxs rounded-md border border-hairline bg-surface-soft px-xs py-xxs"
      >
        {/* …기존 groups 렌더 그대로… */}
      </div>
      {dialog === "link" ? (
        <LinkInsertDialog
          open
          onOpenChange={(v) => {
            if (!v) setDialog(null);
          }}
          onInsert={(md) => insertFromDialog(md, false)}
        />
      ) : null}
      {dialog === "youtube" ? (
        <YoutubeInsertDialog
          open
          onOpenChange={(v) => {
            if (!v) setDialog(null);
          }}
          onInsert={(url) => insertFromDialog(url, true)}
        />
      ) : null}
    </>
  );
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm vitest run src/components/admin/MarkdownToolbar.test.tsx`
Expected: PASS (기본 서식 6 + 링크·유튜브 5)

- [ ] **Step 6: 커밋**

```bash
git add src/components/admin/MarkdownInsertDialogs.tsx src/components/admin/MarkdownToolbar.tsx src/components/admin/MarkdownToolbar.test.tsx
git commit -m "feat : 링크·유튜브 삽입 다이얼로그 추가 #106"
```

---

### Task 4: 본문 이미지 삽입 — MediaPicker 연동

**Files:**
- Modify: `src/components/admin/MarkdownToolbar.tsx`
- Test: `src/components/admin/MarkdownToolbar.test.tsx` (mock + describe 추가)

**Interfaces:**
- Consumes: 기존 `MediaPicker`(`./MediaPicker`) — `{ open, onOpenChange, accept: "image", multiple, onConfirm(mediaIds: number[]) }`, Task 3의 `openDialog`/`insertFromDialog`
- Produces: 버튼 `aria-label`: "이미지". 선택한 미디어를 `media:{id}` 단독 문단(들)으로 삽입

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/admin/MarkdownToolbar.test.tsx` 상단 import에 `vi` 추가:

```tsx
import { describe, it, expect, vi } from "vitest";
```

import 블록 아래에 mock 추가 (MediaPicker는 useQuery를 쓰므로 QueryClientProvider 없이 렌더하려면 mock 필수):

```tsx
// MediaPicker는 TanStack Query 의존 — 여기선 선택 확정 콜백만 검증한다.
vi.mock("./MediaPicker", () => ({
  MediaPicker: ({ open, onConfirm }: { open: boolean; onConfirm: (ids: number[]) => void }) =>
    open ? (
      <button type="button" onClick={() => onConfirm([3, 7])}>
        미디어 선택 확정
      </button>
    ) : null,
}));
```

파일 끝에 describe 추가:

```tsx
describe("MarkdownToolbar — 이미지", () => {
  it("선택한 미디어가 media 코드 단독 문단으로 들어간다", () => {
    render(<Editor initial="본문" />);
    textarea().setSelectionRange(2, 2);
    fireEvent.click(screen.getByRole("button", { name: "이미지" }));
    fireEvent.click(screen.getByRole("button", { name: "미디어 선택 확정" }));
    expect(textarea().value).toBe("본문\n\nmedia:3\n\nmedia:7");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/components/admin/MarkdownToolbar.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "button" and name "이미지"`

- [ ] **Step 3: 툴바 배선**

`src/components/admin/MarkdownToolbar.tsx`:

lucide import에 `ImagePlus` 추가(알파벳 순서 — `Heading3` 다음, `Italic` 앞):

```tsx
  ImagePlus,
```

MediaPicker import 추가:

```tsx
import { MediaPicker } from "./MediaPicker";
```

링크·유튜브 그룹에 이미지 버튼 추가(링크와 유튜브 사이):

```tsx
    [
      { label: "링크", Icon: Link, run: () => openDialog("link") },
      { label: "이미지", Icon: ImagePlus, run: () => openDialog("image") },
      { label: "유튜브", Icon: SquarePlay, run: () => openDialog("youtube") },
    ],
```

Dialog 조건부 마운트 블록에 추가(유튜브 다음):

```tsx
      {dialog === "image" ? (
        <MediaPicker
          open
          onOpenChange={(v) => {
            if (!v) setDialog(null);
          }}
          accept="image"
          multiple
          onConfirm={(ids) => insertFromDialog(ids.map((id) => `media:${id}`).join("\n\n"), true)}
        />
      ) : null}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/components/admin/MarkdownToolbar.test.tsx src/components/admin/MarkdownEditor.test.tsx`
Expected: PASS 전부 (MarkdownEditor 테스트도 mock 없이 통과 — MediaPicker는 이미지 Dialog를 열기 전엔 마운트되지 않으므로 QueryClientProvider 불요)

- [ ] **Step 5: 커밋**

```bash
git add src/components/admin/MarkdownToolbar.tsx src/components/admin/MarkdownToolbar.test.tsx
git commit -m "feat : 본문 이미지 삽입 MediaPicker 연동 #106"
```

---

### Task 5: 마크다운 사용법 도움말(치트시트) Dialog

**Files:**
- Create: `src/components/admin/MarkdownHelpDialog.tsx`
- Create: `src/components/admin/MarkdownHelpDialog.test.tsx`
- Modify: `src/components/admin/MarkdownToolbar.tsx`
- Test: `src/components/admin/MarkdownToolbar.test.tsx` (테스트 1개 추가)

**Interfaces:**
- Consumes: `MarkdownContent`(`@/components/common/MarkdownContent`), `Dialog` 계열, Task 3의 `DialogKind`("help")
- Produces: `MarkdownHelpDialog({ open, onOpenChange }: MarkdownHelpDialogProps)`, 버튼 `aria-label`: "마크다운 사용법"

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/admin/MarkdownHelpDialog.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownHelpDialog } from "./MarkdownHelpDialog";

describe("MarkdownHelpDialog", () => {
  it("문법 원문과 렌더 결과를 나란히 보여준다", () => {
    render(<MarkdownHelpDialog open onOpenChange={() => {}} />);
    expect(screen.getByText("# 큰 제목")).toBeDefined();
    expect(screen.getByRole("heading", { name: "큰 제목" })).toBeDefined();
  });

  it("서식 외 규칙 안내를 보여준다", () => {
    render(<MarkdownHelpDialog open onOpenChange={() => {}} />);
    expect(screen.getByText("문단을 나누려면 빈 줄을 한 줄 넣습니다.")).toBeDefined();
  });
});
```

`src/components/admin/MarkdownToolbar.test.tsx` 파일 끝에 추가:

```tsx
describe("MarkdownToolbar — 도움말", () => {
  it("도움말 버튼이 사용법 안내를 연다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "마크다운 사용법" }));
    expect(screen.getByRole("heading", { name: "마크다운 사용법" })).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/components/admin/MarkdownHelpDialog.test.tsx src/components/admin/MarkdownToolbar.test.tsx`
Expected: FAIL — `Cannot find module './MarkdownHelpDialog'` / 도움말 버튼 미존재

- [ ] **Step 3: MarkdownHelpDialog 구현**

`src/components/admin/MarkdownHelpDialog.tsx`:

```tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

// 어드민 UI 도움말 텍스트(교회별 콘텐츠 아님 — church.ts 주입 대상이 아니다).
// 이미지·유튜브는 예시로 렌더하면 실제 네트워크 요청이 생겨 규칙 목록으로만 안내한다.
const EXAMPLES = [
  "# 큰 제목",
  "## 중간 제목",
  "### 작은 제목",
  "**굵게** 와 *기울임* 과 ~~지운 글씨~~",
  "- 글머리 목록",
  "1. 번호 목록",
  "> 인용문",
  "[교회 소개](https://example.com)",
  "| 항목 | 값 |\n| --- | --- |\n| 예배 | 11시 |",
];

const RULES = [
  "문단을 나누려면 빈 줄을 한 줄 넣습니다.",
  "유튜브 주소를 한 줄에 혼자 두면 본문에서 영상으로 보입니다.",
  "이미지는 툴바의 이미지 버튼으로 넣습니다 — 코드는 자동 입력됩니다.",
  "구분선(---)은 한 줄에 혼자 둡니다.",
];

export interface MarkdownHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarkdownHelpDialog({ open, onOpenChange }: MarkdownHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 2열 치트시트라 기본 모달 폭(32rem)이 좁다 — 라이트박스 폭 토큰으로 확장(PhotoLightbox 선례) */}
      <DialogContent aria-describedby={undefined} className="max-w-[var(--container-lightbox)]">
        <DialogHeader>
          <DialogTitle>마크다운 사용법</DialogTitle>
        </DialogHeader>
        <p className={cn(typo.bodySm, "text-body")}>
          왼쪽처럼 쓰면 오른쪽처럼 보입니다. 툴바 버튼을 누르면 기호가 자동으로 입력됩니다.
        </p>
        <ul className="flex flex-col">
          {EXAMPLES.map((syntax) => (
            <li
              key={syntax}
              className="grid grid-cols-2 items-center gap-base border-t border-hairline py-sm first:border-t-0"
            >
              <pre className={cn(typo.bodySm, "whitespace-pre-wrap text-muted")}>{syntax}</pre>
              <MarkdownContent source={syntax} />
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-xxs">
          <h3 className={cn(typo.titleSm, "text-ink")}>알아두면 좋아요</h3>
          <ul className={cn(typo.bodySm, "flex list-disc flex-col gap-xxs pl-base text-body")}>
            {RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: 툴바 배선**

`src/components/admin/MarkdownToolbar.tsx`:

lucide import에 `CircleHelp` 추가(알파벳 순서 — `Bold` 다음):

```tsx
  CircleHelp,
```

import 추가:

```tsx
import { MarkdownHelpDialog } from "./MarkdownHelpDialog";
```

툴바 div 안, `groups` 렌더 뒤(닫는 `</div>` 앞)에 도움말 버튼 추가(구분선 포함):

```tsx
        <span aria-hidden className="mx-xxs h-6 w-px bg-hairline" />
        <button
          type="button"
          aria-label="마크다운 사용법"
          title="마크다운 사용법"
          onClick={() => setDialog("help")}
          className={toolButtonClass}
        >
          <CircleHelp size={20} aria-hidden />
        </button>
```

Dialog 조건부 마운트 블록에 추가(이미지 다음):

```tsx
      {dialog === "help" ? (
        <MarkdownHelpDialog
          open
          onOpenChange={(v) => {
            if (!v) setDialog(null);
          }}
        />
      ) : null}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm vitest run src/components/admin/MarkdownHelpDialog.test.tsx src/components/admin/MarkdownToolbar.test.tsx`
Expected: PASS 전부

- [ ] **Step 6: 커밋**

```bash
git add src/components/admin/MarkdownHelpDialog.tsx src/components/admin/MarkdownHelpDialog.test.tsx src/components/admin/MarkdownToolbar.tsx src/components/admin/MarkdownToolbar.test.tsx
git commit -m "feat : 마크다운 사용법 도움말 다이얼로그 추가 #106"
```

---

### Task 6: DESIGN.md 반영 + 전체 검증

**Files:**
- Modify: `.claude/rules/DESIGN.md:589` (`markdown-editor` 항목 — admin:02 구획)

**Interfaces:**
- Consumes: Task 2~5 완성 상태
- Produces: 문서 항목 `markdown-toolbar` 등록(02 구획 단일 생산자 관례)

- [ ] **Step 1: DESIGN.md 항목 갱신**

`.claude/rules/DESIGN.md` 589행의 기존 항목:

```
- **`markdown-editor`**: 어드민 본문 작성/미리보기 탭 에디터. `Tabs`(작성·미리보기) + `Textarea` + `MarkdownContent`(미리보기 재사용). 미리보기는 탭 활성 시에만 변환. 토큰 공유(가독성 우선 단순 변형).
```

를 다음 2줄로 교체(02 구획 안 — 다른 구획 라인은 건드리지 않는다):

```
- **`markdown-editor`**: 어드민 본문 작성/미리보기 탭 에디터. `Tabs`(작성·미리보기) + `Textarea` + `MarkdownContent`(미리보기 재사용). 미리보기는 탭 활성 시에만 변환. 작성 탭 상단에 `markdown-toolbar` 장착 — 마크다운을 몰라도 버튼으로 서식 적용. 토큰 공유(가독성 우선 단순 변형).
- **`markdown-toolbar`**: 서식 버튼줄(`role="toolbar"`, lucide 아이콘 + `aria-label`·`title`). 제목 3단계·굵게·기울임·취소선·목록·번호목록·인용·구분선·표는 선택 영역 토글(순수 로직 `lib/markdownEditing`), 링크·유튜브는 주소 입력 Dialog(검증 실패 인라인 에러), 이미지는 `media-picker`(image·multi) 재사용 → `media:{id}` 단독 문단 자동 삽입. `CircleHelp` 버튼 → 치트시트 Dialog("이렇게 쓰면 → 이렇게 보입니다", `MarkdownContent` 재사용 + 문단·유튜브·이미지 규칙 안내). 삽입은 execCommand 우선(Ctrl+Z 보존)·상태 교체 폴백.
```

- [ ] **Step 2: 전체 검증**

Run: `pnpm lint`
Expected: 에러 0

Run: `npx tsc --noEmit`
Expected: 에러 0

Run: `pnpm test`
Expected: 전체 PASS (기존 테스트 회귀 없음 — 특히 MarkdownEditor를 쓰는 폼 6곳 테스트)

- [ ] **Step 3: 커밋**

```bash
git add .claude/rules/DESIGN.md
git commit -m "docs : DESIGN.md 마크다운 툴바·도움말 반영 #106"
```
