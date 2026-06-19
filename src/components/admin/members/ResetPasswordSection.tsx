// src/components/admin/members/ResetPasswordSection.tsx
"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { resetPassword } from "@/lib/api/members.admin";

export function ResetPasswordSection({ uuid }: { uuid: string }) {
  const [confirming, setConfirming] = useState(false);
  // 임시 비번은 로컬 state로만 보관 — 캐시 미저장, 다이얼로그 언마운트 시 자동 휘발
  const [temp, setTemp] = useState<string | null>(null);

  const reset = useMutation({
    mutationFn: () => resetPassword(uuid),
    onError: adminOnError(),
    onSuccess: (res) => { setTemp(res.temporaryPassword); setConfirming(false); },
  });

  const copy = () => {
    if (temp) void navigator.clipboard?.writeText(temp).then(() => notify.success("복사했습니다."));
  };

  return (
    <section className="flex flex-col gap-sm">
      <h3 className={cn(typo.titleSm, "text-ink")}>비밀번호</h3>
      {temp ? (
        <div className="flex flex-col gap-xxs rounded-md border border-hairline bg-surface-soft p-base">
          <p className={cn(typo.caption, "text-muted")}>임시 비밀번호입니다. 본인에게 직접 전달하세요. 이 창을 닫으면 다시 볼 수 없습니다.</p>
          <div className="flex items-center gap-xs">
            <code className={cn(typo.datetime, "text-ink")}>{temp}</code>
            <Button type="button" variant="tertiary" onClick={copy} aria-label="임시 비밀번호 복사"><Copy size={16} aria-hidden /></Button>
          </div>
        </div>
      ) : confirming ? (
        // 질문은 한 줄, 버튼은 아래 줄에 — 한 줄에 끼우면 버튼이 찌그러져 글자가 세로로 줄바꿈된다.
        <div className="flex flex-col gap-sm">
          <span className={cn(typo.bodySm, "text-body")}>비밀번호를 임시값으로 초기화할까요?</span>
          <div className="flex gap-xs">
            <Button type="button" variant="destructive" loading={reset.isPending} className="shrink-0 whitespace-nowrap" onClick={() => reset.mutate()}>초기화</Button>
            <Button type="button" variant="tertiary" className="shrink-0 whitespace-nowrap" onClick={() => setConfirming(false)}>취소</Button>
          </div>
        </div>
      ) : (
        <div><Button type="button" variant="secondary" onClick={() => setConfirming(true)}>비밀번호 초기화</Button></div>
      )}
    </section>
  );
}
