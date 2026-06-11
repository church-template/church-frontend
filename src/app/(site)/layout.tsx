import type { ReactNode } from "react";
import { SiteShell } from "@/components/shell/SiteShell";

// 표준 서브페이지 공통 셸. route group이라 URL 세그먼트를 추가하지 않는다(/about 등 그대로).
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
