// src/components/bulletins/BulletinFormDialog.tsx
"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DateTimePicker } from "@/components/admin/DateTimePicker";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { revalidateBulletins } from "@/lib/admin/revalidate";
import { createBulletin, patchBulletin } from "@/lib/api/bulletins.admin";
import { getBulletin } from "@/lib/api/bulletins";
import { bulletinSchema, type BulletinFormValues } from "./schemas";

export interface BulletinFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  bulletinId?: number; // edit 시 필수 — 열 때 getBulletin으로 version·현재값 시드
  onSaved?: () => void;
}

export function BulletinFormDialog({ open, onOpenChange, mode, bulletinId, onSaved }: BulletinFormDialogProps) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [seeding, setSeeding] = useState(false); // edit 시 version 시드 fetch 진행 중 — 제출 차단(stale version 409 방지)
  const { register, handleSubmit, setValue, watch, reset, setError, formState: { errors } } = useForm<BulletinFormValues>({
    resolver: zodResolver(bulletinSchema),
    defaultValues: { title: "", serviceDate: "", mediaId: 0 },
  });
  const serviceDate = watch("serviceDate");
  const mediaId = watch("mediaId");

  // 열릴 때: create는 폼 초기화, edit는 최신 상세(no-store)로 폼·version 시드(시드 중 seeding=true → 제출 차단).
  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      reset({ title: "", serviceDate: "", mediaId: 0 });
      setVersion(0);
      return;
    }
    if (bulletinId == null) return;
    setSeeding(true);
    getBulletin(bulletinId)
      .then((b) => {
        setVersion(b.version);
        reset({ title: b.title, serviceDate: b.serviceDate, mediaId: b.mediaId });
      })
      .catch((e) => adminOnError()(e))
      .finally(() => setSeeding(false));
  }, [open, mode, bulletinId, reset]);

  const mutation = useMutation({
    mutationFn: (v: BulletinFormValues) =>
      mode === "edit" && bulletinId != null
        ? patchBulletin(bulletinId, { version, title: v.title, serviceDate: v.serviceDate, mediaId: v.mediaId })
        : createBulletin({ title: v.title, serviceDate: v.serviceDate, mediaId: v.mediaId }),
    onError: adminOnError({
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof BulletinFormValues, { message: fe.reason })),
      onReedit: () => {
        if (bulletinId != null)
          getBulletin(bulletinId)
            .then((b) => { setVersion(b.version); reset({ title: b.title, serviceDate: b.serviceDate, mediaId: b.mediaId }); })
            .catch((e) => adminOnError()(e));
      },
    }),
    onSuccess: async () => {
      await revalidateBulletins();
      notify.success("저장했습니다.");
      router.refresh();
      onOpenChange(false);
      onSaved?.();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "주보 수정" : "주보 등록"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-base">
          <div className="flex flex-col gap-xxs">
            <label htmlFor="bulletin-title" className={cn(typo.bodySm, "text-body")}>제목</label>
            <Input id="bulletin-title" error={errors.title?.message} {...register("title")} />
          </div>
          <div className="flex flex-col gap-xxs">
            <label htmlFor="bulletin-date" className={cn(typo.bodySm, "text-body")}>예배일</label>
            <DateTimePicker
              id="bulletin-date"
              allDay
              value={serviceDate}
              onChange={(v) => setValue("serviceDate", v, { shouldValidate: true })}
              error={errors.serviceDate?.message}
            />
          </div>
          <div className="flex flex-col gap-xxs">
            <span className={cn(typo.bodySm, "text-body")}>PDF</span>
            <div className="flex items-center gap-sm">
              <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>PDF 선택</Button>
              {mediaId > 0 ? <span className={cn(typo.bodySm, "text-muted")}>선택됨 (media:{mediaId})</span> : null}
            </div>
            {errors.mediaId ? <span className={cn(typo.caption, "text-error")}>{errors.mediaId.message}</span> : null}
          </div>
          <DialogFooter>
            <Button type="submit" variant="primary" loading={mutation.isPending} disabled={seeding}>저장</Button>
          </DialogFooter>
        </form>
        <MediaPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          accept="pdf"
          onConfirm={(ids) => setValue("mediaId", ids[0] ?? 0, { shouldValidate: true })}
        />
      </DialogContent>
    </Dialog>
  );
}
