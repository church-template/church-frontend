import { Skeleton } from "@/components/common/Skeleton";
import { Card } from "@/components/ui/Card";

// 앨범 카드 로딩 자리표시(썸네일 + 2줄). 그리드 개수만큼 반복 사용.
export function AlbumCardSkeleton() {
  return (
    <Card bordered aria-hidden>
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-col gap-xs p-xl">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </Card>
  );
}
