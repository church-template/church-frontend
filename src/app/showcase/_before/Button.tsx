// 폴리시 전 스냅샷 — 쇼케이스 before/after 비교 전용. 프로덕션 사용 금지.
// 클라이언트 지시어 없음(shared 컴포넌트): 훅·상태 없이 prop만 전달 → 서버·클라이언트 양쪽에서 사용 가능.
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outlineOnDark"
  | "tertiary"
  | "pillCta";

const variantClass: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-primary text-on-primary rounded-pill h-11 px-5",
    "active:bg-primary-active",
    "disabled:bg-primary-disabled disabled:text-on-primary",
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  ),
  secondary: cn(
    "bg-surface-strong text-ink rounded-pill h-11 px-5",
    "disabled:bg-surface-strong disabled:text-muted",
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  ),
  outlineOnDark: cn(
    "bg-transparent text-on-dark border border-on-dark rounded-pill h-11 px-5",
    "disabled:opacity-50",
    "focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark",
  ),
  tertiary: cn(
    "bg-transparent text-primary rounded-sm",
    "disabled:opacity-50",
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  ),
  pillCta: cn(
    "bg-primary text-on-primary rounded-pill h-14 px-8",
    "active:bg-primary-active",
    "disabled:bg-primary-disabled disabled:text-on-primary",
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  ),
};

const baseClass = cn(
  typo.button,
  "inline-flex items-center justify-center",
  "transition-colors outline-none",
  "disabled:cursor-not-allowed",
);

export function buttonVariants(variant: ButtonVariant = "primary") {
  return cn(baseClass, variantClass[variant]);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants(variant), className)}
      {...props}
    />
  ),
);
Button.displayName = "ButtonBefore";
