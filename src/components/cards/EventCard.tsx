import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface EventCardProps {
  date: string;
  title: string;
  /** 시간줄(formatEventTime 결과). null이면 생략 — allDay는 날짜 배지만(가이드 13.2). */
  time?: string | null;
  location?: string | null;
  summary?: string;
  href?: string;
}

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-xl";

// 날짜 배지(primary) + 제목 + 시간·장소(메인 13.2) 또는 요약. hairline, 패딩 32.
export function EventCard({ date, title, time, location, summary, href }: EventCardProps) {
  const inner = (
    <>
      <Badge variant="primary">{date}</Badge>
      <h3 className={cn(typo.titleMd, "mt-base text-ink")}>{title}</h3>
      {time ? <p className={cn(typo.datetime, "mt-xs text-body")}>{time}</p> : null}
      {location ? (
        <p className={cn(typo.bodySm, "mt-xxs text-muted")}>{location}</p>
      ) : null}
      {summary ? <p className={cn(typo.bodySm, "mt-xs text-body")}>{summary}</p> : null}
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
