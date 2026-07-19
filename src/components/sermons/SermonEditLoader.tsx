// src/components/sermons/SermonEditLoader.tsx
"use client";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { useSermon } from "./queries";
import { SermonForm } from "./SermonForm";

// edit 시드 — 회원 전용(authFetch, 토큰은 클라에만)이라 RSC fetch 불가, 클라 쿼리로 최신 version을 시드.
// keyed 마운트로 defaultValues를 고정한다(effect reset 금지 — set-state-in-effect lint 관례).
export function SermonEditLoader({ id }: { id: number }) {
  const sermon = useSermon(id);
  if (sermon.isPending) {
    return <p className={cn(typo.bodySm, "text-muted")}>불러오는 중…</p>;
  }
  if (sermon.isError || !sermon.data) {
    return <p className={cn(typo.bodySm, "text-error")}>설교를 불러오지 못했습니다.</p>;
  }
  return <SermonForm key={sermon.data.id} mode="edit" initial={sermon.data} />;
}
