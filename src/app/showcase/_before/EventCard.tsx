// 폴리시 전 스냅샷 — 쇼케이스 before/after 비교 전용. 프로덕션 사용 금지.
import Link from "next/link";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface EventCardProps {
  date: string;
  title: string;
  summary: string;
  href?: string;
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-xl";

export function EventCard({ date, title, summary, href }: EventCardProps) {
  const inner = (
    <>
      <Badge variant="primary">{date}</Badge>
      <h3 className={cn(typo.titleMd, "mt-base text-ink")}>{title}</h3>
      <p className={cn(typo.bodySm, "mt-xs text-body")}>{summary}</p>
    </>
  );

  if (!href) {
    return (
      <Card bordered className="p-xl">
        {inner}
      </Card>
    );
  }
  return (
    <Link href={href} className={cn("block", focusRing)}>
      <Card bordered interactive className="block p-xl">
        {inner}
      </Card>
    </Link>
  );
}
