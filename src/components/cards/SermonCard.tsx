import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface SermonCardProps {
  /** 없으면 텍스트형(메인 13.2 — API 카드 응답에 썸네일 없음, 스펙 D1) */
  thumbnailUrl?: string;
  title: string;
  preacher: string;
  date: string;
  series?: string | null;
  scripture?: string | null;
  tags?: string[];
  href?: string;
}

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-xl";

export function SermonCard({
  thumbnailUrl,
  title,
  preacher,
  date,
  series,
  scripture,
  tags,
  href,
}: SermonCardProps) {
  const subtitle = [series, scripture].filter(Boolean).join(" · ");

  // href 있을 때만 hover 줌이 작동하도록 group-hover를 조건부 부여(비인터랙티브 시 hover 없음).
  const inner = (
    <>
      {thumbnailUrl ? (
        <div className="aspect-video overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- T03 프레젠테이션 셸; 최적화 이미지는 T10에서 next/image로 교체 */}
          <img
            src={thumbnailUrl}
            alt=""
            className={cn(
              "h-full w-full object-cover",
              href &&
                "transition-transform duration-300 ease-out group-hover:scale-[1.03]",
            )}
          />
        </div>
      ) : null}
      <div className="p-xl">
        {subtitle ? (
          <p className={cn(typo.caption, "text-muted")}>{subtitle}</p>
        ) : null}
        <h3 className={cn(typo.titleMd, "text-ink", subtitle && "mt-xxs")}>{title}</h3>
        <p className={cn(typo.datetime, "mt-xxs text-muted")}>
          {preacher} · {date}
        </p>
        {tags && tags.length > 0 ? (
          <div className="mt-base flex flex-wrap gap-xs">
            {tags.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );

  // 비인터랙티브: hover/focus 없음. 인터랙티브: Link 루트 + focus 링 + hover soft drop·줌.
  if (!href) {
    return <Card bordered>{inner}</Card>;
  }
  return (
    <Link href={href} className={cn("block", focusRing)}>
      <Card bordered interactive className="group block">
        {inner}
      </Card>
    </Link>
  );
}
