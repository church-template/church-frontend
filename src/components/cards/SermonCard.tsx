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
      {/* flex-col + mt-auto: 칩을 위로, preacher·date를 카드 맨 아래로 고정(동일 높이 카드에서 날짜 하단 정렬). */}
      <div className="p-xl flex flex-1 flex-col">
        {subtitle ? (
          <p className={cn(typo.bodySm, "text-body")}>{subtitle}</p>
        ) : null}
        <h3 className={cn(typo.titleMd, "text-ink", subtitle && "mt-xxs")}>{title}</h3>
        {tags && tags.length > 0 ? (
          <div className="mt-base flex flex-wrap gap-xs">
            {tags.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
        ) : null}
        <p className={cn(typo.datetime, "mt-auto pt-base text-muted")}>
          {preacher} · {date}
        </p>
      </div>
    </>
  );

  // 비인터랙티브: hover/focus 없음. 인터랙티브: Link 루트 + focus 링 + hover soft drop·줌.
  // h-full: 그리드 셀 높이를 채워 같은 행 카드가 태그 유무와 무관하게 동일 높이가 되도록.
  if (!href) {
    return <Card bordered className="flex h-full flex-col">{inner}</Card>;
  }
  return (
    <Link href={href} className={cn("block h-full", focusRing)}>
      <Card bordered interactive className="group flex h-full flex-col">
        {inner}
      </Card>
    </Link>
  );
}
