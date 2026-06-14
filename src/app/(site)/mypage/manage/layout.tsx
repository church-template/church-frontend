"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/authStore";

// 관리 영역 부모. 로그인 가드만(비로그인 → 로그인). 도메인별 권한 게이트는 각 page의 <RequirePermission>.
export default function ManageLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const s = useAuthStore.getState();
    if (!s.member || !s.accessToken) router.replace("/login?next=/mypage/manage");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children}</>;
}
