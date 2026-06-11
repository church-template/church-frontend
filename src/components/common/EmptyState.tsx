import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface EmptyStateProps {
  /** "등록된 ○○가 없습니다" 패턴 문구 */
  message: string;
  className?: string;
}

// 순수 표시(서버 컴포넌트). 목록 빈 배열(가이드 13.2) 표준 표시.
export function EmptyState({ message, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center py-xxl text-center",
        typo.bodyMd,
        "text-muted",
        className,
      )}
    >
      {message}
    </div>
  );
}
