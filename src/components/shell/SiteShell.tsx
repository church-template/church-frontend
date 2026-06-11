import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { CtaBand } from "./CtaBand";
import { SiteFooter } from "./SiteFooter";

export interface SiteShellProps {
  /** 프리푸터 CTA 밴드 표시 여부(404/error는 false). */
  showCtaBand?: boolean;
  children: ReactNode;
}

// 표준 페이지 라이트 셸. (site)/layout.tsx와 루트 404/error가 공유한다.
// 메인(T8)·부서(T9)는 투명 헤더를 직접 합성하므로 이 셸을 쓰지 않는다.
export function SiteShell({ showCtaBand = true, children }: SiteShellProps) {
  return (
    <>
      <SiteHeader variant="light" />
      <main className="flex-1">{children}</main>
      {showCtaBand ? <CtaBand /> : null}
      <SiteFooter />
    </>
  );
}
