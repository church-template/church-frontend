"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { notify } from "@/lib/notify";
import { withdraw } from "@/lib/auth/authApi";
import { ApiError } from "@/lib/auth/apiError";
import { handleApiError } from "@/lib/auth/handleApiError";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { withdrawSchema, type WithdrawValues } from "./schemas";

// 회원 자가탈퇴 — 비밀번호 재인증 후 DELETE /api/members/me.
// 비가역(소프트삭제+개인정보 스크럽)이라 다이얼로그로 한 번 더 확인받는다(스펙 §5.2 자가탈퇴).
// 회원 영역 폼이므로 react-hook-form+zod로 통일(가이드 15.1).
export function WithdrawDialog() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<WithdrawValues>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { password: "" },
  });

  const mutation = useMutation({
    mutationFn: (password: string) => withdraw(password), // 성공 시 authApi가 로컬 세션 정리
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["me"] }); // ['me'] 캐시 제거는 호출측 책임
      notify.success("탈퇴가 완료되었습니다. 그동안 함께해 주셔서 감사합니다.");
      router.replace("/");
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        // 비밀번호 불일치는 폼 인라인, 403(마지막 SUPER_ADMIN) 등은 토스트 폴백
        handleApiError(e, { onAuthFailed: (message) => setError("password", { message }) });
      } else {
        notify.error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    },
  });

  // 닫을 때 비밀번호·에러 잔존 방지(민감정보) — 폼 초기화.
  const onOpenChange = (next: boolean) => {
    if (!next) reset();
    setOpen(next);
  };

  const onSubmit = handleSubmit((v) => mutation.mutate(v.password));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        className={cn(
          typo.bodySm,
          "rounded-sm text-muted underline underline-offset-2 hover:text-ink",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        )}
      >
        회원 탈퇴
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>회원 탈퇴</DialogTitle>
          <DialogDescription>
            탈퇴하면 계정과 개인정보가 삭제되고 모든 기기에서 로그아웃되며 되돌릴 수 없습니다.
            계속하려면 현재 비밀번호를 입력해 주세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-md">
          <div className="flex flex-col gap-xxs">
            <label htmlFor="withdraw-password" className={cn(typo.bodySm, "text-ink")}>
              비밀번호
            </label>
            <PasswordInput
              id="withdraw-password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register("password")}
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive" loading={mutation.isPending}>
              탈퇴하기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
