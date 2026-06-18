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
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { createPosition, patchPosition, type PositionCreateRequest } from "@/lib/api/positions.admin";
import type { PositionResponse } from "@/lib/api/types";
import { positionSchema, type PositionFormValues } from "./schema";

export interface PositionFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: PositionResponse;
}

export function PositionFormDialog({ open, onOpenChange, mode, initial }: PositionFormDialogProps) {
  const qc = useQueryClient();
  const { register, handleSubmit, control, reset, setError, formState: { errors } } = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: { name: initial?.name ?? "", sortOrder: initial?.sortOrder ?? null },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      mode === "edit" && initial
        ? { name: initial.name, sortOrder: initial.sortOrder }
        : { name: "", sortOrder: null },
    );
  }, [open, mode, initial, reset]);

  const mutation = useMutation({
    mutationFn: (v: PositionFormValues) => {
      // sortOrder null(비움) → body 생략. create=백엔드 자동부여, edit(PATCH)=미변경.
      const body: PositionCreateRequest = { name: v.name, ...(v.sortOrder !== null ? { sortOrder: v.sortOrder } : {}) };
      return mode === "edit" && initial ? patchPosition(initial.id, body) : createPosition(body);
    },
    onError: adminOnError({
      onDuplicate: () => setError("name", { message: "같은 이름이 이미 있습니다." }),
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof PositionFormValues, { message: fe.reason })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["positions"] });
      notify.success("저장했습니다.");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "직분 수정" : "직분 등록"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-base">
          <div className="flex flex-col gap-xxs">
            <label htmlFor="position-name" className={cn(typo.bodySm, "text-body")}>이름</label>
            <Input id="position-name" error={errors.name?.message} {...register("name")} />
          </div>
          <div className="flex flex-col gap-xxs">
            <label htmlFor="position-sortOrder" className={cn(typo.bodySm, "text-body")}>정렬 순서(선택)</label>
            <Controller
              control={control}
              name="sortOrder"
              render={({ field }) => (
                <Input
                  id="position-sortOrder"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={field.value === null ? "" : String(field.value)}
                  onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                  error={errors.sortOrder?.message}
                />
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="primary" loading={mutation.isPending}>저장</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
