"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { ACTION } from "@/constants/actionButton";
import { formatDate, formatClockTime } from "@/lib/date";
import { useApplyVehicleRequest } from "./queries";
import type { VehicleRunCardResponse } from "@/lib/api/types";

// 백엔드 VehicleRequestCreateRequest 제약과 동일(pickupLocation 필수·≤200).
const applySchema = z.object({
  pickupLocation: z.string().trim().min(1, "픽업 장소를 입력해 주세요.").max(200, "200자 이내로 입력해 주세요."),
  note: z.string(),
});
type ApplyFormValues = z.infer<typeof applySchema>;
const EMPTY: ApplyFormValues = { pickupLocation: "", note: "" };

export interface VehicleApplyDialogProps {
  run: VehicleRunCardResponse | null; // null=닫힘
  onOpenChange: (v: boolean) => void;
}

export function VehicleApplyDialog({ run, onOpenChange }: VehicleApplyDialogProps) {
  const apply = useApplyVehicleRequest();
  const open = run != null;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema),
    defaultValues: EMPTY,
  });

  // 열릴 때마다 초기화 — 직전 신청 입력 잔존 방지.
  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open, reset]);

  const submit = (v: ApplyFormValues) => {
    if (run == null) return;
    apply.mutate(
      { runId: run.id, body: { pickupLocation: v.pickupLocation, ...(v.note.trim() === "" ? {} : { note: v.note }) } },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {run ? `${formatDate(run.departsAt)} ${formatClockTime(run.departsAt)} 탑승 신청` : "탑승 신청"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-base">
          <div className="flex flex-col gap-xxs">
            <label htmlFor="vh-pickup" className={cn(typo.bodySm, "text-body")}>픽업 장소 (필수)</label>
            <Input id="vh-pickup" placeholder="예: ○○아파트 정문" error={errors.pickupLocation?.message} {...register("pickupLocation")} />
          </div>
          <div className="flex flex-col gap-xxs">
            <label htmlFor="vh-note" className={cn(typo.bodySm, "text-body")}>메모 (선택)</label>
            <Textarea id="vh-note" rows={3} placeholder="동승 인원·특이사항이 있으면 적어 주세요." {...register("note")} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="tertiary">{ACTION.cancel.label}</Button>
            </DialogClose>
            <Button type="submit" variant="primary" loading={apply.isPending}>신청</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
