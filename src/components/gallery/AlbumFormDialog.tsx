// src/components/gallery/AlbumFormDialog.tsx
"use client";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { TagMultiSelect } from "@/components/admin/TagMultiSelect";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { createAlbum, patchAlbum } from "@/lib/api/gallery.admin";
import type { GalleryAlbumDetailResponse } from "@/lib/api/types";
import { albumSchema, type AlbumFormValues } from "./schemas";

export interface AlbumFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: GalleryAlbumDetailResponse;
}

export function AlbumFormDialog({ open, onOpenChange, mode, initial }: AlbumFormDialogProps) {
  const qc = useQueryClient();
  const { register, handleSubmit, control, reset, setError, formState: { errors } } = useForm<AlbumFormValues>({
    resolver: zodResolver(albumSchema),
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      tagIds: initial?.tags.map((t) => t.id) ?? [],
    },
  });

  // 열릴 때마다 베이스라인으로 리셋 — create는 빈 폼, edit는 initial 값(재오픈 시 이전 입력 잔존 방지).
  useEffect(() => {
    if (!open) return;
    reset(
      mode === "edit" && initial
        ? { title: initial.title, description: initial.description ?? "", tagIds: initial.tags.map((t) => t.id) }
        : { title: "", description: "", tagIds: [] },
    );
  }, [open, mode, initial, reset]);

  const mutation = useMutation({
    mutationFn: (v: AlbumFormValues) => {
      const body = { title: v.title, description: v.description.trim() === "" ? undefined : v.description, tagIds: v.tagIds };
      return mode === "edit" && initial
        ? patchAlbum(initial.id, { ...body, version: initial.version })
        : createAlbum(body);
    },
    onError: adminOnError({
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof AlbumFormValues, { message: fe.reason })),
      onReedit: () => qc.invalidateQueries({ queryKey: initial ? ["album", initial.id] : ["albums"] }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["albums"] });
      if (initial) qc.invalidateQueries({ queryKey: ["album", initial.id] });
      notify.success("저장했습니다.");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "앨범 수정" : "앨범 등록"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-base">
          <div className="flex flex-col gap-xxs">
            <label htmlFor="album-title" className={cn(typo.bodySm, "text-body")}>제목</label>
            <Input id="album-title" error={errors.title?.message} {...register("title")} />
          </div>
          <div className="flex flex-col gap-xxs">
            <label htmlFor="album-desc" className={cn(typo.bodySm, "text-body")}>설명</label>
            <Controller
              control={control}
              name="description"
              render={({ field }) => <MarkdownEditor id="album-desc" value={field.value} onChange={field.onChange} error={errors.description?.message} />}
            />
          </div>
          <Controller control={control} name="tagIds" render={({ field }) => <TagMultiSelect value={field.value} onChange={field.onChange} />} />
          <DialogFooter>
            <Button type="submit" variant="primary" loading={mutation.isPending}>저장</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
