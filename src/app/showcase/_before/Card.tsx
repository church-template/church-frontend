// 폴리시 전 스냅샷 — 쇼케이스 before/after 비교 전용. 프로덕션 사용 금지.
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: "card" | "soft";
  bordered?: boolean;
  interactive?: boolean;
}

export function Card({
  surface = "card",
  bordered = false,
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        surface === "soft" ? "bg-surface-soft" : "bg-surface-card",
        bordered && "border border-hairline",
        interactive && "transition-shadow hover:shadow-soft",
        className,
      )}
      {...props}
    />
  );
}
