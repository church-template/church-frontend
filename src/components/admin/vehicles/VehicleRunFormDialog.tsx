"use client";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { DateTimePicker } from "@/components/admin/DateTimePicker";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { adminKeys } from "@/lib/admin/queryKeys";
import { notify } from "@/lib/notify";
import { ACTION } from "@/constants/actionButton";
import { toLocalInput, toServerDateTime } from "@/lib/date";
import { createVehicleRun, patchVehicleRun } from "@/lib/api/vehicles.admin";
import type { VehicleRunDetailResponse } from "@/lib/api/types";

const runSchema = z.object({
  departsAt: z.string().min(1, "출발 시각을 선택해 주세요."),
  note: z.string(),
});
type RunFormValues = z.infer<typeof runSchema>;
const EMPTY: RunFormValues = { departsAt: "", note: "" };

export interface VehicleRunFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editTarget: VehicleRunDetailResponse | null; // null=생성. 단건 GET 없음 — 행 값 시드(tag-form-modal 패턴)
}

export function VehicleRunFormDialog({ open, onOpenChange, editTarget }: VehicleRunFormDialogProps) {
  const qc = useQueryClient();
  const isEdit = editTarget != null;

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<RunFormValues>({
    resolver: zodResolver(runSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    if (editTarget) reset({ departsAt: toLocalInput(editTarget.departsAt), note: editTarget.note ?? "" });
    else reset(EMPTY);
  }, [open, editTarget, reset]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: adminKeys.listAll("vehicle-runs") });
    void qc.invalidateQueries({ queryKey: ["vehicle-runs"] }); // 운영자 겸 교인 세션의 회원 목록 동기화
  };

  const mutation = useMutation({
    mutationFn: (v: RunFormValues) => {
      if (isEdit) {
        // PATCH는 두 필드 모두 전송 — note 비움=삭제 의도(빈 문자열로 비운다).
        return patchVehicleRun(editTarget.id, {
          departsAt: toServerDateTime(v.departsAt),
          note: v.note,
          version: editTarget.version,
        });
      }
      const note = v.note.trim() === "" ? undefined : v.note;
      return createVehicleRun({ departsAt: toServerDateTime(v.departsAt), ...(note === undefined ? {} : { note }) });
    },
    onError: adminOnError({
      // 단건 GET 없음 — 최신 version 재시드는 목록 재조회로 하고 대화상자는 닫아 재진입을 유도.
      onReedit: () => {
        invalidate();
        onOpenChange(false);
      },
    }),
    onSuccess: () => {
      invalidate();
      notify.success("저장했습니다.");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "운행일 수정" : "새 운행일"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-base">
          <div className="flex flex-col gap-xxs">
            <label htmlFor="vr-departsAt" className={cn(typo.bodySm, "text-body")}>출발 시각</label>
            <Controller
              control={control}
              name="departsAt"
              render={({ field }) => (
                <DateTimePicker id="vr-departsAt" value={field.value} onChange={field.onChange} error={errors.departsAt?.message} />
              )}
            />
          </div>
          <div className="flex flex-col gap-xxs">
            <label htmlFor="vr-note" className={cn(typo.bodySm, "text-body")}>메모 (선택)</label>
            <Textarea id="vr-note" rows={3} placeholder="노선·경유지 등 교인에게 보여줄 안내" {...register("note")} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="tertiary">{ACTION.cancel.label}</Button>
            </DialogClose>
            <Button type="submit" variant="primary" loading={mutation.isPending}>{ACTION.save.label}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
