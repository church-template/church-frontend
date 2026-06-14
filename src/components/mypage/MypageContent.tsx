"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { notify } from "@/lib/notify";
import { signOut } from "@/lib/auth/authApi";
import { useAuthStore } from "@/lib/auth/authStore";
import { useMe } from "@/lib/auth/useMe";
import { Container } from "@/components/shell/Container";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { Reveal } from "@/components/main/Reveal";
import { ProfileCard } from "./ProfileCard";
import { PasswordChangeSection } from "./PasswordChangeSection";
import { AgreementStatus } from "./AgreementStatus";
import { WithdrawDialog } from "./WithdrawDialog";
import { ManageHub } from "./ManageHub";

export function MypageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loggingOut, setLoggingOut] = useState(false);
  const { data: me, isPending, isError, refetch } = useMe();

  // 진입 가드: 회원 영역 — member·token 둘 중 하나라도 없으면 로그인으로(복귀 경로 유지).
  // token만 없는 경우 useMe가 enabled:false로 무한 로딩되는 것을 함께 차단. 마운트 1회만.
  useEffect(() => {
    const s = useAuthStore.getState();
    if (!s.member || !s.accessToken) router.replace("/login?next=/mypage");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogout = async () => {
    setLoggingOut(true);
    await signOut(); // 멱등 — 서버 실패여도 로컬 세션은 정리됨(T5)
    queryClient.removeQueries({ queryKey: ["me"] }); // ['me'] 캐시 제거는 호출측 책임
    notify.success("로그아웃되었습니다.");
    router.replace("/");
  };

  return (
    <Container as="section" className="py-section">
      {/* 계정 페이지는 1200px 전폭이 아닌 좁은 읽기 컬럼으로 — 카드가 휑하게 비지 않도록(DESIGN 호흡) */}
      <div className="mx-auto w-full max-w-[var(--container-narrow)]">
        <h1 className={cn(typo.displayMd, "text-ink")}>마이페이지</h1>

        {isPending ? (
          <div className="mt-xl flex flex-col gap-lg" aria-hidden>
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : isError || !me ? (
          <div className="mt-xl flex flex-col items-start gap-sm">
            <p className={cn(typo.bodySm, "text-muted")}>정보를 불러오지 못했습니다.</p>
            <Button variant="secondary" onClick={() => refetch()}>다시 시도</Button>
          </div>
        ) : (
          <div className="mt-xl flex flex-col gap-lg">
            <Reveal><ProfileCard me={me} /></Reveal>
            {/* 비밀번호·약관을 한 '계정' 카드로 묶어 산만함 제거 */}
            <Reveal delay={120}>
              <section className="flex flex-col gap-lg rounded-xl border border-hairline bg-surface-card p-xl">
                <PasswordChangeSection />
                <AgreementStatus me={me} />
              </section>
            </Reveal>
            <ManageHub delay={180} />
            <Reveal delay={240}>
              <div className="flex items-center justify-between gap-md pt-sm">
                <Button variant="secondary" loading={loggingOut} onClick={onLogout}>로그아웃</Button>
                <WithdrawDialog />
              </div>
            </Reveal>
          </div>
        )}
      </div>
    </Container>
  );
}
