"use client";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { formatDate } from "@/lib/date";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { useAlbum } from "./queries";
import { PhotoGrid } from "./PhotoGrid";

// 상세 클라이언트 — 제목·메타·태그·description(마크다운)·사진 그리드.
export function AlbumDetail({ id }: { id: number }) {
  const { data: album, isPending, isError, refetch } = useAlbum(id);

  return (
    <div>
      <Link
        href="/gallery"
        className={cn(typo.bodySm, "inline-flex items-center gap-xxs text-muted hover:text-ink")}
      >
        <ChevronLeft size={18} aria-hidden /> 갤러리
      </Link>

      {isPending ? (
        <div className="mt-lg flex flex-col gap-md" aria-hidden>
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-lg h-64 w-full rounded-xl" />
        </div>
      ) : isError || !album ? (
        <div className="mt-lg flex flex-col items-start gap-sm">
          <p className={cn(typo.bodySm, "text-muted")}>앨범을 불러오지 못했습니다.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            다시 시도
          </Button>
        </div>
      ) : (
        <>
          <h1 className={cn(typo.displaySm, "mt-base text-ink")}>{album.title}</h1>
          <p className={cn(typo.datetime, "mt-xs text-muted")}>
            {formatDate(album.createdAt)} · 사진 {album.photos.length}장
            {album.author ? ` · ${album.author}` : ""}
          </p>
          {album.tags.length > 0 ? (
            <div className="mt-base flex flex-wrap gap-xs">
              {album.tags.map((t) => (
                <Link key={t.id} href={`/gallery?tagId=${t.id}`}>
                  <Badge>{t.name}</Badge>
                </Link>
              ))}
            </div>
          ) : null}
          {album.description ? (
            <>
              <div className="mt-lg border-t border-hairline" />
              <MarkdownContent source={album.description} className="mt-lg" />
            </>
          ) : null}
          <PhotoGrid photos={album.photos} albumTitle={album.title} />
        </>
      )}
    </div>
  );
}
