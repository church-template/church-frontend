// src/components/admin/MediaPicker.tsx
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { apiUrl } from "@/lib/auth/apiBase";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/Skeleton";
import { adminKeys } from "@/lib/admin/queryKeys";
import { listMedia, type MediaResponse } from "@/lib/api/media.admin";
import { MediaUploader } from "./MediaUploader";

export interface MediaPickerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accept: "image" | "pdf";
  multiple?: boolean;
  onConfirm: (mediaIds: number[]) => void;
}

export function MediaPicker({ open, onOpenChange, accept, multiple = false, onConfirm }: MediaPickerProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const params = { type: accept };
  const media = useQuery({
    queryKey: adminKeys.list("media", params),
    queryFn: () => listMedia(params),
    enabled: open,
    retry: false,
  });

  function toggle(id: number) {
    setSelected((prev) =>
      multiple ? (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]) : [id],
    );
  }
  function handleUploaded(uploaded: MediaResponse[]) {
    const ids = uploaded.map((m) => m.id);
    setSelected((prev) => (multiple ? [...prev, ...ids] : ids.slice(-1)));
    media.refetch();
  }
  function confirm() {
    onConfirm(selected);
    setSelected([]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSelected([]); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>미디어 선택</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="library">
          <TabsList>
            <TabsTrigger value="library">라이브러리</TabsTrigger>
            <TabsTrigger value="upload">새 업로드</TabsTrigger>
          </TabsList>
          <TabsContent value="library">
            {media.isPending ? (
              <div className="grid grid-cols-2 gap-xs sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square w-full" />
                ))}
              </div>
            ) : !media.data || media.data.content.length === 0 ? (
              <EmptyState message="라이브러리에 미디어가 없습니다." />
            ) : (
              <div className="grid grid-cols-2 gap-xs sm:grid-cols-3">
                {media.data.content.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    aria-pressed={selected.includes(m.id)}
                    className={cn(
                      "rounded-md border text-left",
                      selected.includes(m.id) ? "border-primary ring-1 ring-primary" : "border-hairline",
                    )}
                  >
                    {accept === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸
                      <img src={apiUrl(`/api/media/${m.id}`)} alt={m.filename} className="aspect-square w-full rounded-md object-cover" />
                    ) : (
                      <span className={cn(typo.bodySm, "block truncate p-sm text-ink")}>{m.filename}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="upload">
            <MediaUploader accept={accept} multiple={multiple} onUploaded={handleUploaded} />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => { setSelected([]); onOpenChange(false); }}>
            취소
          </Button>
          <Button type="button" variant="primary" disabled={selected.length === 0} onClick={confirm}>
            선택 ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
