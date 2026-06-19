"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { notify } from "@/lib/notify";
import { updateMe } from "@/lib/auth/authApi";
import { ApiError } from "@/lib/auth/apiError";
import { handleApiError } from "@/lib/auth/handleApiError";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { ACTION } from "@/constants/actionButton";
import { passwordChangeSchema, type PasswordChangeValues } from "./schemas";

export function PasswordChangeSection() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { password: "", passwordConfirm: "" },
  });

  const mutation = useMutation({
    mutationFn: (password: string) => updateMe({ password }),
    onSuccess: async () => {
      notify.success("비밀번호가 변경되었습니다.");
      reset();
      setOpen(false);
      // 비번 변경이 세션을 무효화할 수 있음(스펙 §12) — 라이브 상태 재확인.
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        handleApiError(e, {
          onFieldErrors: (fes) => {
            const pw = fes.find((f) => f.field === "password");
            if (pw) setError("password", { message: pw.reason });
            else notify.error(fes[0]?.reason ?? "입력값을 확인해 주세요.");
          },
        });
      } else {
        notify.error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    },
  });

  const onSubmit = handleSubmit((v) => mutation.mutate(v.password));

  if (!open) {
    // 좌측 정렬 유지 — flex 컨테이너 안에서 버튼이 전폭으로 늘어나 가운데 떠 보이는 것 방지.
    return (
      <div className="flex">
        <Button variant="tertiary" onClick={() => setOpen(true)}>비밀번호 변경</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-md">
      <div className="flex flex-col gap-xxs">
        <label htmlFor="me-new-password" className={cn(typo.bodySm, "text-ink")}>새 비밀번호</label>
        <PasswordInput
          id="me-new-password"
          autoComplete="new-password"
          placeholder="8자 이상"
          error={errors.password?.message}
          {...register("password")}
        />
      </div>
      <div className="flex flex-col gap-xxs">
        <label htmlFor="me-new-password-confirm" className={cn(typo.bodySm, "text-ink")}>새 비밀번호 확인</label>
        <PasswordInput
          id="me-new-password-confirm"
          autoComplete="new-password"
          error={errors.passwordConfirm?.message}
          {...register("passwordConfirm")}
        />
      </div>
      {/* 취소→저장 순서: 파괴적 액션 방어(실수 제출 최소화) */}
      <div className="flex gap-sm">
        <Button type="button" variant="tertiary" onClick={() => { reset(); setOpen(false); }}>{ACTION.cancel.label}</Button>
        <Button type="submit" loading={mutation.isPending}>{ACTION.save.label}</Button>
      </div>
    </form>
  );
}
