"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/common/Skeleton";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { adminKeys } from "@/lib/admin/queryKeys";
import { formatDate } from "@/lib/date";
import { getMember } from "@/lib/api/members.admin";
import { MemberProfileForm } from "./MemberProfileForm";
import { MemberRolesSection } from "./MemberRolesSection";
import { ResetPasswordSection } from "./ResetPasswordSection";

interface Props { uuid: string | null; open: boolean; onOpenChange: (v: boolean) => void }

export function MemberDetailDialog({ uuid, open, onOpenChange }: Props) {
  const detail = useQuery({
    queryKey: adminKeys.detail("members", uuid ?? ""),
    queryFn: () => getMember(uuid as string),
    // 닫힌 상태이거나 uuid 없으면 패칭하지 않는다.
    enabled: open && !!uuid,
    retry: false,
  });

  // 조회 실패는 토스트로 알리고 닫는다(빈 상세와 혼동 방지). notify는 setState 아님.
  useEffect(() => {
    if (detail.isError) { adminOnError()(detail.error); onOpenChange(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.isError, detail.error]);

  const m = detail.data;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m ? m.name : "회원 상세"}</DialogTitle>
        </DialogHeader>
        {detail.isPending && open ? (
          <div className="flex flex-col gap-sm"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-2/3" /></div>
        ) : m ? (
          // 섹션 사이 1px 헤어라인 divider로 끊어 정보가 한 번에 쏟아지지 않게 한다(가독성).
          <div className="flex flex-col gap-lg">
            <div className="flex flex-wrap items-center gap-xs">
              <Badge variant={m.approved ? "primary" : "default"}>{m.approved ? "승인" : "대기"}</Badge>
              {m.position ? <span className={cn(typo.bodySm, "text-muted")}>{m.position}</span> : null}
              <span className={cn(typo.datetime, "text-muted")}>가입 {formatDate(m.createdAt)}</span>
            </div>
            {/* 헤더 메타↔본문 경계: 2px ink 앵커 divider(섹션 사이 1px 헤어라인보다 두껍게)로 위계 강조. */}
            <hr className="border-0 border-t-2 border-ink" aria-hidden />
            <MemberProfileForm member={m} />
            <hr className="border-0 border-t border-hairline" aria-hidden />
            <MemberRolesSection member={m} />
            <hr className="border-0 border-t border-hairline" aria-hidden />
            <section className="flex flex-col gap-xs">
              <h3 className={cn(typo.titleSm, "text-ink")}>약관 동의</h3>
              <div className="flex flex-wrap items-center gap-xs">
                {/* 단일 텍스트 노드로 — split node면 getByText 매칭이 깨진다 */}
                <Badge variant={m.termsAgreed ? "primary" : "default"}>{`약관 ${m.termsAgreed ? "동의" : "미동의"}`}</Badge>
                <Badge variant={m.privacyAgreed ? "primary" : "default"}>{`개인정보 ${m.privacyAgreed ? "동의" : "미동의"}`}</Badge>
                {m.agreedAt ? <span className={cn(typo.datetime, "text-muted")}>{formatDate(m.agreedAt)}</span> : null}
              </div>
            </section>
            <hr className="border-0 border-t border-hairline" aria-hidden />
            <ResetPasswordSection uuid={m.uuid} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
