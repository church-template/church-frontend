import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ContainerProps {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

// 사이트 모든 섹션·히어로가 공유하는 단일 컨테이너(최대 1200px, 좌우 24px). 별도 폭 만들지 않음(가이드 14.3).
export function Container({ as: As = "div", className, children }: ContainerProps) {
  return (
    <As
      className={cn(
        "mx-auto w-full max-w-[var(--container-max)] px-[var(--container-padding)]",
        className,
      )}
    >
      {children}
    </As>
  );
}
