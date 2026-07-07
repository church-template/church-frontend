"use client";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { adminKeys } from "@/lib/admin/queryKeys";
import { ACTION } from "@/constants/actionButton";
import { ApiError } from "@/lib/auth/apiError";
import { BIBLE_BOOKS, chapterCount, dailyGoalOf, challengeEndDate } from "@/constants/bible";
import { fetchChallenge } from "@/lib/api/challenges";
import { createChallenge, patchChallenge } from "@/lib/api/challenges.admin";
import { challengeSchema, type ChallengeFormValues } from "./schema";

export interface ChallengeFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  editId?: number; // edit 시 필수 — 열 때 fresh 상세로 version·값 시드
}

const EMPTY: ChallengeFormValues = {
  title: "", description: "", startBook: 1, endBook: 66, startDate: "", targetDays: 365,
};

// 전체/구약/신약 — 두 필드로 표현되는 대표 구간(백엔드 설계 §1 근거).
const PRESETS = [
  { label: "전체", startBook: 1, endBook: 66 },
  { label: "구약", startBook: 1, endBook: 39 },
  { label: "신약", startBook: 40, endBook: 66 },
] as const;

export function ChallengeFormDialog({ open, onOpenChange, mode, editId }: ChallengeFormDialogProps) {
  const qc = useQueryClient();
  const isEdit = mode === "edit" && editId != null;
  const [banner, setBanner] = useState<string | undefined>(); // 400 detail(참여자 존재 시 범위·기간 거부 — 스펙 §7)

  // targetDays만 coerce(네이티브 input) — 입력·출력 타입이 갈려 useForm 제네릭 셋 다 명시(ReadDialog 선례).
  const { register, handleSubmit, control, reset, setError, setValue, watch, formState: { errors } } =
    useForm<z.input<typeof challengeSchema>, unknown, ChallengeFormValues>({
      resolver: zodResolver(challengeSchema), defaultValues: EMPTY,
    });

  // edit: fresh 상세로 version·값 시드(DepartmentFormDialog 선례 — staleTime/gcTime 0, retry false).
  const detail = useQuery({
    queryKey: adminKeys.detail("challenges", editId ?? 0),
    queryFn: () => fetchChallenge(editId as number),
    enabled: open && isEdit,
    staleTime: 0, gcTime: 0, retry: false,
  });
  const version = detail.data?.version ?? 0;
  const canSubmit = mode === "create" || (!!detail.data && !detail.isFetching && !detail.isError);

  useEffect(() => {
    if (!open) return;
    setBanner(undefined);
    if (mode === "create") reset(EMPTY);
    else if (detail.data) {
      const d = detail.data;
      reset({
        title: d.title, description: d.description ?? "",
        startBook: d.startBook, endBook: d.endBook, startDate: d.startDate, targetDays: d.targetDays,
      });
    }
  }, [open, mode, detail.data, reset]);

  useEffect(() => {
    if (detail.isError) adminOnError()(detail.error);
  }, [detail.isError, detail.error]);

  const mutation = useMutation({
    mutationFn: (v: ChallengeFormValues) => {
      const body = {
        title: v.title,
        ...(v.description.trim() === "" ? {} : { description: v.description }),
        startBook: v.startBook, endBook: v.endBook, startDate: v.startDate, targetDays: v.targetDays,
      };
      return isEdit ? patchChallenge(editId as number, { ...body, version }) : createChallenge(body);
    },
    onError: (e: unknown) => {
      // 참여자 존재 시 범위·기간 수정 거부(400) → 폼 상단 배너(스펙 §7). 그 외는 공통 처리.
      if (e instanceof ApiError && e.errorCode === "INVALID_INPUT_VALUE" && e.detail && !e.errors?.length) {
        setBanner(e.detail);
        return;
      }
      adminOnError({
        onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof ChallengeFormValues, { message: fe.reason })),
        onReedit: () => { if (isEdit) void detail.refetch(); },
      })(e);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenges"] });
      if (isEdit) qc.invalidateQueries({ queryKey: ["challenge", editId], exact: true });
      notify.success("저장했습니다.");
      onOpenChange(false);
    },
  });

  // 파생 미리보기(실시간) — 생성 후 진실은 서버 응답(스펙 §4).
  const [wStart, wEnd, wDate, wDays] = watch(["startBook", "endBook", "startDate", "targetDays"]);
  const total = wStart >= 1 && wEnd <= 66 && wStart <= wEnd ? chapterCount(Number(wStart), Number(wEnd)) : null;
  const days = Number(wDays);
  const preview =
    total != null && Number.isInteger(days) && days >= 1
      ? `총 ${total}장 · 하루 ${dailyGoalOf(total, days)}장${wDate ? ` · ${challengeEndDate(wDate, days)} 종료` : ""}`
      : null;

  const bookSelect = (field: { value: number; onChange: (v: number) => void }, id: string) => (
    <select
      id={id}
      className={cn(typo.bodyMd, "h-12 rounded-md border border-hairline bg-canvas px-4 text-ink",
        "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary outline-hidden")}
      value={String(field.value)}
      onChange={(e) => field.onChange(Number(e.target.value))}
    >
      {BIBLE_BOOKS.map((b, i) => (
        <option key={b.name} value={i + 1}>{b.name}</option>
      ))}
    </select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "챌린지 수정" : "새 챌린지"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => { if (canSubmit) mutation.mutate(v); })} className="flex flex-col gap-base">
          {banner ? (
            <p role="alert" className={cn(typo.bodySm, "rounded-md bg-surface-soft p-md text-error")}>{banner}</p>
          ) : null}
          <div className="flex flex-col gap-xxs">
            <label htmlFor="ch-title" className={cn(typo.bodySm, "text-body")}>제목</label>
            <Input id="ch-title" error={errors.title?.message} {...register("title")} />
          </div>
          <div className="flex flex-col gap-xxs">
            <span className={cn(typo.bodySm, "text-body")}>범위</span>
            <div className="flex gap-xs">
              {PRESETS.map((p) => (
                <Button key={p.label} type="button" variant="secondary"
                  onClick={() => { setValue("startBook", p.startBook, { shouldValidate: true }); setValue("endBook", p.endBook, { shouldValidate: true }); }}>
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="mt-xs grid grid-cols-2 gap-sm">
              <div className="flex flex-col gap-xxs">
                <label htmlFor="ch-startBook" className={cn(typo.caption, "text-muted")}>시작 권</label>
                <Controller control={control} name="startBook" render={({ field }) => bookSelect(field, "ch-startBook")} />
              </div>
              <div className="flex flex-col gap-xxs">
                <label htmlFor="ch-endBook" className={cn(typo.caption, "text-muted")}>끝 권</label>
                <Controller control={control} name="endBook" render={({ field }) => bookSelect(field, "ch-endBook")} />
              </div>
            </div>
            {errors.endBook?.message ? <p className={cn(typo.caption, "text-error")}>{errors.endBook.message}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="flex flex-col gap-xxs">
              <label htmlFor="ch-startDate" className={cn(typo.bodySm, "text-body")}>시작일</label>
              <Input id="ch-startDate" type="date" error={errors.startDate?.message} {...register("startDate")} />
            </div>
            <div className="flex flex-col gap-xxs">
              <label htmlFor="ch-targetDays" className={cn(typo.bodySm, "text-body")}>목표 일수</label>
              {/* min/step(네이티브 제약)은 넣지 않는다 — jsdom이 submit 이벤트를 조용히 가로막아
                  RHF+zod 검증 메시지가 뜨지 않는 문제가 재현된다(ReadDialog 선례). 검증은 zod가 전담. */}
              <Input id="ch-targetDays" type="number" inputMode="numeric"
                error={errors.targetDays?.message} {...register("targetDays")} />
            </div>
          </div>
          {preview ? <p className={cn(typo.bodySm, "text-primary")}>{preview}</p> : null}
          <div className="flex flex-col gap-xxs">
            <span className={cn(typo.bodySm, "text-body")}>소개(선택)</span>
            <Controller control={control} name="description"
              render={({ field }) => <MarkdownEditor value={field.value} onChange={field.onChange} id="ch-description" rows={5} />} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="tertiary">{ACTION.cancel.label}</Button>
            </DialogClose>
            <Button type="submit" variant="primary" loading={mutation.isPending} disabled={!canSubmit}>{ACTION.save.label}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
