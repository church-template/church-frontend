"use client";

import { useSyncExternalStore } from "react";

export const REDUCED_MQ = "(prefers-reduced-motion: reduce)";
export const MOBILE_MQ = "(max-width: 639px)";

// 매체쿼리 구독 — MediaCollage 내부 로컬 훅의 공유 추출(동결 파일 미수정).
// effect 내 동기 setState 없이(set-state-in-effect lint 회피), SSR=false·회전/모션설정 변경에 반응.
export function useMediaFlag(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
