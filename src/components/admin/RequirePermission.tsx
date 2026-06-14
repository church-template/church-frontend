"use client";
import type { ReactNode } from "react";
import { useMe } from "@/lib/auth/useMe";
import { hasPermission, hasAnyPermission } from "@/lib/auth/permissions";

interface Props {
  permission?: string; // 단일 권한
  perms?: string[]; // 복수 권한
  mode?: "all" | "any"; // perms 사용 시, 기본 "any"
  fallback?: ReactNode; // 미보유 시 렌더(기본 null)
  children: ReactNode;
}

// 권한 게이트(UX 최적화). 판정 소스는 useMe()의 라이브 permissions(토큰 아님 — 가이드 1.5·2.1).
// 보안 경계 아님: 서버가 /api/admin/** 2단 방어. 로딩 중·미보유는 children 비렌더.
export function RequirePermission({ permission, perms, mode = "any", fallback = null, children }: Props) {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <>{fallback}</>;
  const ok = permission
    ? hasPermission(permission, me)
    : perms
      ? mode === "all"
        ? perms.every((p) => hasPermission(p, me))
        : hasAnyPermission(perms, me)
      : false;
  return ok ? <>{children}</> : <>{fallback}</>;
}
