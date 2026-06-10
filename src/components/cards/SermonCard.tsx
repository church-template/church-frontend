import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface SermonCardProps {
  thumbnailUrl: string; // local path 또는 same-origin /api/media/{id} (외부 URL은 T10)
  title: string;
  preacher: string;
  date: string;
  href?: string;
}

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-xl";

export function SermonCard({
  thumbnailUrl,
  title,
  preacher,
  date,
  href,
}: SermonCardProps) {
  // href 있을 때만 hover 줌이 작동하도록 group-hover를 조건부 부여(비인터랙티브 시 hover 없음).
  const inner = (
    <>
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
      <div className="p-xl">
        <h3 className={cn(typo.titleMd, "text-ink")}>{title}</h3>
        <p className={cn(typo.datetime, "mt-xxs text-muted")}>
          {preacher} · {date}
        </p>
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
