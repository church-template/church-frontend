"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { adminKeys } from "@/lib/admin/queryKeys";
import { notify } from "@/lib/notify";
import { permissionLabel } from "@/constants/permissions";
import { getPermissions } from "@/lib/api/permissions.admin";
import { setRolePermissions, type RoleResponse } from "@/lib/api/roles.admin";

export interface RolePermissionsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role: RoleResponse; // 호출 측이 key={role.id}로 마운트 → 초기화로 시드(effect 미사용)
}

export function RolePermissionsDialog({ open, onOpenChange, role }: RolePermissionsDialogProps) {
  const qc = useQueryClient();
  const { data: catalog = [] } = useQuery({
    queryKey: adminKeys.list("permissions"),
    queryFn: getPermissions,
    staleTime: 5 * 60 * 1000, // 카탈로그는 정적
  });

  // 역할의 현재 보유 권한으로 시드. keyed 마운트라 role별로 초기화 1회(set-state-in-effect 회피).
  const [selected, setSelected] = useState<Set<string>>(() => new Set(role.permissions.map((p) => p.name)));

  const toggle = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const mutation = useMutation({
    mutationFn: () => setRolePermissions(role.id, [...selected]),
    onError: adminOnError(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.list("roles") });
      qc.invalidateQueries({ queryKey: ["me"] }); // 자기 보유 역할 권한 변경 시 useMe 동기화
      notify.success("권한을 저장했습니다.");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>권한 편집: {role.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-base gap-y-xs">
          {catalog.map((p) => (
            <Checkbox
              key={p.name}
              label={permissionLabel(p.name)}
              checked={selected.has(p.name)}
              onChange={() => toggle(p.name)}
            />
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="primary" loading={mutation.isPending} onClick={() => mutation.mutate()}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
