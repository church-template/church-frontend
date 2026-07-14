"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { ACTION } from "@/constants/actionButton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminKeys } from "@/lib/admin/queryKeys";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { formatDate } from "@/lib/date";
import { getInquiry, completeInquiry, deleteInquiry } from "@/lib/api/inquiries.admin";

interface Props {
  id: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// 목록에 content가 없어 내용 확인과 처리를 같은 자리에서 한다(오조작 방지 — 읽지 않고 체크할 수 없다).
export function InquiryDetailDialog({ id, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const detail = useQuery({
    queryKey: adminKeys.detail("inquiries", id ?? 0),
    queryFn: () => getInquiry(id as number),
    enabled: open && id != null,
    retry: false,
    // 비회원 방문자의 이름·전화·이메일·문의 본문(PII) — 다이얼로그를 닫는 즉시 캐시에서 지운다.
    staleTime: 0,
    gcTime: 0,
  });

  // 조회 실패는 토스트로 알리고 닫는다(빈 상세와 혼동 방지). notify는 setState 아님.
  useEffect(() => {
    if (detail.isError) {
      adminOnError()(detail.error);
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.isError, detail.error]);

  const toggle = useMutation({
    mutationFn: (completed: boolean) => completeInquiry(id as number, completed),
    onError: adminOnError(),
    onSuccess: (updated) => {
      // 리소스가 남아있어 재조회가 정상 동작 — 목록·상세 모두 무효화(재조회)한다.
      qc.invalidateQueries({ queryKey: adminKeys.listAll("inquiries") });
      if (id != null) qc.invalidateQueries({ queryKey: adminKeys.detail("inquiries", id) });
      notify.success(updated.completed ? "완료 처리했습니다." : "완료를 취소했습니다.");
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteInquiry(id as number),
    onError: adminOnError(),
    onSuccess: () => {
      // 삭제된 리소스는 invalidateQueries로 재조회하면 안 된다(open=true인 채 동기 실행돼
      // 방금 지운 상세를 다시 불러와 404 → 삭제 성공 직후 에러 토스트가 뜬다). 캐시만 제거한다.
      qc.invalidateQueries({ queryKey: adminKeys.listAll("inquiries") });
      if (id != null) qc.removeQueries({ queryKey: adminKeys.detail("inquiries", id) });
      notify.success("삭제했습니다.");
      setDeleteOpen(false);
      onOpenChange(false);
    },
  });

  const q = detail.data;
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{q ? q.name : "문의 상세"}</DialogTitle>
          </DialogHeader>

          {detail.isPending && open ? (
            <div className="flex flex-col gap-sm">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : q ? (
            <div className="flex flex-col gap-lg">
              <div className="flex flex-wrap items-center gap-xs">
                <Badge variant={q.completed ? "primary" : "default"}>{q.completed ? "완료" : "미처리"}</Badge>
                <span className={cn(typo.datetime, "text-muted")}>접수 {formatDate(q.createdAt)}</span>
                {q.completedAt ? (
                  <span className={cn(typo.datetime, "text-muted")}>완료 {formatDate(q.completedAt)}</span>
                ) : null}
              </div>

              {/* 회신 수단이라 바로 걸 수 있게 링크로 — 답변은 담당자가 전화·메일로 직접 발송한다. */}
              <dl className="flex flex-col gap-xs">
                <div className="flex gap-sm">
                  <dt className={cn(typo.bodySm, "w-20 shrink-0 text-muted")}>연락처</dt>
                  <dd className={cn(typo.bodyMd, "text-ink")}>
                    <a href={`tel:${q.phone}`} className="hover:text-primary">
                      {q.phone}
                    </a>
                  </dd>
                </div>
                {q.email ? (
                  <div className="flex gap-sm">
                    <dt className={cn(typo.bodySm, "w-20 shrink-0 text-muted")}>이메일</dt>
                    <dd className={cn(typo.bodyMd, "break-all text-ink")}>
                      <a href={`mailto:${q.email}`} className="hover:text-primary">
                        {q.email}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>

              <hr className="border-0 border-t border-hairline" aria-hidden />

              {/* 방문자가 쓴 평문 — 마크다운으로 해석하지 않는다(불필요한 렌더 위험). */}
              <p className={cn(typo.bodyMd, "whitespace-pre-wrap text-ink")}>{q.content}</p>

              <DialogFooter>
                <Button type="button" variant="tertiary" onClick={() => setDeleteOpen(true)}>
                  <ACTION.delete.Icon size={18} aria-hidden />
                  {ACTION.delete.label}
                </Button>
                <Button
                  type="button"
                  variant={q.completed ? "secondary" : "primary"}
                  loading={toggle.isPending}
                  onClick={() => toggle.mutate(!q.completed)}
                >
                  {q.completed ? "완료 취소" : "완료 처리"}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="문의를 삭제할까요?"
        warning="삭제한 문의는 목록에서 즉시 사라지며 되돌릴 수 없습니다."
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}
