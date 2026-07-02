import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface NoticeRowProps {
  title: string;
  date: string;
  href: string; // 행 전체가 링크
  /** 고정 공지(13.2) — 서버가 고정글 우선 정렬을 보장하므로 표기만 한다 */
  isPinned?: boolean;
  isNew?: boolean;
}

// 제목+날짜 가로 행, 하단 hairline. 클릭/포커스 영역 = 행 전체. py-base=16px.
export function NoticeRow({ title, date, href, isPinned = false, isNew = false }: NoticeRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center justify-between gap-base border-b border-hairline py-base",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
      )}
    >
      <span className="flex min-w-0 items-center gap-xs">
        {isPinned ? <Badge variant="primary">고정</Badge> : null}
        {isNew ? <Badge variant="primary">NEW</Badge> : null}
        {/* hover 시 제목만 primary로 전이 — 행 전체가 링크임을 조용히 알린다. */}
        <span
          className={cn(
            typo.titleMd,
            "truncate text-ink transition-colors duration-150 ease-out group-hover:text-primary",
          )}
        >
          {title}
        </span>
      </span>
      <span className={cn(typo.datetime, "shrink-0 text-muted")}>{date}</span>
    </Link>
  );
}
