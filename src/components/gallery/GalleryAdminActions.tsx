// src/components/gallery/GalleryAdminActions.tsx
"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { deleteAlbum } from "@/lib/api/gallery.admin";
import type { GalleryAlbumDetailResponse } from "@/lib/api/types";
import { ACTION, CREATE_ICON } from "@/constants/actionButton";
import { AlbumFormDialog } from "./AlbumFormDialog";

// 목록 toolbar 등록 버튼.
export function AlbumListAction() {
  const [open, setOpen] = useState(false);
  return (
    <RequirePermission permission="GALLERY_WRITE">
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        <CREATE_ICON size={18} aria-hidden />
        새 앨범
      </Button>
      <AlbumFormDialog open={open} onOpenChange={setOpen} mode="create" />
    </RequirePermission>
  );
}

// 상세 수정/삭제. 삭제 성공 시 목록으로 이동 + 캐시 무효화.
export function AlbumDetailActions({ album }: { album: GalleryAlbumDetailResponse }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => deleteAlbum(album.id),
    onError: adminOnError(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["albums"] });
      notify.success("삭제했습니다.");
      setDelOpen(false);
      router.push("/gallery");
    },
  });
  return (
    <RequirePermission permission="GALLERY_WRITE">
      <div className="mt-base flex gap-xs">
        <Button type="button" variant="tertiary" aria-label="앨범 수정" onClick={() => setEditOpen(true)}>
          <ACTION.edit.Icon size={18} aria-hidden />
          <span className="hidden lg:inline">{ACTION.edit.label}</span>
        </Button>
        <Button type="button" variant="tertiary" aria-label="앨범 삭제" onClick={() => setDelOpen(true)}>
          <ACTION.delete.Icon size={18} aria-hidden />
          <span className="hidden lg:inline">{ACTION.delete.label}</span>
        </Button>
      </div>
      <AlbumFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" initial={album} />
      <DeleteConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title="앨범을 삭제할까요?"
        warning="앨범이 공개 목록에서 사라집니다.(사진 원본은 라이브러리에 보존)"
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </RequirePermission>
  );
}
