"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import type { TagResponse } from "@/lib/api/types";

// api-docs TagResponse — 정의는 lib/api/types.ts로 이동(T8), 기존 소비처 호환 재export.
export type Tag = TagResponse;

function TagFilterPills({ tags }: { tags: Tag[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("tagId");

  // tagId 교체(또는 제거) + page 리셋. 다른 쿼리(sort 등)는 보존.
  const hrefFor = (tagId: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (tagId == null) params.delete("tagId");
    else params.set("tagId", String(tagId));
    const s = params.toString();
    return s ? `${pathname}?${s}` : pathname;
  };

  const pill = (active: boolean) =>
    cn(
      typo.navLink,
      "inline-flex items-center rounded-pill px-4 py-2 whitespace-nowrap",
      active ? "bg-primary text-on-primary" : "bg-surface-strong text-ink hover:bg-hairline",
    );

  return (
    <div className="flex flex-wrap gap-xs" role="group" aria-label="태그 필터">
      <Link href={hrefFor(null)} aria-pressed={current == null} className={pill(current == null)}>
        전체
      </Link>
      {tags.map((t) => {
        const active = current === String(t.id);
        return (
          <Link key={t.id} href={hrefFor(t.id)} aria-pressed={active} className={pill(active)}>
            {t.name}
          </Link>
        );
      })}
    </div>
  );
}

// 공개 export — useSearchParams Suspense 경계 포함(빌드 게이트).
export function TagFilter({ tags }: { tags: Tag[] }) {
  return (
    <Suspense fallback={<div className="h-10" aria-hidden />}>
      <TagFilterPills tags={tags} />
    </Suspense>
  );
}

export { TagFilterPills };
