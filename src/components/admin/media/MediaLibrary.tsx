// src/components/admin/media/MediaLibrary.tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button, buttonVariants } from "@/components/ui/Button";
import { apiUrl } from "@/lib/auth/apiBase";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { adminKeys } from "@/lib/admin/queryKeys";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { formatDate } from "@/lib/date";
import { listMedia, deleteMedia, getMediaReferences, type MediaResponse, type MediaListParams } from "@/lib/api/media.admin";
import type { MediaReference } from "@/lib/auth/apiError";
import { MediaReferencesDialog } from "./MediaReferencesDialog";

function typeOf(v: string | null): "image" | "pdf" | undefined {
  return v === "image" || v === "pdf" ? v : undefined;
}

// yyyy-MM-dd만 수용(서버가 최종 검증하나 방어적). 형식 불일치 URL 파라미터는 무시.
function ymd(v: string | null): string | undefined {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
}

export function MediaLibrary() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();

  const params: MediaListParams = {
    type: typeOf(searchParams.get("type")),
    from: ymd(searchParams.get("from")),
    to: ymd(searchParams.get("to")),
    page: Number(searchParams.get("page") ?? "0") || 0,
  };
  const media = useQuery({
    queryKey: adminKeys.list("media", params),
    queryFn: () => listMedia(params),
    retry: false,
  });

  // 필터 변경 → page 리셋하며 URL 갱신(Pagination이 URL 구동이라 page는 URL에 둔다).
  function setParam(key: string, value: string | undefined) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "media", "list"] });

  const [refs, setRefs] = useState<MediaReference[] | null>(null);
  const [target, setTarget] = useState<MediaResponse | null>(null);

  // 삭제 클릭 → 먼저 references 조회(사전 차단). inUse면 안내, 아니면 확인 다이얼로그.
  const check = useMutation({
    mutationFn: (m: MediaResponse) => getMediaReferences(m.id),
    onError: adminOnError(),
    onSuccess: (res, m) => (res.inUse ? setRefs(res.references) : setTarget(m)),
  });
  // 실제 삭제. 백스톱: 동시성으로 그 사이 사용되면 409 MEDIA_IN_USE → references 안내로 전환.
  const del = useMutation({
    mutationFn: (id: number) => deleteMedia(id),
    onError: adminOnError({ onMediaReferences: (r) => { setTarget(null); setRefs(r); } }),
    onSuccess: () => { notify.success("삭제했습니다."); setTarget(null); invalidate(); },
  });

  const columns: Column<MediaResponse>[] = [
    {
      key: "filename",
      header: "파일명",
      // 이미지면 썸네일 미리보기(식별 용이). 장식 이미지라 alt="".
      cell: (m) => (
        <span className="flex items-center gap-sm">
          {m.mimeType.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸(썸네일)
            <img src={apiUrl(`/api/media/${m.id}`)} alt="" className="size-10 shrink-0 rounded-sm object-cover" />
          ) : null}
          <span className="truncate">{m.filename}</span>
        </span>
      ),
    },
    { key: "type", header: "유형", cell: (m) => m.mimeType, className: "hidden sm:table-cell" },
    { key: "size", header: "크기", cell: (m) => `${Math.round(m.size / 1024)} KB`, className: cn(typo.datetime, "hidden sm:table-cell") },
    { key: "createdAt", header: "업로드일", cell: (m) => formatDate(m.createdAt), className: cn(typo.datetime) },
  ];

  return (
    <div className="flex flex-col gap-base">
      <div className="flex flex-col gap-base sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-xs">
          <Button type="button" variant={params.type === undefined ? "primary" : "secondary"} onClick={() => setParam("type", undefined)}>전체</Button>
          <Button type="button" variant={params.type === "image" ? "primary" : "secondary"} onClick={() => setParam("type", "image")}>이미지</Button>
          <Button type="button" variant={params.type === "pdf" ? "primary" : "secondary"} onClick={() => setParam("type", "pdf")}>PDF</Button>
          <input
            type="date"
            aria-label="시작일"
            value={params.from ?? ""}
            onChange={(e) => setParam("from", e.target.value || undefined)}
            className={cn(typo.datetime, "h-12 rounded-md border border-hairline bg-canvas px-base text-ink")}
          />
          <input
            type="date"
            aria-label="종료일"
            value={params.to ?? ""}
            onChange={(e) => setParam("to", e.target.value || undefined)}
            className={cn(typo.datetime, "h-12 rounded-md border border-hairline bg-canvas px-base text-ink")}
          />
        </div>
        <MediaUploader accept="all" multiple onUploaded={() => { notify.success("업로드했습니다."); invalidate(); }} />
      </div>

      <DataTable
        columns={columns}
        rows={media.data?.content ?? []}
        rowKey={(m) => m.id}
        loading={media.isPending}
        empty={<EmptyState message="등록된 미디어가 없습니다." />}
        actions={(m) => (
          <div className="flex justify-end gap-xs">
            {/* 열기: 공개 서빙 URL 새 탭 — 이미지 미리보기·PDF 다운로드 */}
            <a
              href={apiUrl(`/api/media/${m.id}`)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants("secondary")}
            >
              열기
            </a>
            <Button type="button" variant="secondary" onClick={() => check.mutate(m)}>
              삭제
            </Button>
          </div>
        )}
      />

      {media.data && media.data.page.totalPages > 1 ? <Pagination page={media.data.page} /> : null}

      <MediaReferencesDialog open={refs !== null} onOpenChange={(v) => (!v ? setRefs(null) : undefined)} references={refs ?? []} />
      <DeleteConfirmDialog
        open={target !== null}
        onOpenChange={(v) => (!v ? setTarget(null) : undefined)}
        title="미디어를 삭제할까요?"
        warning="원본 파일이 영구 삭제됩니다."
        pending={del.isPending}
        onConfirm={() => (target ? del.mutate(target.id) : undefined)}
      />
    </div>
  );
}
