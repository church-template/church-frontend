"use client";

import { Fragment, useRef, useState, type RefObject } from "react";
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
import { cn } from "@/lib/utils";
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

type DialogKind = "link" | "youtube" | "image" | "help" | null;

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
  const [dialog, setDialog] = useState<DialogKind>(null);
  // Dialog가 열려 있는 동안 textarea 선택이 바뀔 수 있어, 여는 순간의 선택을 고정한다.
  const savedSel = useRef({ start: 0, end: 0 });

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

  const openDialog = (kind: DialogKind) => {
    savedSel.current = selection();
    setDialog(kind);
  };
  const insertFromDialog = (snippet: string, asBlock: boolean) => {
    const { start, end } = savedSel.current;
    commit(asBlock ? insertBlock(value, start, end, snippet) : insertInline(value, start, end, snippet));
    setDialog(null);
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
    [
      { label: "링크", Icon: Link, run: () => openDialog("link") },
      { label: "유튜브", Icon: SquarePlay, run: () => openDialog("youtube") },
    ],
  ];

  return (
    <>
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
}
