"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { resetAgreements, type AgreementTarget } from "@/lib/api/agreements.admin";

const LABEL: Record<AgreementTarget, string> = { terms: "약관", privacy: "개인정보" };

export function AgreementResetPanel() {
  const [target, setTarget] = useState<AgreementTarget | null>(null);

  const reset = useMutation({
    mutationFn: (t: AgreementTarget) => resetAgreements(t),
    onError: adminOnError(),
    // 성공 시 목록 무효화 없음 — 전역 초기화는 개별 회원 카드를 변경하지 않음
    onSuccess: (_d, t) => { notify.success(`전체 회원의 ${LABEL[t]} 동의를 초기화했습니다.`); setTarget(null); },
  });

  return (
    <section className="flex flex-col gap-base rounded-xl border border-hairline p-xl">
      <h2 className={cn(typo.titleMd, "text-ink")}>약관 재동의 사이클</h2>
      <div className="flex items-start gap-xs rounded-xl bg-surface-soft p-base">
        <Info size={20} aria-hidden className="mt-xxs shrink-0 text-muted" />
        <p className={cn(typo.bodySm, "text-body")}>전체 회원의 동의를 초기화합니다. 다음 로그인 시 재동의를 요구합니다. 되돌릴 수 없습니다.</p>
      </div>
      <div className="flex flex-wrap gap-xs">
        <Button type="button" variant="secondary" onClick={() => setTarget("terms")}>약관 동의 리셋</Button>
        <Button type="button" variant="secondary" onClick={() => setTarget("privacy")}>개인정보 동의 리셋</Button>
      </div>
      <DeleteConfirmDialog
        open={target !== null}
        onOpenChange={(v) => { if (!v) setTarget(null); }}
        title={target ? `${LABEL[target]} 동의를 초기화할까요?` : "동의를 초기화할까요?"}
        warning="전체 회원에 적용되며 되돌릴 수 없습니다. 영향 회원은 다음 로그인 시 재동의해야 합니다."
        confirmLabel="초기화"
        pending={reset.isPending}
        onConfirm={() => { if (target) reset.mutate(target); }}
      />
    </section>
  );
}
