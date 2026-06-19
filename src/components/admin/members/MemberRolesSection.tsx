"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { adminKeys } from "@/lib/admin/queryKeys";
import { notify } from "@/lib/notify";
import { useMe, useHasPermission } from "@/lib/auth/useMe";
import { getRoles } from "@/lib/api/roles.admin";
import { grantRole, revokeRole, type MemberDetailResponse } from "@/lib/api/members.admin";
import { canAssignRole } from "@/lib/admin/memberGuards";

export function MemberRolesSection({ member }: { member: MemberDetailResponse }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const canManageRoles = useHasPermission("ROLE_MANAGE");
  const maxPriority = me?.maxPriority;
  // 자기 자신 여부: me 미로딩 시 uuid 비교 불가 → isSelf=false(변경 차단은 canMutate에서 처리)
  const isSelf = member.uuid === me?.uuid;
  // 변경 가능 조건: ROLE_MANAGE 보유 + maxPriority 확인됨 + 자기 자신이 아님
  const canMutate = canManageRoles && maxPriority !== undefined && !isSelf;

  const { data: roles = [] } = useQuery({ queryKey: adminKeys.list("roles"), queryFn: getRoles });
  const [selectedRoleId, setSelectedRoleId] = useState<number | "">("");

  // 목록 쿼리 무효화(공통)
  const invalidateList = () => qc.invalidateQueries({ queryKey: ["admin", "members", "list"] });

  // 역할 부여: 성공 시 상세를 setQueryData로 즉시 갱신 + 목록 무효화
  const grant = useMutation({
    mutationFn: (roleId: number) => grantRole(member.uuid, roleId),
    onError: adminOnError(),
    onSuccess: (updated) => {
      qc.setQueryData(adminKeys.detail("members", member.uuid), updated);
      invalidateList();
      setSelectedRoleId("");
      notify.success("역할을 부여했습니다.");
    },
  });

  // 역할 회수: 성공 시 상세+목록 모두 무효화(서버 최신값 재조회)
  const revoke = useMutation({
    mutationFn: (roleId: number) => revokeRole(member.uuid, roleId),
    onError: adminOnError(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.detail("members", member.uuid) });
      invalidateList();
      notify.success("역할을 회수했습니다.");
    },
  });

  // 부여 후보: 내 등급 미만(strict <) && 미보유. maxPriority 미정이면 후보 없음.
  const assignable = roles.filter(
    (r) => maxPriority !== undefined && canAssignRole(r, maxPriority) && !member.roles.includes(r.name),
  );

  return (
    <section className="flex flex-col gap-sm">
      <h3 className={cn(typo.titleSm, "text-ink")}>역할</h3>
      <p className={cn(typo.caption, "text-muted")}>권한 {member.permissions.length}개</p>
      {isSelf ? (
        <p className={cn(typo.caption, "text-muted")}>자기 자신의 역할은 변경할 수 없습니다.</p>
      ) : null}
      <div className="flex flex-wrap gap-xs">
        {member.roles.length === 0 ? (
          <span className={cn(typo.bodySm, "text-muted")}>부여된 역할이 없습니다.</span>
        ) : null}
        {member.roles.map((name) => {
          const role = roles.find((r) => r.name === name);
          // 회수 가능: ROLE_MANAGE 보유 + 역할이 조회됨 + 내 등급 미만(strict)
          const removable = canMutate && role != null && canAssignRole(role, maxPriority as number);
          return (
            <span key={name} className="inline-flex items-center gap-xxs rounded-sm bg-surface-strong py-1 pl-3 pr-1">
              <span className={typo.captionStrong}>{name}</span>
              {canManageRoles ? (
                <Button
                  type="button"
                  variant="tertiary"
                  iconOnly
                  aria-label={`${name} 회수`}
                  disabled={!removable}
                  title={removable ? undefined : "회수할 수 없는 역할입니다"}
                  onClick={() => { if (role) revoke.mutate(role.id); }}
                  className="text-muted hover:text-ink disabled:opacity-40"
                >
                  <X size={14} aria-hidden />
                </Button>
              ) : null}
            </span>
          );
        })}
      </div>
      {canManageRoles ? (
        <div className="flex items-center gap-xs">
          <select
            aria-label="부여할 역할"
            disabled={!canMutate || assignable.length === 0}
            value={selectedRoleId === "" ? "" : String(selectedRoleId)}
            onChange={(e) => setSelectedRoleId(e.target.value === "" ? "" : Number(e.target.value))}
            className={cn(
              typo.bodyMd,
              "h-12 rounded-md border border-hairline bg-canvas px-4 text-ink outline-hidden",
              "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary",
            )}
          >
            <option value="">역할 선택</option>
            {assignable.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <Button
            type="button"
            variant="secondary"
            loading={grant.isPending}
            disabled={!canMutate || selectedRoleId === ""}
            onClick={() => { if (selectedRoleId !== "") grant.mutate(selectedRoleId as number); }}
          >부여</Button>
        </div>
      ) : null}
    </section>
  );
}
