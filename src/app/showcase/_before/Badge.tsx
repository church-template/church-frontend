// 폴리시 전 스냅샷 — 쇼케이스 before/after 비교 전용. 프로덕션 사용 금지. (풀필 라운드 원본)
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

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        typo.captionStrong,
        "inline-flex items-center rounded-pill py-1 px-3",
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}
