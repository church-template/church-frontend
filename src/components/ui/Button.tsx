// 클라이언트 지시어 없음(shared 컴포넌트): 훅·상태 없이 prop만 전달 → 서버·클라이언트 양쪽에서 사용 가능.
// buttonVariants를 서버 컴포넌트(링크형 CTA)에서 호출하려면 "use client"가 없어야 한다.
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outlineOnDark"
  | "tertiary"
  | "pillCta"
  | "destructive";

// 모든 variant: 색·상태·focus-visible 링을 토큰 유틸로만 표현. 높이는 표준 숫자 스케일로 고정.
// hover는 기존 토큰 재사용(프레스 토큰·표면 톤·on-dark 알파 틴트), 프레스는 1px 가라앉음으로 hover와 구분.
// rounded-lg(16px): 중첩 라디우스 원칙(외부 ≈ 내부 ×2) — 배지(8)의 ×2 (DESIGN Shapes).
const variantClass: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-primary text-on-primary rounded-lg h-12 px-5",
    "hover:bg-primary-active active:bg-primary-active active:translate-y-px",
    "disabled:bg-primary-disabled disabled:text-on-primary",
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  ),
  secondary: cn(
    "bg-surface-strong text-ink rounded-lg h-12 px-5",
    "hover:bg-hairline active:bg-hairline active:translate-y-px",
    "disabled:bg-surface-strong disabled:text-muted",
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  ),
  outlineOnDark: cn(
    "bg-transparent text-on-dark border border-on-dark rounded-lg h-12 px-5",
    "hover:bg-on-dark/10 active:bg-on-dark/15 active:translate-y-px",
    "disabled:opacity-50",
    "focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark",
  ),
  tertiary: cn(
    "bg-transparent text-primary rounded-sm",
    "hover:text-primary-active",
    "disabled:opacity-50",
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  ),
  pillCta: cn(
    "bg-primary text-on-primary rounded-lg h-14 px-8",
    "hover:bg-primary-active active:bg-primary-active active:translate-y-px",
    "disabled:bg-primary-disabled disabled:text-on-primary",
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  ),
  destructive: cn(
    "bg-error text-on-error rounded-lg h-12 px-5",
    "hover:bg-error-active active:bg-error-active active:translate-y-px",
    "disabled:opacity-50",
    "focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card",
  ),
};

// outline-hidden: 링을 못 그리는 forced-colors(고대비) 모드에서만 아웃라인이 살아나도록.
// disabled:pointer-events-none: 비활성 버튼에 hover/active 스타일이 걸리는 것을 차단.
const baseClass = cn(
  typo.button,
  "inline-flex items-center justify-center gap-xs select-none",
  "transition duration-150 ease-out",
  "outline-hidden",
  "disabled:pointer-events-none disabled:cursor-not-allowed",
);

// className 문자열만 반환 → 링크형 CTA에 <Link className={buttonVariants("pillCta")}> 로 사용.
export function buttonVariants(variant: ButtonVariant = "primary") {
  return cn(baseClass, variantClass[variant]);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** 진행 중 표시 — 스피너를 띄우고 비활성화한다(이중 제출 방지). */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", loading = false, disabled, className, children, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn(buttonVariants(variant), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        // CSS 스피너(현재 텍스트 색 상속) — 아이콘 의존성 없이 처리.
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
