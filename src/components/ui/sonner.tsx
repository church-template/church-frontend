"use client";

import { Toaster as SonnerToaster } from "sonner";
import { CircleCheck, CircleAlert } from "lucide-react";
import { type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

// 전역 Toast 컨테이너 1개. DESIGN: semantic 색은 아이콘/텍스트에만(배경 채움 금지) → richColors 미사용.
// sonner는 표면/보더/라운드를 CSS 변수(--normal-*·--border-radius)로 그리며 utility 클래스를
// specificity로 덮는다. 따라서 재스킨은 클래스가 아니라 그 변수를 우리 토큰으로 오버라이드한다.
export function Toaster() {
  return (
    <SonnerToaster
      theme="light"
      position="top-center"
      duration={4000}
      style={
        {
          "--normal-bg": "var(--color-surface-card)",
          "--normal-text": "var(--color-ink)",
          "--normal-border": "var(--color-hairline)",
          "--border-radius": "var(--radius-lg)",
        } as CSSProperties
      }
      icons={{
        success: <CircleCheck size={18} className="text-success" aria-hidden />,
        error: <CircleAlert size={18} className="text-error" aria-hidden />,
      }}
      toastOptions={{
        classNames: {
          toast: "gap-sm shadow-soft",
          title: cn(typo.titleSm, "text-ink"),
          description: cn(typo.bodySm, "text-body"),
        },
      }}
    />
  );
}
