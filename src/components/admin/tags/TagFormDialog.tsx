"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { createTag, patchTag } from "@/lib/api/tags.admin";
import { revalidateTags } from "@/lib/admin/revalidate";
import type { TagResponse } from "@/lib/api/types";
import { tagSchema, type TagFormValues } from "./schema";

export interface TagFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: TagResponse;
}

export function TagFormDialog({ open, onOpenChange, mode, initial }: TagFormDialogProps) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: { name: initial?.name ?? "" },
  });

  // 열릴 때 베이스라인 리셋(재오픈 시 이전 입력 잔존 방지). AlbumFormDialog 선례 — effect+reset만(setState-in-effect 아님).
  useEffect(() => {
    if (!open) return;
    reset({ name: mode === "edit" && initial ? initial.name : "" });
  }, [open, mode, initial, reset]);

  const mutation = useMutation({
    mutationFn: (v: TagFormValues) =>
      mode === "edit" && initial ? patchTag(initial.id, { name: v.name }) : createTag({ name: v.name }),
    onError: adminOnError({
      onDuplicate: () => setError("name", { message: "같은 이름이 이미 있습니다." }),
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof TagFormValues, { message: fe.reason })),
    }),
    onSuccess: async () => {
      await revalidateTags();
      qc.invalidateQueries({ queryKey: ["tags"] });
      notify.success("저장했습니다.");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "태그 수정" : "태그 등록"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-base">
          <div className="flex flex-col gap-xxs">
            <label htmlFor="tag-name" className={cn(typo.bodySm, "text-body")}>이름</label>
            <Input id="tag-name" error={errors.name?.message} {...register("name")} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="primary" loading={mutation.isPending}>저장</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
