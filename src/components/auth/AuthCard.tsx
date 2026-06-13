// src/components/auth/AuthCard.tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Card } from "@/components/ui/Card";

// 인증 3페이지 공용 폼 카드 — 배치(중앙 정렬·여백)는 AuthSplitLayout 우측 패널이 책임진다.
// 폭은 모달 토큰(32rem) 재사용: max-w-md 등 t-shirt 유틸은 spacing 토큰과 충돌해 금지.
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card bordered className="w-full max-w-[var(--container-modal)] p-xl">
      <h1 className={cn(typo.displaySm, "text-ink")}>{title}</h1>
      {subtitle ? <p className={cn(typo.bodySm, "mt-xxs text-muted")}>{subtitle}</p> : null}
      <div className="mt-lg">{children}</div>
    </Card>
  );
}
