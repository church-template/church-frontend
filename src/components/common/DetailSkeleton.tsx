import { Skeleton } from "@/components/common/Skeleton";

// 상세 본문 로딩 자리표시 — 공지/설교/일정 상세 공통(뒤로가기 줄 + 제목 + 메타 + 구분선 + 본문 문단).
// 제목 h-9 ≈ titleLg(30px) 줄높이 근사 — 교체 시 점프 최소화.
export function DetailSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-5 w-20" />
      <Skeleton className="mt-lg h-9 w-3/4" />
      <Skeleton className="mt-xs h-5 w-40" />
      <div className="mt-lg border-t border-hairline" />
      <div className="mt-lg flex flex-col gap-xs">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-5 w-2/3" />
      </div>
    </div>
  );
}
