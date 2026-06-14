import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { formatDate } from "@/lib/date";
import { apiUrl } from "@/lib/auth/apiBase";
import type { GalleryAlbumCardResponse } from "@/lib/api/types";

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-xl";

// 앨범 카드 — 16:9 썸네일(첫 사진, 없으면 플레이스홀더) + 제목 + 메타. department-card 호버 재사용.
export function AlbumCard({ album }: { album: GalleryAlbumCardResponse }) {
  return (
    <Link href={`/gallery/albums/${album.id}`} className={cn("block", focusRing)}>
      <Card bordered interactive className="group h-full">
        <div className="aspect-video overflow-hidden">
          {album.thumbnailMediaId != null ? (
            // eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸; next/image 교체는 후속
            <img
              src={apiUrl(`/api/media/${album.thumbnailMediaId}`)}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-strong">
              <ImageOff size={32} className="text-muted" aria-hidden />
            </div>
          )}
        </div>
        <div className="p-xl">
          <h3 className={cn(typo.titleMd, "text-ink")}>{album.title}</h3>
          <p className={cn(typo.datetime, "mt-xxs text-muted")}>
            {formatDate(album.createdAt)} · 사진 {album.photoCount}장
            {album.author ? ` · ${album.author}` : ""}
          </p>
          {album.tags.length > 0 ? (
            <div className="mt-sm flex flex-wrap gap-xs">
              {album.tags.map((t) => (
                <Badge key={t.id}>{t.name}</Badge>
              ))}
            </div>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
