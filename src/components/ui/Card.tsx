import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: "card" | "soft";
  bordered?: boolean;
  interactive?: boolean; // hover 시 soft drop + 2px 리프트
}

// 모든 카드가 공유하는 컨테이너. rounded-xl(24px) 고정. 그림자는 hover soft-drop 하나만.
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
        interactive &&
          "transition duration-200 ease-out hover:shadow-soft hover:-translate-y-0.5",
        className,
      )}
      {...props}
    />
  );
}
