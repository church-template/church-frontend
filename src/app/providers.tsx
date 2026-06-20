"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// QueryClient는 1회 생성(리렌더·SSR 안전). 회원 영역 TanStack Query 전용.
// 기본값 보정: 탭 복귀 시 회원 쿼리 일괄 재요청(refetch storm) 방지 + 인증 흐름은 재시도 무의미.
// staleTime 60s로 짧은 캐시를 두되, 변경 후에는 onSuccess의 invalidateQueries로 즉시 갱신한다.
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: false },
        },
      }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
