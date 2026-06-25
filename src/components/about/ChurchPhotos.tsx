"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import type { PhotoGroup } from "@/constants/content";

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-md";

// 교회사진 공개 페이지 본체 — 카테고리 토글(Tabs) + 그리드 + 확대 모달(Dialog).
// 갤러리 미재사용(자체 컴포넌트), 이미지는 public/ 정적 에셋을 <img>로 직접 렌더.
export function ChurchPhotos({ empty, groups }: { empty: string; groups: PhotoGroup[] }) {
  const [activeKey, setActiveKey] = useState(groups[0]?.key ?? "");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const activeGroup = groups.find((g) => g.key === activeKey) ?? groups[0];
  const photos = activeGroup?.photos ?? [];
  const open = lightboxIndex !== null;
  const current = open ? photos[lightboxIndex] : null;
  const hasPrev = open && lightboxIndex > 0;
  const hasNext = open && lightboxIndex < photos.length - 1;

  const go = (delta: number) => {
    if (lightboxIndex === null) return;
    const next = lightboxIndex + delta;
    if (next >= 0 && next < photos.length) setLightboxIndex(next);
  };

  return (
    <>
      <Tabs
        value={activeKey}
        onValueChange={(v) => {
          setActiveKey(v);
          setLightboxIndex(null); // 묶음 전환 시 모달 닫기
        }}
        className="mt-xl"
      >
        <TabsList>
          {groups.map((g) => (
            <TabsTrigger key={g.key} value={g.key}>
              {g.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {groups.map((g) => (
          <TabsContent key={g.key} value={g.key}>
            {g.photos.length === 0 ? (
              <EmptyState message={empty} className="mt-lg" />
            ) : (
              <div className="mt-lg grid grid-cols-2 gap-xs sm:grid-cols-3 lg:grid-cols-4">
                {g.photos.map((p, i) => (
                  <button
                    key={p.src}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
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
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) setLightboxIndex(null);
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
          {/* a11y: 제목은 시각적으로 숨기되 aria 연결 유지 */}
          <DialogTitle className="sr-only">
            {activeGroup?.title} 사진 {open ? lightboxIndex + 1 : 0} / {photos.length}
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
                {lightboxIndex! + 1} / {photos.length}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
