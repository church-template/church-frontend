"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { notify } from "@/lib/notify";
import { signOut } from "@/lib/auth/authApi";
import { useAuthStore } from "@/lib/auth/authStore";
import { Container } from "@/components/shell/Container";
import { Button } from "@/components/ui/Button";

// T15(마이페이지 본 구현) 전까지의 placeholder — 로그아웃 동선만 먼저 연결한다.
export function MypageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loggingOut, setLoggingOut] = useState(false);

  // 진입 가드: 회원 영역 — 비로그인은 로그인으로(복귀 경로 유지). 마운트 1회만(인증 3폼과 동일 패턴).
  useEffect(() => {
    if (!useAuthStore.getState().member) router.replace("/login?next=/mypage");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogout = async () => {
    setLoggingOut(true);
    await signOut(); // 멱등 — 서버 실패여도 로컬 세션은 정리됨(T5)
    queryClient.removeQueries({ queryKey: ["me"] }); // authApi 주석: ["me"] 캐시 제거는 호출측 책임
    notify.success("로그아웃되었습니다.");
    router.replace("/");
  };

  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>마이페이지</h1>
      <p className={cn(typo.bodySm, "mt-xs text-muted")}>
        내 정보 관리 기능을 준비하고 있습니다.
      </p>
      <div className="mt-lg">
        <Button variant="secondary" loading={loggingOut} onClick={onLogout}>
          로그아웃
        </Button>
      </div>
    </Container>
  );
}
