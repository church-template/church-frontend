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
  // lastIndexOf(fromIndex=-1)은 0으로 클램프되어 문서 첫 개행을 "커서 앞 개행"으로 오인한다 — slice로 회피
  const lineStart = text.slice(0, selStart).lastIndexOf("\n") + 1;
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
