import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface EventCardProps {
  date: string;
  title: string;
  summary: string;
  href?: string;
}

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-xl";

// 날짜 배지(primary) + 제목 + 요약. hairline, 패딩 32.
export function EventCard({ date, title, summary, href }: EventCardProps) {
  const inner = (
    <>
      <Badge variant="primary">{date}</Badge>
      <h3 className={cn(typo.titleMd, "mt-base text-ink")}>{title}</h3>
      <p className={cn(typo.bodySm, "mt-xs text-body")}>{summary}</p>
    </>
  );

  // 비인터랙티브: hover/focus 없음. 인터랙티브: Link 루트 + focus 링 + hover soft drop.
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
