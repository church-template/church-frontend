// 폴리시 전 스냅샷 — 쇼케이스 before/after 비교 전용. 프로덕션 사용 금지.
import Link from "next/link";
import { Badge } from "./Badge";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface NoticeRowProps {
  title: string;
  date: string;
  href: string;
  isNew?: boolean;
}

export function NoticeRow({ title, date, href, isNew = false }: NoticeRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-base border-b border-hairline py-base",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
      )}
    >
      <span className="flex min-w-0 items-center gap-xs">
        {isNew ? <Badge variant="primary">NEW</Badge> : null}
        <span className={cn(typo.titleSm, "truncate text-ink")}>{title}</span>
      </span>
      <span className={cn(typo.datetime, "shrink-0 text-muted")}>{date}</span>
    </Link>
  );
}
