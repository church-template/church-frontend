"use client";

import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

// Input의 text variant 스타일을 멀티라인으로 이식. 높이는 rows로(px 인라인 금지), 토큰 공유.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, id, rows = 12, ...props }, ref) => {
    const reactId = useId();
    const areaId = id ?? reactId;
    const errorId = `${areaId}-error`;
    return (
      <div className="flex flex-col gap-xxs">
        <textarea
          ref={ref}
          id={areaId}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            typo.bodyMd,
            "w-full resize-y rounded-md border border-hairline bg-canvas px-4 py-3 text-ink outline-hidden placeholder:text-muted",
            "transition duration-150 ease-out hover:border-muted-soft",
            "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary",
            "disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-muted",
            error &&
              "border-error hover:border-error focus-visible:border-error focus-visible:ring-error",
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
Textarea.displayName = "Textarea";
