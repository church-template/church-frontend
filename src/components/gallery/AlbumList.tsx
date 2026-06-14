"use client";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { TagFilter } from "@/components/common/TagFilter";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { GALLERY_PAGE_SIZE } from "@/lib/api/gallery";
import { useAlbums, useGalleryTags } from "./queries";
import { AlbumCard } from "./AlbumCard";
import { AlbumCardSkeleton } from "./AlbumCardSkeleton";

function toNum(v: string | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined; // NaN 방어
}

// 목록 클라이언트 — URL(?page·?tagId)을 쿼리로, TagFilter/Pagination은 Link 네비로 URL을 갱신.
export function AlbumList() {
  const searchParams = useSearchParams();
  const page = toNum(searchParams.get("page")) ?? 0;
  const tagId = toNum(searchParams.get("tagId"));

  const albums = useAlbums({ page, tagId });
  const tags = useGalleryTags();

  return (
    <div className="mt-lg flex flex-col gap-base">
      <TagFilter tags={tags.data ?? []} />

      {albums.isPending ? (
        <div className="grid gap-base sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: GALLERY_PAGE_SIZE }).map((_, i) => (
            <AlbumCardSkeleton key={i} />
          ))}
        </div>
      ) : albums.isError || !albums.data ? (
        <div className="flex flex-col items-start gap-sm py-xl">
          <p className={cn(typo.bodySm, "text-muted")}>앨범을 불러오지 못했습니다.</p>
          <Button variant="secondary" onClick={() => albums.refetch()}>
            다시 시도
          </Button>
        </div>
      ) : albums.data.content.length === 0 ? (
        <EmptyState message="등록된 앨범이 없습니다." className="mt-xl" />
      ) : (
        <>
          <div className="grid gap-base sm:grid-cols-2 lg:grid-cols-3">
            {albums.data.content.map((a) => (
              <AlbumCard key={a.id} album={a} />
            ))}
          </div>
          {albums.data.page.totalPages > 1 ? (
            <div className="mt-xl">
              <Pagination page={albums.data.page} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
