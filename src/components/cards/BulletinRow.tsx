import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface BulletinRowProps {
  title: string;
  date: string;
  author?: string | null;
  pdfUrl: string;
  /** 어드민 인라인 액션 — 앵커 밖에 형제로 렌더(중첩 <a> 금지). 없으면 공개 행 그대로. */
  actions?: ReactNode;
}

export function BulletinRow({ title, date, author, pdfUrl, actions }: BulletinRowProps) {
  const anchor = (
    <a
      href={pdfUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex min-w-0 flex-1 items-center justify-between gap-base py-base",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
      )}
    >
      <span className="flex min-w-0 flex-col gap-xs">
        <span className={cn(typo.titleSm, "truncate text-ink transition-colors duration-150 ease-out group-hover:text-primary")}>
          {title}
          <span className="sr-only">(새 탭에서 PDF 열림)</span>
        </span>
        {author ? <span className={cn(typo.bodySm, "text-muted")}>{author}</span> : null}
      </span>
      <span className={cn(typo.datetime, "shrink-0 text-muted")}>{date}</span>
    </a>
  );
  if (!actions) {
    return <div className="border-b border-hairline">{anchor}</div>;
  }
  return (
    <div className="flex items-center gap-base border-b border-hairline">
      {anchor}
      {actions}
    </div>
  );
}
