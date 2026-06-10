import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary";
}

const variantClass = {
  default: "bg-surface-strong text-ink",
  primary: "bg-primary-soft text-primary",
} as const;

// 서버 컴포넌트(순수 표시). py-1=4px, px-3=12px.
// rounded-sm(8px): 작은 칩까지 풀필이면 템플릿 인상이 강해져 배지만 낮춘다(DESIGN Shapes).
export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        typo.captionStrong,
        "inline-flex items-center rounded-sm py-1 px-3 whitespace-nowrap",
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}
