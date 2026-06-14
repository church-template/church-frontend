"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { apiUrl } from "@/lib/auth/apiBase";
import type { GalleryPhotoResponse } from "@/lib/api/types";

interface PhotoLightboxProps {
  photos: GalleryPhotoResponse[];
  albumTitle: string;
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

// 사진 라이트박스 — Radix Dialog 재사용(ESC·포커스트랩·스크롤락·내장 X 닫기 제공).
// 카드 표면(bg-surface-card)을 유지해 내장 X 닫기 버튼이 가시적. 폭만 --container-lightbox로 확장.
export function PhotoLightbox({ photos, albumTitle, index, onIndexChange }: PhotoLightboxProps) {
  const open = index !== null;
  const current = open ? photos[index] : null;
  const hasPrev = open && index > 0;
  const hasNext = open && index < photos.length - 1;

  const go = (delta: number) => {
    if (index === null) return;
    const next = index + delta;
    if (next >= 0 && next < photos.length) onIndexChange(next);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onIndexChange(null);
      }}
    >
      <DialogContent
        className="max-w-[var(--container-lightbox)]"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
      >
        {/* a11y: 제목은 시각적으로 숨기되 aria 연결 유지(가이드 15.2) */}
        <DialogTitle className="sr-only">
          {albumTitle} 사진 {open ? index + 1 : 0} / {photos.length}
        </DialogTitle>

        {current ? (
          <div className="flex flex-col gap-sm">
            <div className="relative flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸 */}
              <img
                src={apiUrl(`/api/media/${current.mediaId}`)}
                alt={current.caption ?? ""}
                /* max-h-[70vh]: 뷰포트 높이 제약(색·간격 토큰이 아닌 레이아웃 값) — dept-hero 70vh 선례와 동일 */
                className="max-h-[70vh] w-auto rounded-md object-contain"
              />
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={!hasPrev}
                aria-label="이전 사진"
                className="absolute left-xs top-1/2 -translate-y-1/2 rounded-full bg-surface-card/80 p-xs text-ink disabled:opacity-30"
              >
                <ChevronLeft size={24} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                disabled={!hasNext}
                aria-label="다음 사진"
                className="absolute right-xs top-1/2 -translate-y-1/2 rounded-full bg-surface-card/80 p-xs text-ink disabled:opacity-30"
              >
                <ChevronRight size={24} aria-hidden />
              </button>
            </div>
            <div className={cn(typo.datetime, "text-center text-muted")}>
              {index! + 1} / {photos.length}
            </div>
            {current.caption ? (
              <p className={cn(typo.caption, "text-center text-muted")}>{current.caption}</p>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
