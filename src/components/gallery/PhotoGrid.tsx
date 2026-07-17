// src/components/gallery/PhotoGrid.tsx
"use client";
import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/auth/apiBase";
import { EmptyState } from "@/components/common/EmptyState";
import { PhotoLightbox } from "./PhotoLightbox";
import { AddPhotosButton, RemovePhotoButton } from "./GalleryPhotoManager";
import type { GalleryPhotoResponse } from "@/lib/api/types";

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-md";

// albumId 제공 시 어드민 관리 UI 활성. 미제공(공개) 시 기존 동작 그대로 — PhotoGrid는 쿼리 훅 미사용.
export function PhotoGrid({
  photos,
  albumTitle,
  albumId,
}: {
  photos: GalleryPhotoResponse[];
  albumTitle: string;
  albumId?: number;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      {albumId != null ? <AddPhotosButton albumId={albumId} /> : null}

      {photos.length === 0 ? (
        <EmptyState message="등록된 사진이 없습니다." className="mt-lg" />
      ) : (
        <div className="mt-lg grid grid-cols-2 gap-xs sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <div key={p.id} className="relative">
              <button
                type="button"
                onClick={() => setOpenIndex(i)}
                aria-label={`${i + 1}번째 사진 크게 보기`}
                className={cn("block w-full", focusRing)}
              >
                {/* fill 모드는 부모 relative 필수(next/image 규약) */}
                <span className="relative block aspect-square overflow-hidden rounded-md">
                  <Image
                    src={apiUrl(`/api/media/${p.mediaId}`)}
                    alt={p.caption ?? ""}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform duration-300 ease-out hover:scale-[1.03]"
                  />
                </span>
              </button>
              {albumId != null ? <RemovePhotoButton albumId={albumId} photoId={p.id} /> : null}
            </div>
          ))}
        </div>
      )}
      <PhotoLightbox photos={photos} albumTitle={albumTitle} index={openIndex} onIndexChange={setOpenIndex} />
    </>
  );
}
