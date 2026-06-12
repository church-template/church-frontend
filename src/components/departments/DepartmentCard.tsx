import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { DEPT_PAGE, thumbnailOf, type Department } from "@/constants/departments";

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-xl";

// 부서 카드 — 16:9 부서 히어로 이미지(목록↔상세 연속성) + 이름 + 인도자. sermon-card 호버 재사용.
export function DepartmentCard({ dept }: { dept: Department }) {
  return (
    <Link href={`/departments/${dept.slug}`} className={cn("block", focusRing)}>
      <Card bordered interactive className="group h-full">
        <div className="aspect-video overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸; next/image 교체는 후속 */}
          <img
            src={thumbnailOf(dept.media)}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        </div>
        <div className="p-xl">
          <h3 className={cn(typo.titleMd, "text-ink")}>{dept.name}</h3>
          {dept.leader ? (
            <p className={cn(typo.datetime, "mt-xxs text-muted")}>
              {DEPT_PAGE.leaderLabel} · {dept.leader}
            </p>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
