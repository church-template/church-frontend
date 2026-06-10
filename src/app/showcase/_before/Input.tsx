// 폴리시 전 스냅샷 — 쇼케이스 before/after 비교 전용. 프로덕션 사용 금지.
"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export type InputVariant = "text" | "searchPill";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  error?: string;
}

const variantClass: Record<InputVariant, string> = {
  text: cn(
    "bg-canvas rounded-md h-12 px-4 border border-hairline",
    "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary",
  ),
  searchPill: cn(
    "bg-surface-strong rounded-pill h-11 px-5",
    "focus-visible:ring-1 focus-visible:ring-primary",
  ),
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = "text", error, className, id, ...props }, ref) => {
    const reactId = useId();
    const inputId = id ?? reactId;
    const errorId = `${inputId}-error`;
    return (
      <div className="flex flex-col gap-xxs">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            typo.bodyMd,
            "w-full text-ink outline-none placeholder:text-muted",
            variantClass[variant],
            className,
          )}
          {...props}
        />
        {error ? (
          <span id={errorId} className={cn(typo.caption, "text-error")}>
            {error}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "InputBefore";
