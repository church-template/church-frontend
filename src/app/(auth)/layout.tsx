import type { ReactNode } from "react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";

// 인증 전용 셸 — SiteShell(헤더·푸터) 대신 풀스크린 스플릿(스펙 §3.1). route group이라 URL 불변.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthSplitLayout>{children}</AuthSplitLayout>;
}
