// 폴리시 전 스냅샷 — 쇼케이스 before/after 비교 전용. 프로덕션 사용 금지.
import Link from "next/link";
import { Card } from "./Card";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface SermonCardProps {
  thumbnailUrl: string;
  title: string;
  preacher: string;
  date: string;
  href?: string;
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-xl";

export function SermonCard({
  thumbnailUrl,
  title,
  preacher,
  date,
  href,
}: SermonCardProps) {
  const inner = (
    <>
      <div className="aspect-video overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- 폴리시 전 스냅샷(비교 전용) */}
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
      <div className="p-xl">
        <h3 className={cn(typo.titleMd, "text-ink")}>{title}</h3>
        <p className={cn(typo.datetime, "mt-xxs text-muted")}>
          {preacher} · {date}
        </p>
      </div>
    </>
  );

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
