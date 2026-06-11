import { renderMarkdown } from "@/lib/markdown";

export interface MarkdownContentProps {
  /** raw 마크다운 본문(sermon.content 등). renderMarkdown이 변환·새니타이즈한다. */
  source: string;
  className?: string;
}

// 순수 표시(서버 컴포넌트 가능) — ISR 시 서버에서 새니타이즈된 HTML을 주입한다.
// 새니타이즈는 renderMarkdown(allowlist)이 책임지므로 dangerouslySetInnerHTML이 안전하다.
export function MarkdownContent({ source, className }: MarkdownContentProps) {
  return (
    <div
      className={className ? `prose-church ${className}` : "prose-church"}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    />
  );
}
