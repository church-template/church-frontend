"use client";

import { toast } from "sonner";

// Toast 출력 단일 채널. T06 errorCode→UI 매핑(가이드 4.2)은 이 seam만 호출한다.
// client 컴포넌트·이벤트 핸들러 전용 — 서버 컴포넌트/서버 액션에서 import·호출 금지.
export const notify = {
  success: (message: string) => toast.success(message, { duration: 4000 }),
  error: (message: string) => toast.error(message, { duration: 4000 }),
};
