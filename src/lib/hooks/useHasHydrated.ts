"use client";

import { useSyncExternalStore } from "react";

// 클라이언트 하이드레이션 완료 여부 — 서버/첫 렌더 false, 하이드레이트 후 true.
// 점진적 향상 게이트: 무JS/SSR 마크업은 비-인터랙티브(전부 가시) 상태로 직렬화된다.
const subscribe = () => () => {};

export function useHasHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
