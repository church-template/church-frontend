"use client";
import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { adminKeys } from "@/lib/admin/queryKeys";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { formatDate } from "@/lib/date";
import { listMembers, type MemberCardResponse, type MemberListParams } from "@/lib/api/members.admin";
import { AgreementResetPanel } from "./AgreementResetPanel";
import { MemberDetailDialog } from "./MemberDetailDialog";

// 교인 목록 페이지 크기 — 10명 단위로 본다.
const PAGE_SIZE = 10;

export function MemberManager() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const params: MemberListParams = {
    q: searchParams.get("q") || undefined,
    page: Number(searchParams.get("page") ?? "0") || 0,
    size: PAGE_SIZE,
  };

  const members = useQuery({
    queryKey: adminKeys.list("members", params),
    queryFn: () => listMembers(params),
    placeholderData: keepPreviousData,
    retry: false,
  });

  // 쿼리 에러는 useEffect로 처리 — isError 변경 시 toast 표시(adminOnError 위임)
  useEffect(() => {
    if (members.isError) adminOnError()(members.error);
  }, [members.isError, members.error]);

  const [qInput, setQInput] = useState(searchParams.get("q") ?? "");
  const [selected, setSelected] = useState<string | null>(null);

  // 검색·필터 변경 시 page 리셋하며 URL 갱신(Pagination이 URL 구동 — page는 URL에 둔다)
  function setParam(key: string, value: string | undefined) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  const columns: Column<MemberCardResponse>[] = [
    { key: "name", header: "이름", cell: (m) => m.name },
    { key: "phone", header: "전화", cell: (m) => m.phone, className: cn(typo.datetime) },
    { key: "position", header: "직분", cell: (m) => (m.position ? m.position : "—"), className: "hidden sm:table-cell" },
    {
      key: "roles",
      header: "역할",
      cell: (m) => (m.roles.length ? <span className="flex flex-wrap gap-xxs">{m.roles.map((r) => <Badge key={r}>{r}</Badge>)}</span> : "—"),
      className: "hidden md:table-cell",
    },
    { key: "approved", header: "승인", cell: (m) => <Badge variant={m.approved ? "primary" : "default"}>{m.approved ? "승인" : "대기"}</Badge> },
    { key: "createdAt", header: "가입일", cell: (m) => formatDate(m.createdAt), className: cn(typo.datetime, "hidden sm:table-cell") },
  ];

  return (
    <div className="flex flex-col gap-xl">
      <AgreementResetPanel />
      <div className="flex flex-col gap-base">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", qInput.trim() || undefined);
          }}
          className="flex items-start gap-xs"
        >
          <Input
            aria-label="이름 또는 전화번호 검색"
            placeholder="이름 또는 전화번호"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
          />
          <Button type="submit" variant="secondary">검색</Button>
        </form>
        <div
          aria-busy={members.isPlaceholderData}
          className={cn(members.isPlaceholderData && "opacity-60 transition-opacity")}
        >
          <DataTable
            columns={columns}
            rows={members.data?.content ?? []}
            rowKey={(m) => m.uuid}
            loading={members.isPending}
            empty={<EmptyState message="조회된 회원이 없습니다." />}
            actions={(m) => (
              <Button
                type="button"
                variant="tertiary"
                aria-label={`${m.name} 상세`}
                onClick={() => setSelected(m.uuid)}
              >
                상세
              </Button>
            )}
          />
        </div>
        {members.data && members.data.page.totalPages > 1 ? <Pagination page={members.data.page} scroll={false} /> : null}
      </div>
      <MemberDetailDialog
        uuid={selected}
        open={selected !== null}
        onOpenChange={(v) => { if (!v) setSelected(null); }}
      />
    </div>
  );
}
