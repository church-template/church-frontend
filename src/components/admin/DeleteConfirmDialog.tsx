"use client";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  warning?: ReactNode; // 경고문(파괴적 영향 안내)
  requirePassword?: boolean; // 위험 작업 — 비밀번호 재인증
  confirmLabel?: string; // 기본 "삭제"
  pending?: boolean; // 진행 중(이중 제출 방지)
  onConfirm: (ctx?: { password?: string }) => void;
}

// 파괴적 확인 모달. 친화 장치는 색이 아니라 경고문 + 선택적 비번 재인증(DESIGN button-destructive).
// 차단형 미디어 삭제(references 노출)는 이 컴포넌트 밖(05).
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  warning,
  requirePassword = false,
  confirmLabel = "삭제",
  pending = false,
  onConfirm,
}: Props) {
  const [password, setPassword] = useState("");
  const canConfirm = !requirePassword || password.length > 0;

  // 닫을 때 비밀번호 잔존 방지(민감정보).
  const handleOpenChange = (next: boolean) => {
    if (!next) setPassword("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {warning ? <DialogDescription>{warning}</DialogDescription> : null}
        </DialogHeader>
        {requirePassword ? (
          <div className="flex flex-col gap-xxs">
            <label htmlFor="delete-confirm-password" className={cn(typo.bodySm, "text-ink")}>
              비밀번호
            </label>
            <PasswordInput
              id="delete-confirm-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            loading={pending}
            disabled={!canConfirm}
            onClick={() => onConfirm(requirePassword ? { password } : undefined)}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
