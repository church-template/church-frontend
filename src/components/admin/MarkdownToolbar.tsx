"use client";

import { Fragment, useRef, useState, type RefObject } from "react";
import {
  Bold,
  CircleHelp,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
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
import { LinkInsertDialog, TableInsertDialog, YoutubeInsertDialog } from "./MarkdownInsertDialogs";
import { MediaPicker } from "./MediaPicker";
import { MarkdownHelpDialog } from "./MarkdownHelpDialog";

export interface MarkdownToolbarProps {
  /** 삽입 대상 textarea — 선택 범위를 읽고, 적용 후 포커스·커서를 복원한다. */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}

type DialogKind = "link" | "youtube" | "image" | "table" | "help" | null;

// 버튼 정의는 순수 데이터(모듈 상수) — 렌더 중 ref를 읽는 클로저 배열을 만들면
// react-hooks/refs가 렌더 중 ref 접근으로 판정한다(실행은 핸들러에서만 일어나도).
type ToolAction =
  | { kind: "inline"; action: InlineAction }
  | { kind: "line"; action: LineAction }
  | { kind: "block"; block: string }
  | { kind: "dialog"; dialog: Exclude<DialogKind, null> };

interface ToolButton {
  label: string;
  Icon: LucideIcon;
  act: ToolAction;
}

const GROUPS: ToolButton[][] = [
  [
    { label: "큰 제목", Icon: Heading1, act: { kind: "line", action: "h1" } },
    { label: "중간 제목", Icon: Heading2, act: { kind: "line", action: "h2" } },
    { label: "작은 제목", Icon: Heading3, act: { kind: "line", action: "h3" } },
  ],
  [
    { label: "굵게", Icon: Bold, act: { kind: "inline", action: "bold" } },
    { label: "기울임", Icon: Italic, act: { kind: "inline", action: "italic" } },
    { label: "취소선", Icon: Strikethrough, act: { kind: "inline", action: "strike" } },
  ],
  [
    { label: "글머리 목록", Icon: List, act: { kind: "line", action: "ul" } },
    { label: "번호 목록", Icon: ListOrdered, act: { kind: "line", action: "ol" } },
    { label: "인용", Icon: Quote, act: { kind: "line", action: "quote" } },
    { label: "구분선", Icon: Minus, act: { kind: "block", block: "---" } },
    { label: "표", Icon: Table, act: { kind: "dialog", dialog: "table" } },
  ],
  [
    { label: "링크", Icon: Link, act: { kind: "dialog", dialog: "link" } },
    { label: "이미지", Icon: ImagePlus, act: { kind: "dialog", dialog: "image" } },
    { label: "유튜브", Icon: SquarePlay, act: { kind: "dialog", dialog: "youtube" } },
  ],
];

const toolButtonClass = cn(
  "inline-flex size-9 items-center justify-center rounded-sm text-body",
  "transition duration-150 ease-out hover:bg-surface-strong hover:text-ink",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
);

// 실행취소(Ctrl+Z) 보존을 위해 네이티브 삽입을 먼저 시도한다. execCommand는 deprecated지만
// 실패·미지원(jsdom 포함)이면 상태 교체로 폴백하므로 안전하다. 성공하면 input 이벤트가 React onChange로 전파된다.
function tryNativeInsert(ta: HTMLTextAreaElement, text: string): boolean {
  // insertText("")는 엔진별 동작이 갈린다 — 빈 결과는 확실히 상태 교체 폴백으로
  if (text === "" || typeof document.execCommand !== "function") return false;
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

  function commit(result: EditResult, useNative = true) {
    const ta = textareaRef.current;
    const scrollTop = ta?.scrollTop ?? 0; // 전체 교체 삽입은 캐럿을 끝으로 보내며 스크롤을 튕긴다 — 복원용 저장
    if (!ta || !useNative || !tryNativeInsert(ta, result.text)) {
      // ponytail: 폴백은 Ctrl+Z 미보존 — 불편 제기 시 자체 히스토리 스택으로 승격
      onChange(result.text);
    }
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(result.selStart, result.selEnd);
        el.scrollTop = scrollTop;
      }
    });
  }

  function runAction(act: ToolAction) {
    if (act.kind === "dialog") {
      savedSel.current = selection();
      setDialog(act.dialog);
      return;
    }
    const { start, end } = selection();
    if (act.kind === "inline") commit(applyInline(value, start, end, act.action));
    else if (act.kind === "line") commit(applyLine(value, start, end, act.action));
    else commit(insertBlock(value, start, end, act.block));
  }

  const insertFromDialog = (snippet: string, asBlock: boolean) => {
    const { start, end } = savedSel.current;
    // Dialog가 아직 열린 채라 포커스 트랩이 focus()를 되가져간다 — execCommand가 다이얼로그 입력에
    // 꽂히고 true를 반환해 폴백까지 막히므로(본문 무변화 버그), 상태 교체로 직행한다.
    commit(
      asBlock ? insertBlock(value, start, end, snippet) : insertInline(value, start, end, snippet),
      false,
    );
    setDialog(null);
  };

  return (
    <>
      <div
        role="toolbar"
        aria-label="서식 도구"
        className="flex flex-wrap items-center gap-xxs rounded-md border border-hairline bg-surface-soft px-xs py-xxs"
      >
        {GROUPS.map((group, gi) => (
          <Fragment key={gi}>
            {gi > 0 ? <span aria-hidden className="mx-xxs h-6 w-px bg-hairline" /> : null}
            {group.map(({ label, Icon, act }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                title={label}
                onClick={() => runAction(act)}
                className={toolButtonClass}
              >
                <Icon size={20} aria-hidden />
              </button>
            ))}
          </Fragment>
        ))}
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
      {dialog === "table" ? (
        <TableInsertDialog
          open
          onOpenChange={(v) => {
            if (!v) setDialog(null);
          }}
          onInsert={(md) => insertFromDialog(md, true)}
        />
      ) : null}
      {dialog === "help" ? (
        <MarkdownHelpDialog
          open
          onOpenChange={(v) => {
            if (!v) setDialog(null);
          }}
        />
      ) : null}
    </>
  );
}
