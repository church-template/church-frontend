// src/components/sermons/ActiveFilters.tsx
"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface FilterChip {
  label: string;
  remove: string[]; // 제거할 쿼리 키
}

// 순수 변환 — 활성 필터를 사람이 읽는 칩으로. tagId는 TagFilter가 이미 표시하므로 제외(스펙 §4).
export function buildChips(sp: URLSearchParams): FilterChip[] {
  const chips: FilterChip[] = [];
  const q = sp.get("q");
  const preacher = sp.get("preacher");
  const series = sp.get("series");
  const from = sp.get("from");
  const to = sp.get("to");
  if (q) chips.push({ label: `검색: "${q}"`, remove: ["q"] });
  if (preacher) chips.push({ label: `설교자: ${preacher}`, remove: ["preacher"] });
  if (series) chips.push({ label: `시리즈: ${series}`, remove: ["series"] });
  if (from || to) {
    chips.push({ label: `기간: ${from ?? "처음"} ~ ${to ?? "끝"}`, remove: ["from", "to"] });
  }
  return chips;
}

function ActiveFilterChips() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const chips = buildChips(searchParams);
  if (chips.length === 0) return null;

  const hrefWithout = (keys: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    keys.forEach((k) => params.delete(k));
    params.delete("page");
    const s = params.toString();
    return s ? `${pathname}?${s}` : pathname;
  };

  return (
    <div className="flex flex-wrap gap-xs" aria-label="적용된 필터">
      {chips.map((c) => (
        <Link
          key={c.label}
          href={hrefWithout(c.remove)}
          aria-label={`${c.label} 필터 제거`}
          className={cn(
            typo.captionStrong,
            "inline-flex items-center gap-xxs rounded-sm bg-primary-soft px-3 py-1 text-primary",
          )}
        >
          {c.label}
          <X size={14} aria-hidden />
        </Link>
      ))}
    </div>
  );
}

// 공개 export — Suspense 경계(useSearchParams 빌드 게이트).
export function ActiveFilters() {
  return (
    <Suspense fallback={null}>
      <ActiveFilterChips />
    </Suspense>
  );
}

export { ActiveFilterChips };
