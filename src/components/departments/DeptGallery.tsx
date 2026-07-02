"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import type { DeptPhoto } from "@/constants/departments";

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-md";

// 활동 사진 — 회색 밴드(풀블리드) 위 그리드 + 확대 모달(ChurchPhotos 라이트박스 패턴, 카테고리 탭 없음).
// 소개 직후 배치라 감정 후크를 조기 노출하고, 밴드 리듬(흰↔회색 교차)을 위해 surface-soft 밴드로 감싼다.
// 정적 public 에셋을 <img>로 직접 렌더(멤버 갤러리 PhotoLightbox와 분리).
export function DeptGallery({ heading, photos }: { heading: string; photos: DeptPhoto[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const open = index !== null;
  const current = open ? photos[index] : null;
  const hasPrev = open && index > 0;
  const hasNext = open && index < photos.length - 1;

  const go = (delta: number) => {
    if (index === null) return;
    const next = index + delta;
    if (next >= 0 && next < photos.length) setIndex(next);
  };

  return (
    <section className="bg-surface-soft py-section">
      <Container>
        <h2 className={cn(typo.displayMd, "text-ink")}>{heading}</h2>
        <div className="mt-lg grid grid-cols-2 gap-xs sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <button
              key={p.src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}번째 사진 크게 보기`}
              className={cn("block w-full", focusRing)}
            >
              <span className="block aspect-square overflow-hidden rounded-md">
                {/* eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸 */}
                <img
                  src={p.src}
                  alt={p.alt}
                  className="h-full w-full object-cover transition-transform duration-300 ease-out hover:scale-[1.03]"
                />
              </span>
            </button>
          ))}
        </div>

        <Dialog
          open={open}
          onOpenChange={(o) => {
            if (!o) setIndex(null);
          }}
        >
          <DialogContent
            className="max-w-[var(--container-lightbox)]"
            aria-describedby={undefined}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") go(-1);
              if (e.key === "ArrowRight") go(1);
            }}
          >
            <DialogTitle className="sr-only">
              {heading} 사진 {open ? index + 1 : 0} / {photos.length}
            </DialogTitle>
            {current ? (
              <div className="flex flex-col gap-sm">
                <div className="relative flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸 */}
                  <img
                    src={current.src}
                    alt={current.alt}
                    className="max-h-[70vh] w-auto rounded-md object-contain"
                  />
                  <Button
                    type="button"
                    variant="tertiary"
                    iconOnly
                    onClick={() => go(-1)}
                    disabled={!hasPrev}
                    aria-label="이전 사진"
                    className="absolute left-xs top-1/2 -translate-y-1/2 rounded-full bg-surface-card/80 p-xs text-ink disabled:opacity-30"
                  >
                    <ChevronLeft size={24} aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="tertiary"
                    iconOnly
                    onClick={() => go(1)}
                    disabled={!hasNext}
                    aria-label="다음 사진"
                    className="absolute right-xs top-1/2 -translate-y-1/2 rounded-full bg-surface-card/80 p-xs text-ink disabled:opacity-30"
                  >
                    <ChevronRight size={24} aria-hidden />
                  </Button>
                </div>
                <div className={cn(typo.datetime, "text-center text-muted")}>
                  {index! + 1} / {photos.length}
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </Container>
    </section>
  );
}
