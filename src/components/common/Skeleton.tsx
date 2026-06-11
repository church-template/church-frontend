import { cn } from "@/lib/utils";

export interface SkeletonProps {
  className?: string;
}

// 순수 표시(서버 컴포넌트). 로딩 자리표시 — surface-strong 펄스, 카드 라운드(md).
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-surface-strong", className)} />;
}
