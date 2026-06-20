"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { adminKeys } from "@/lib/admin/queryKeys";
import { notify } from "@/lib/notify";
import { useHasPermission } from "@/lib/auth/useMe";
import { getPositions } from "@/lib/api/positions";
import { changePosition, type MemberDetailResponse } from "@/lib/api/members.admin";
import type { PositionResponse } from "@/lib/api/types";

export function MemberPositionSection({ member }: { member: MemberDetailResponse }) {
  const canManage = useHasPermission("MEMBER_MANAGE");
  // 공개 카탈로그 — PositionManager와 ["positions"] 키 공유
  const { data: positions = [] } = useQuery({ queryKey: ["positions"], queryFn: getPositions });
  // 현재 직분은 이름 문자열 → 카탈로그에서 id 역매핑(없으면 null = (없음) 폴백)
  const currentId = positions.find((p) => p.name === member.position)?.id ?? null;

  return (
    <section className="flex flex-col gap-sm">
      <h3 className={cn(typo.titleSm, "text-ink")}>직분</h3>
      {canManage ? (
        // keyed 마운트로 현재값 시드(set-state-in-effect 회피). 변경 성공 시 currentId 갱신→remount.
        <PositionEditor
          key={`${member.uuid}:${currentId ?? "none"}`}
          uuid={member.uuid}
          currentId={currentId}
          positions={positions}
        />
      ) : (
        <span className={cn(typo.bodySm, "text-muted")}>{member.position ? member.position : "직분 없음"}</span>
      )}
    </section>
  );
}

function PositionEditor({ uuid, currentId, positions }: { uuid: string; currentId: number | null; positions: PositionResponse[] }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<number | "">(currentId ?? "");

  const change = useMutation({
    mutationFn: (positionId: number | null) => changePosition(uuid, positionId),
    onError: adminOnError(),
    onSuccess: (updated) => {
      qc.setQueryData(adminKeys.detail("members", uuid), updated);
      qc.invalidateQueries({ queryKey: adminKeys.listAll("members") });
      notify.success("직분을 변경했습니다.");
    },
  });

  // 현재값과 동일하면 변경 비활성("" ↔ null 동일 취급)
  const unchanged = selected === (currentId ?? "");

  return (
    <div className="flex items-center gap-xs">
      <select
        aria-label="직분 선택"
        value={selected === "" ? "" : String(selected)}
        onChange={(e) => setSelected(e.target.value === "" ? "" : Number(e.target.value))}
        className={cn(
          typo.bodyMd,
          "h-12 rounded-md border border-hairline bg-canvas px-4 text-ink outline-hidden",
          "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary",
        )}
      >
        <option value="">(없음)</option>
        {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <Button
        type="button"
        variant="secondary"
        loading={change.isPending}
        disabled={unchanged}
        onClick={() => change.mutate(selected === "" ? null : (selected as number))}
      >변경</Button>
    </div>
  );
}
