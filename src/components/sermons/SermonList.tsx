"use client";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { TagFilter } from "@/components/common/TagFilter";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { CardGridSkeleton } from "@/components/common/CardGridSkeleton";
import { formatDate } from "@/lib/date";
import { SermonCard } from "@/components/cards/SermonCard";
import type { SermonListParams } from "@/lib/api/sermons";
import { SermonSearch } from "./SermonSearch";
import { ActiveFilters } from "./ActiveFilters";
import { useSermons, useSermonTags } from "./queries";

// URL 파라미터 정규화 — RSC 시절 parseParams와 동일 검증(useSearchParams는 string|null 시그니처).
function toStr(v: string | null): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}
function toNum(v: string | null): number | undefined {
  const s = toStr(v);
  if (s == null) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined; // NaN 방어
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// 날짜 필터는 yyyy-MM-dd 형식만 통과(비정상 값 백엔드 전달 차단).
function toDate(v: string | null): string | undefined {
  const s = toStr(v);
  return s && DATE_RE.test(s) ? s : undefined;
}

// 목록 클라이언트 — URL(?page·?tagId·?q·?preacher·?series·?from·?to)을 쿼리로,
// 검색/필터/페이지네이션은 URL 갱신 → useSearchParams 재파싱으로 동작(AlbumList 패턴).
export function SermonList() {
  const searchParams = useSearchParams();
  const params: SermonListParams = {
    page: toNum(searchParams.get("page")),
    tagId: toNum(searchParams.get("tagId")),
    q: toStr(searchParams.get("q")),
    preacher: toStr(searchParams.get("preacher")),
    series: toStr(searchParams.get("series")),
    from: toDate(searchParams.get("from")),
    to: toDate(searchParams.get("to")),
  };

  const sermons = useSermons(params);
  const tags = useSermonTags();

  return (
    <div className="mt-lg flex flex-col gap-base">
      <SermonSearch />
      <TagFilter tags={tags.data ?? []} />
      <ActiveFilters />

      {sermons.isPending ? (
        <div className="mt-xl">
          <CardGridSkeleton />
        </div>
      ) : sermons.isError || !sermons.data ? (
        <div className="flex flex-col items-start gap-sm py-xl">
          <p className={cn(typo.bodyMd, "text-muted")}>설교를 불러오지 못했습니다.</p>
          <Button variant="secondary" onClick={() => sermons.refetch()}>
            다시 시도
          </Button>
        </div>
      ) : sermons.data.content.length === 0 ? (
        <EmptyState message="조건에 맞는 설교가 없습니다." className="mt-xl" />
      ) : (
        <>
          <div
            aria-busy={sermons.isPlaceholderData}
            className={cn(
              "mt-xl grid gap-base sm:grid-cols-2 lg:grid-cols-3",
              sermons.isPlaceholderData && "opacity-60 transition-opacity",
            )}
          >
            {sermons.data.content.map((s) => (
              <SermonCard
                key={s.id}
                href={`/sermons/${s.id}`}
                title={s.title}
                preacher={s.preacher}
                date={formatDate(s.preachedAt)}
                series={s.series}
                scripture={s.scripture}
                tags={s.tags.map((t) => t.name)}
              />
            ))}
          </div>
          {sermons.data.page.totalPages > 1 ? (
            <div className="mt-xl">
              <Pagination page={sermons.data.page} scroll={false} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
