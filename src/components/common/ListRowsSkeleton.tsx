import { Skeleton } from "@/components/common/Skeleton";

export interface ListRowsSkeletonProps {
  rows?: number;
}

// 목록 행 로딩 자리표시 — notice-row/bulletin-row 미러(제목+날짜 가로 행, hairline 구분, py-base).
// 실물과 같은 행 높이라 콘텐츠 교체 시 레이아웃 점프가 없다.
export function ListRowsSkeleton({ rows = 10 }: ListRowsSkeletonProps) {
  return (
    <div aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-base border-b border-hairline py-base"
        >
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-5 w-24 shrink-0" />
        </div>
      ))}
    </div>
  );
}
