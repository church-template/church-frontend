"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { buttonVariants } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { formatDate, formatClockTime, parseServerDate } from "@/lib/date";
import { fetchVehicleRoster } from "@/lib/api/vehicles.admin";
import type { VehicleRosterEntryResponse } from "@/lib/api/types";

export interface VehicleRosterViewProps {
  runId: number;
  departsAt?: string; // 표시 전용(단건 GET 없음 — 목록에서 쿼리로 전달, 위·변조 무해)
}

// vehicle-roster-view(DESIGN.md): 통합 명단(신청순) — 현장에서 연락처 바로 전화(tel:).
export function VehicleRosterView({ runId, departsAt }: VehicleRosterViewProps) {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "0") || 0;

  const roster = useQuery({
    queryKey: ["admin", "vehicle-runs", runId, "roster", { page }],
    queryFn: () => fetchVehicleRoster(runId, { page }),
    placeholderData: keepPreviousData,
    retry: false,
  });

  useEffect(() => {
    if (roster.isError) adminOnError()(roster.error);
  }, [roster.isError, roster.error]);

  // 유효한 서버 datetime일 때만 부제 표시(직접 URL 진입·깨진 값 방어).
  const subtitle =
    departsAt && !Number.isNaN(parseServerDate(departsAt).getTime())
      ? `${formatDate(departsAt)} ${formatClockTime(departsAt)} 출발`
      : null;

  const columns: Column<VehicleRosterEntryResponse>[] = [
    { key: "name", header: "이름", cell: (e) => e.name },
    {
      key: "phone",
      header: "연락처",
      cell: (e) =>
        e.phone ? (
          <a href={`tel:${e.phone}`} className={cn(typo.datetime, "text-ink underline-offset-4 hover:text-primary hover:underline")}>
            {e.phone}
          </a>
        ) : null,
    },
    { key: "pickupLocation", header: "픽업 장소", cell: (e) => e.pickupLocation },
    { key: "note", header: "메모", cell: (e) => e.note ?? "" },
    {
      key: "requestedAt",
      header: "신청 시각",
      cell: (e) => <span className={typo.datetime}>{`${formatDate(e.requestedAt)} ${formatClockTime(e.requestedAt)}`}</span>,
    },
  ];

  const pageMeta = roster.data?.page;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-base">
        {subtitle ? <p className={cn(typo.datetimeLg, "text-muted")}>{subtitle}</p> : <span />}
        <Link href="/mypage/manage/vehicle-runs" className={buttonVariants("tertiary")}>
          <ArrowLeft size={18} aria-hidden />
          목록으로
        </Link>
      </div>
      <div className="mt-base">
        <DataTable
          columns={columns}
          rows={roster.data?.content ?? []}
          rowKey={(e) => `${e.name}-${e.phone ?? ""}-${e.requestedAt}`}
          loading={roster.isPending}
          empty={<EmptyState message="아직 탑승 신청이 없습니다." />}
        />
      </div>
      {pageMeta && pageMeta.totalPages > 1 ? (
        <div className="mt-xl">
          <Pagination page={pageMeta} scroll={false} />
        </div>
      ) : null}
    </>
  );
}
