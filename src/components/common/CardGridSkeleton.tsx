import { Skeleton } from "@/components/common/Skeleton";
import { Card } from "@/components/ui/Card";

export interface CardGridSkeletonProps {
  count?: number;
}

// 카드 그리드 로딩 자리표시 — sermon-card 미러(16:9 썸네일 + 제목/메타 2줄).
// 그리드 클래스는 설교 목록과 동일(모바일 1-up/태블릿 2-up/데스크톱 3-up) — 반응형 자동 일치.
export function CardGridSkeleton({ count = 6 }: CardGridSkeletonProps) {
  return (
    <div aria-hidden className="grid gap-base sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} bordered>
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="flex flex-col gap-xs p-xl">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  );
}
