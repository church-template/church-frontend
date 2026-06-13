"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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

// 회원 자가탈퇴 — 비밀번호 재인증 후 DELETE /api/members/me.
// 비가역(소프트삭제+개인정보 스크럽)이라 다이얼로그로 한 번 더 확인받는다(스펙 §5.2 자가탈퇴).
export function WithdrawDialog() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password === "") {
      setError("비밀번호를 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await withdraw(password); // 성공 시 authApi가 로컬 세션 정리
      queryClient.removeQueries({ queryKey: ["me"] });
      notify.success("탈퇴가 완료되었습니다. 그동안 함께해 주셔서 감사합니다.");
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) {
        // 비밀번호 불일치는 폼 내부에 인라인 표시, 403(마지막 SUPER_ADMIN) 등은 토스트 폴백
        handleApiError(err, {
          onAuthFailed: (message) => setError(message),
        });
      } else {
        notify.error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              error={error}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive" loading={submitting}>
              탈퇴하기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
