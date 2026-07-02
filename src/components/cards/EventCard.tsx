import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface EventCardProps {
  date?: string | null;
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
      {date ? <Badge variant="primary">{date}</Badge> : null}
      <h3 className={cn(typo.titleMd, "mt-base text-ink")}>{title}</h3>
      {time ? <p className={cn(typo.datetime, "mt-xs text-body")}>{time}</p> : null}
      {location ? (
        <p className={cn(typo.bodyMd, "mt-xxs text-muted")}>{location}</p>
      ) : null}
      {summary ? <p className={cn(typo.bodyMd, "mt-xs text-body")}>{summary}</p> : null}
    </>
  );

  // 비인터랙티브: hover/focus 없음. 인터랙티브: Link 루트 + focus 링 + hover soft drop.
  // h-full: 그리드 행 내 카드 높이 통일(시간줄 유무로 생기는 높낮이 차 제거). 모바일 1열에선 무영향.
  if (!href) {
    return (
      <Card bordered className="h-full p-xl">
        {inner}
      </Card>
    );
  }
  return (
    <Link href={href} className={cn("block h-full", focusRing)}>
      <Card bordered interactive className="block h-full p-xl">
        {inner}
      </Card>
    </Link>
  );
}
