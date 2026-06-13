// src/components/ui/Checkbox.tsx
"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
}

// DESIGN.md checkbox: 박스 24px·rounded-xs, 체크 시 primary 채움 + on-primary Check.
// 네이티브 input을 유지해 접근성 동작(키보드·스크린리더) 보존, 라벨 행 전체가 터치 타깃(≥48px).
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const reactId = useId();
    const inputId = id ?? reactId;
    const errorId = `${inputId}-error`;
    return (
      <div className="flex flex-col gap-xxs">
        <label
          htmlFor={inputId}
          className={cn("flex min-h-12 cursor-pointer items-center gap-sm has-disabled:cursor-not-allowed", className)}
        >
          <span className="relative inline-flex size-6 shrink-0 items-center justify-center">
            <input
              ref={ref}
              id={inputId}
              type="checkbox"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={cn(
                "peer size-6 appearance-none rounded-xs border border-hairline bg-canvas",
                "transition duration-150 ease-out",
                "hover:border-muted-soft",
                "checked:border-primary checked:bg-primary",
                "outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                "disabled:cursor-not-allowed disabled:bg-surface-soft",
                "checked:disabled:border-primary-disabled checked:disabled:bg-primary-disabled",
                error && "border-error hover:border-error",
              )}
              {...props}
            />
            <Check
              size={16}
              aria-hidden
              className="pointer-events-none absolute hidden text-on-primary peer-checked:block"
            />
          </span>
          <span className={cn(typo.bodySm, "text-ink")}>{label}</span>
        </label>
        {error ? (
          <span id={errorId} className={cn(typo.caption, "text-error")}>
            {error}
          </span>
        ) : null}
      </div>
    );
  },
);
Checkbox.displayName = "Checkbox";
