// src/components/gallery/GalleryPhotoManager.tsx
"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { addPhotos, removePhoto } from "@/lib/api/gallery.admin";

// 갤러리 사진 관리(DESIGN gallery-photo-manager). 회원 client 캐시 무효화(ISR 아님).
function useGalleryInvalidate(albumId: number) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["albums"] }); // 목록 썸네일·count
    qc.invalidateQueries({ queryKey: ["album", albumId] }); // 열린 상세
  };
}

// 앨범 상세 상단 "사진 추가" — MediaPicker(image·multi)로 기존/신규 선택 → addPhotos(mediaIds).
export function AddPhotosButton({ albumId }: { albumId: number }) {
  const [open, setOpen] = useState(false);
  const invalidate = useGalleryInvalidate(albumId);
  const add = useMutation({
    mutationFn: (ids: number[]) => addPhotos(albumId, ids),
    onError: adminOnError(),
    onSuccess: () => { notify.success("사진을 추가했습니다."); invalidate(); },
  });
  return (
    <RequirePermission permission="GALLERY_WRITE">
      <div className="mt-lg flex justify-end">
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>사진 추가</Button>
      </div>
      <MediaPicker
        open={open}
        onOpenChange={setOpen}
        accept="image"
        multiple
        onConfirm={(ids) => { if (ids.length > 0) add.mutate(ids); }}
      />
    </RequirePermission>
  );
}

// 사진별 제거 오버레이(라이트박스 트리거 button 밖 형제 — 중첩 button 금지). 확인 후 un-link(원본 보존).
export function RemovePhotoButton({ albumId, photoId }: { albumId: number; photoId: number }) {
  const [open, setOpen] = useState(false);
  const invalidate = useGalleryInvalidate(albumId);
  const remove = useMutation({
    mutationFn: () => removePhoto(photoId),
    onError: adminOnError(),
    onSuccess: () => { notify.success("사진을 제거했습니다."); setOpen(false); invalidate(); },
  });
  return (
    <RequirePermission permission="GALLERY_WRITE">
      {/* iconOnly 흡수: 오버레이 위치·크기 className이 마지막이라 iconOnly 기본값(size-9)을 덮는다 */}
      <Button
        type="button"
        variant="tertiary"
        iconOnly
        aria-label="사진 제거"
        onClick={() => setOpen(true)}
        className="absolute right-xs top-xs size-8 rounded-full bg-surface-dark/60 text-on-dark hover:bg-surface-dark/80"
      >
        <X size={16} aria-hidden />
      </Button>
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="사진을 제거할까요?"
        warning="앨범에서 제거됩니다.(원본은 라이브러리에 보존)"
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </RequirePermission>
  );
}
