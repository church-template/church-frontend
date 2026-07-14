"use client";
import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { typo } from "@/constants/typography";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { adminKeys } from "@/lib/admin/queryKeys";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { formatDate } from "@/lib/date";
import { listInquiries, type InquiryCardResponse, type InquiryListParams } from "@/lib/api/inquiries.admin";
import { InquiryDetailDialog } from "./InquiryDetailDialog";

// 한 화면 10건 — 문의는 건수가 많지 않고 한 건씩 열어 처리한다.
const PAGE_SIZE = 10;

// 탭 값 ↔ URL(?completed=) 매핑. 전체는 파라미터 자체를 생략한다(백엔드 규약).
type FilterKey = "all" | "pending" | "done";
const FILTERS: { key: FilterKey; label: string; completed?: boolean }[] = [
  { key: "all", label: "전체" },
  { key: "pending", label: "미처리", completed: false },
  { key: "done", label: "완료", completed: true },
];
function filterFromParam(raw: string | null): FilterKey {
  if (raw === "false") return "pending";
  if (raw === "true") return "done";
  return "all";
}

export function InquiryManager() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filter = filterFromParam(searchParams.get("completed"));
  const params: InquiryListParams = {
    completed: FILTERS.find((f) => f.key === filter)?.completed,
    page: Number(searchParams.get("page") ?? "0") || 0,
    size: PAGE_SIZE,
  };

  const inquiries = useQuery({
    queryKey: adminKeys.list("inquiries", params),
    queryFn: () => listInquiries(params),
    placeholderData: keepPreviousData,
    retry: false,
  });

  // 조회 실패는 토스트로 알린다(빈 목록과 혼동 방지). notify 호출이라 effect 내 setState 아님.
  useEffect(() => {
    if (inquiries.isError) adminOnError()(inquiries.error);
  }, [inquiries.isError, inquiries.error]);

  const [selected, setSelected] = useState<number | null>(null);

  // 필터 변경 시 page를 리셋한다 — 3페이지에서 '완료' 탭으로 옮기면 빈 페이지가 나온다.
  const onFilterChange = (key: string) => {
    const next = FILTERS.find((f) => f.key === key);
    const sp = new URLSearchParams();
    if (next?.completed != null) sp.set("completed", String(next.completed));
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const columns: Column<InquiryCardResponse>[] = [
    {
      key: "name",
      header: "이름",
      // 행 전체 클릭은 <tr>에 핸들러를 다는 방식이라 키보드 접근이 끊긴다 — 이름 셀을 버튼으로.
      cell: (q) => (
        <button
          type="button"
          aria-label={`${q.name} 문의 상세`}
          onClick={() => setSelected(q.id)}
          className="text-ink underline-offset-4 hover:text-primary hover:underline"
        >
          {q.name}
        </button>
      ),
    },
    { key: "phone", header: "연락처", cell: (q) => <span className={typo.datetime}>{q.phone}</span> },
    { key: "createdAt", header: "접수일", cell: (q) => <span className={typo.datetime}>{formatDate(q.createdAt)}</span> },
    {
      key: "completed",
      header: "상태",
      cell: (q) => <Badge variant={q.completed ? "primary" : "default"}>{q.completed ? "완료" : "미처리"}</Badge>,
    },
  ];

  const pageMeta = inquiries.data?.page;
  return (
    <>
      <Tabs value={filter} onValueChange={onFilterChange}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.key} value={f.key}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* aria-controls가 가리키는 패널 — 탭 트리거와 목록 영역의 연결을 스크린리더에 알린다. */}
        <TabsContent value={filter}>
          {/* 탭↔표 간격은 TabsContent의 pt-base가 이미 준다 — mt를 더하면 여백이 두 배가 된다. */}
          <DataTable
            columns={columns}
            rows={inquiries.data?.content ?? []}
            rowKey={(q) => q.id}
            loading={inquiries.isPending}
            empty={<EmptyState message="접수된 문의가 없습니다." />}
          />

          {pageMeta && pageMeta.totalPages > 1 ? (
            <div className="mt-xl">
              <Pagination page={pageMeta} scroll={false} />
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      <InquiryDetailDialog
        id={selected}
        open={selected != null}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      />
    </>
  );
}
