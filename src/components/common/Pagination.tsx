"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import type { PageMeta } from "@/lib/page";

// 표시할 페이지 토큰 계산(0-base). 7개 초과면 첫·끝 + 현재 주변 + 말줄임.
export function pageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const items: (number | "ellipsis")[] = [0];
  const left = Math.max(1, current - 1);
  const right = Math.min(total - 2, current + 1);
  if (left > 1) items.push("ellipsis");
  for (let i = left; i <= right; i++) items.push(i);
  if (right < total - 2) items.push("ellipsis");
  items.push(total - 1);
  return items;
}

function PaginationControls({ page }: { page: PageMeta }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 기존 쿼리(tagId·sort 등) 보존하며 page만 교체.
  const hrefFor = (n: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(n));
    return `${pathname}?${params.toString()}`;
  };

  const { number, totalPages } = page;
  const isFirst = number <= 0;
  const isLast = number >= totalPages - 1;

  return (
    <nav className={cn("flex items-center justify-center gap-xs", typo.datetime)} aria-label="페이지네이션">
      <Arrow href={hrefFor(number - 1)} disabled={isFirst} dir="prev" />
      {pageItems(number, totalPages).map((it, i) =>
        it === "ellipsis" ? (
          <span key={`e${i}`} className="px-2 text-muted" aria-hidden>
            …
          </span>
        ) : it === number ? (
          <span
            key={it}
            aria-current="page"
            className="inline-flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary"
          >
            {it + 1}
          </span>
        ) : (
          <Link
            key={it}
            href={hrefFor(it)}
            className="inline-flex size-9 items-center justify-center rounded-md text-ink hover:bg-surface-strong"
          >
            {it + 1}
          </Link>
        ),
      )}
      <Arrow href={hrefFor(number + 1)} disabled={isLast} dir="next" />
    </nav>
  );
}

function Arrow({ href, disabled, dir }: { href: string; disabled: boolean; dir: "prev" | "next" }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  const cls = "inline-flex size-9 items-center justify-center rounded-md";
  if (disabled) {
    return (
      <span
        data-testid={`pagination-${dir}`}
        aria-disabled="true"
        className={cn(cls, "text-muted-soft")}
      >
        <Icon size={18} />
      </span>
    );
  }
  return (
    <Link
      data-testid={`pagination-${dir}`}
      href={href}
      aria-label={dir === "prev" ? "이전 페이지" : "다음 페이지"}
      className={cn(cls, "text-ink hover:bg-surface-strong")}
    >
      <Icon size={18} />
    </Link>
  );
}

// 공개 export — useSearchParams가 공개 ISR prerender에서 빌드 실패하지 않도록 Suspense 경계 포함.
export function Pagination({ page }: { page: PageMeta }) {
  return (
    <Suspense fallback={<div className="h-9" aria-hidden />}>
      <PaginationControls page={page} />
    </Suspense>
  );
}

export { PaginationControls };
