"use client";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { adminKeys } from "@/lib/admin/queryKeys";
import { notify } from "@/lib/notify";
import { useMe } from "@/lib/auth/useMe";
import { createRole, patchRole, type RoleCreateRequest, type RoleResponse } from "@/lib/api/roles.admin";
import { createRoleSchema, type RoleFormValues } from "./schema";

export interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: RoleResponse;
}

export function RoleFormDialog({ open, onOpenChange, mode, initial }: RoleFormDialogProps) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const maxPriority = me?.maxPriority ?? 0;
  const schema = useMemo(() => createRoleSchema(maxPriority), [maxPriority]);

  const { register, handleSubmit, control, reset, setError, formState: { errors } } = useForm<RoleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initial?.name ?? "", priority: initial?.priority ?? 0, description: initial?.description ?? "" },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      mode === "edit" && initial
        ? { name: initial.name, priority: initial.priority, description: initial.description }
        : { name: "", priority: 0, description: "" },
    );
  }, [open, mode, initial, reset]);

  const mutation = useMutation({
    mutationFn: (v: RoleFormValues) => {
      const body: RoleCreateRequest = { name: v.name, priority: v.priority, description: v.description };
      return mode === "edit" && initial ? patchRole(initial.id, body) : createRole(body);
    },
    onError: adminOnError({
      onDuplicate: () => setError("name", { message: "같은 이름이 이미 있습니다." }),
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof RoleFormValues, { message: fe.reason })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.list("roles") });
      // 자기 보유 역할의 priority/권한이 바뀌면 maxPriority·permissions가 변함 → useMe 게이트 동기화(수정 시).
      if (mode === "edit") qc.invalidateQueries({ queryKey: ["me"] });
      notify.success("저장했습니다.");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "역할 수정" : "역할 등록"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-base">
          <div className="flex flex-col gap-xxs">
            <label htmlFor="role-name" className={cn(typo.bodySm, "text-body")}>이름</label>
            <Input id="role-name" error={errors.name?.message} {...register("name")} />
          </div>
          <div className="flex flex-col gap-xxs">
            <label htmlFor="role-priority" className={cn(typo.bodySm, "text-body")}>우선순위</label>
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Input
                  id="role-priority"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  value={Number.isNaN(field.value) ? "" : String(field.value)}
                  onChange={(e) => field.onChange(e.target.value === "" ? NaN : Number(e.target.value))}
                  error={errors.priority?.message}
                />
              )}
            />
            <p className={cn(typo.caption, "text-muted")}>내 최대 등급: {maxPriority} (같은 등급까지 만들 수 있습니다)</p>
          </div>
          <div className="flex flex-col gap-xxs">
            <label htmlFor="role-description" className={cn(typo.bodySm, "text-body")}>설명(선택)</label>
            <Input id="role-description" error={errors.description?.message} {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="primary" loading={mutation.isPending}>저장</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
