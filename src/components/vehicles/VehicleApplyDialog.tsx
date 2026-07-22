"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LocateFixed, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { ACTION } from "@/constants/actionButton";
import { notify } from "@/lib/notify";
import { formatDate, formatClockTime } from "@/lib/date";
import { getCurrentPosition } from "@/lib/geolocation";
import { kakaoMapPinUrl } from "@/lib/mapLink";
import { useApplyVehicleRequest } from "./queries";
import type { VehicleRunCardResponse } from "@/lib/api/types";

// 백엔드 VehicleRequestCreateRequest 미러(스펙 2026-07-22): 픽업 텍스트·좌표 중 최소 하나.
// 좌표 동반(둘 다/둘 다 없음)은 UI 불변식(attach/clear가 쌍으로 처리)이라 refine 없이 백엔드가 최종 방어.
const applySchema = z
  .object({
    pickupLocation: z.string().trim().max(200, "200자 이내로 입력해 주세요."),
    note: z.string(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
  })
  .refine((v) => v.pickupLocation.trim() !== "" || (v.latitude != null && v.longitude != null), {
    path: ["pickupLocation"],
    message: "픽업 장소를 입력하거나 현재 위치를 첨부해 주세요.",
  });
type ApplyFormValues = z.infer<typeof applySchema>;
const EMPTY: ApplyFormValues = { pickupLocation: "", note: "", latitude: null, longitude: null };

export interface VehicleApplyDialogProps {
  run: VehicleRunCardResponse | null; // null=닫힘
  onOpenChange: (v: boolean) => void;
}

export function VehicleApplyDialog({ run, onOpenChange }: VehicleApplyDialogProps) {
  const apply = useApplyVehicleRequest();
  const open = run != null;
  const [locating, setLocating] = useState(false);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema),
    defaultValues: EMPTY,
  });

  // 열릴 때마다 초기화 — 직전 신청 입력·좌표 잔존 방지.
  useEffect(() => {
    if (open) { reset(EMPTY); setLocating(false); }
  }, [open, reset]);

  const latitude = watch("latitude");
  const longitude = watch("longitude");

  const attachLocation = async () => {
    setLocating(true);
    try {
      const c = await getCurrentPosition();
      setValue("latitude", c.latitude, { shouldValidate: true });
      setValue("longitude", c.longitude, { shouldValidate: true });
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "위치를 가져오지 못했습니다.");
    } finally {
      setLocating(false);
    }
  };

  const clearLocation = () => {
    setValue("latitude", null, { shouldValidate: true });
    setValue("longitude", null, { shouldValidate: true });
  };

  const submit = (v: ApplyFormValues) => {
    if (run == null) return;
    const pickup = v.pickupLocation.trim();
    apply.mutate(
      {
        runId: run.id,
        body: {
          ...(pickup === "" ? {} : { pickupLocation: pickup }),
          ...(v.note.trim() === "" ? {} : { note: v.note }),
          ...(v.latitude != null && v.longitude != null ? { latitude: v.latitude, longitude: v.longitude } : {}),
        },
      },
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
            <label htmlFor="vh-pickup" className={cn(typo.bodySm, "text-body")}>픽업 장소 (선택)</label>
            <Input id="vh-pickup" placeholder="예: ○○아파트 정문" error={errors.pickupLocation?.message} {...register("pickupLocation")} />
            <p className={cn(typo.caption, "text-muted")}>주소를 입력하거나 아래에서 현재 위치를 첨부하세요.</p>
          </div>

          <div className="flex flex-col gap-xxs">
            {latitude != null && longitude != null ? (
              <div className="flex items-center justify-between gap-sm rounded-md border border-hairline p-md">
                <span className={cn(typo.bodySm, "flex items-center gap-xs text-body")}>
                  <MapPin size={18} aria-hidden />
                  위치 첨부됨
                </span>
                <span className="flex items-center gap-sm">
                  <a
                    href={kakaoMapPinUrl(latitude, longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(typo.bodySm, "text-primary underline-offset-4 hover:underline")}
                  >
                    지도에서 확인
                  </a>
                  <button type="button" onClick={clearLocation} aria-label="첨부한 위치 지우기" className="text-muted hover:text-ink">
                    <X size={18} aria-hidden />
                  </button>
                </span>
              </div>
            ) : (
              <Button type="button" variant="secondary" loading={locating} onClick={attachLocation}>
                <LocateFixed size={18} aria-hidden />
                현재 위치 첨부
              </Button>
            )}
            <p className={cn(typo.caption, "text-muted")}>휴대폰에서 누르면 더 정확해요. PC는 위치가 부정확할 수 있어요.</p>
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
