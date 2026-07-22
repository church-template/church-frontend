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
import { ApiError } from "@/lib/auth/apiError";
import { Container } from "@/components/shell/Container";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { Reveal } from "@/components/main/Reveal";
import { ProfileCard } from "./ProfileCard";
import { PasswordChangeSection } from "./PasswordChangeSection";
import { AgreementStatus } from "./AgreementStatus";
import { WithdrawDialog } from "./WithdrawDialog";
import { ManageHub } from "./ManageHub";
import { MyChallengeHistory } from "./MyChallengeHistory";
import { MyVehicleBoardings } from "./MyVehicleBoardings";

export function MypageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loggingOut, setLoggingOut] = useState(false);
  const { data: me, isPending, isError, error, refetch } = useMe();

  // 진입 가드: 회원 영역 — member·token 둘 중 하나라도 없으면 로그인으로(복귀 경로 유지).
  // token만 없는 경우 useMe가 enabled:false로 무한 로딩되는 것을 함께 차단. 마운트 1회만.
  useEffect(() => {
    const s = useAuthStore.getState();
    if (!s.member || !s.accessToken) router.replace("/login?next=/mypage");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // /me가 인증 실패(401/403)로 떨어지면 라이브 세션이 죽은 것(DB 초기화·서버측 토큰 회수 등).
  // authFetch는 INVALID_TOKEN만 자동 정리하므로, 그 외 인증 실패로 persist된 member 스냅샷이
  // 남아 에러 화면에 갇히는 것을 self-heal: 세션을 비우고 로그인으로 보낸다.
  const sessionDead =
    isError && error instanceof ApiError && (error.status === 401 || error.status === 403);
  useEffect(() => {
    if (!sessionDead) return;
    useAuthStore.getState().clear();
    queryClient.removeQueries({ queryKey: ["me"] });
    router.replace("/login?next=/mypage");
    // router·queryClient는 실 런타임에서 안정 — sessionDead 전이 시 1회만 실행(가드 effect와 동일 패턴).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionDead]);

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
            <div className="flex items-center gap-sm">
              <Button variant="secondary" onClick={() => refetch()}>다시 시도</Button>
              {/* 세션이 죽었거나 복구 안 돼도 빠져나갈 수 있는 탈출구 — 에러 화면에 갇히지 않게 */}
              {/* 로그아웃은 파괴적 액션이 아니므로 secondary 사용 */}
              <Button variant="secondary" loading={loggingOut} onClick={onLogout}>로그아웃</Button>
            </div>
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
            <MyChallengeHistory delay={150} />
            <MyVehicleBoardings delay={165} />
            <ManageHub delay={180} />
            <Reveal delay={240}>
              <div className="flex items-center justify-between gap-md pt-sm">
                <WithdrawDialog />
                {/* 로그아웃은 파괴적 액션이 아니므로 secondary 사용 */}
                <Button variant="secondary" loading={loggingOut} onClick={onLogout}>로그아웃</Button>
              </div>
            </Reveal>
          </div>
        )}
      </div>
    </Container>
  );
}
