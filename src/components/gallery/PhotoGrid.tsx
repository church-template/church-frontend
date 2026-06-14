"use client";
import { useState } from "react";
import { apiUrl } from "@/lib/auth/apiBase";
import { EmptyState } from "@/components/common/EmptyState";
import { PhotoLightbox } from "./PhotoLightbox";
import type { GalleryPhotoResponse } from "@/lib/api/types";

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-md";

// 균일 정사각 썸네일 그리드 + 라이트박스 상태(열린 사진 index).
export function PhotoGrid({ photos, albumTitle }: { photos: GalleryPhotoResponse[]; albumTitle: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return <EmptyState message="등록된 사진이 없습니다." className="mt-lg" />;
  }

  return (
    <>
      <div className="mt-lg grid grid-cols-2 gap-xs sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            aria-label={`${i + 1}번째 사진 크게 보기`}
            className={focusRing}
          >
            <span className="block aspect-square overflow-hidden rounded-md">
              {/* eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸 */}
              <img
                src={apiUrl(`/api/media/${p.mediaId}`)}
                alt={p.caption ?? ""}
                className="h-full w-full object-cover transition-transform duration-300 ease-out hover:scale-[1.03]"
              />
            </span>
          </button>
        ))}
      </div>
      <PhotoLightbox photos={photos} albumTitle={albumTitle} index={openIndex} onIndexChange={setOpenIndex} />
    </>
  );
}
