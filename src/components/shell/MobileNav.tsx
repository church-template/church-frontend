"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { NAV_PRIMARY, NAV_AUTH } from "@/constants/navigation";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

export interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 모바일(768px↓) 햄버거 시트. 제어형 — SiteHeader가 open 상태를 소유한다.
export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();
  const firstRender = useRef(true);

  // 라우트 변경 시 닫힘(링크 클릭·뒤로가기·프로그램적 전환). 최초 렌더는 건너뛴다.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    onOpenChange(false);
  }, [pathname, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* aria-describedby 명시적 해제 — 네비 시트는 별도 설명 텍스트가 불필요(Radix 경고 억제) */}
      <SheetContent side="right" className="gap-lg" aria-describedby={undefined}>
        <SheetTitle>메뉴</SheetTitle>
        <nav className="flex flex-col gap-base">
          {NAV_PRIMARY.map((item) =>
            item.href ? (
              <SheetClose asChild key={item.label}>
                <Link href={item.href} className={cn(typo.navLink, "text-ink")}>
                  {item.label}
                </Link>
              </SheetClose>
            ) : (
              <div key={item.label} className="flex flex-col gap-xs">
                <span className={cn(typo.captionStrong, "text-muted")}>
                  {item.label}
                </span>
                {item.children?.map((c) => (
                  <SheetClose asChild key={c.href}>
                    <Link href={c.href} className={cn(typo.bodySm, "pl-sm text-body")}>
                      {c.label}
                    </Link>
                  </SheetClose>
                ))}
              </div>
            ),
          )}
        </nav>
        <div className="mt-auto flex flex-col gap-xs border-t border-hairline pt-base">
          {NAV_AUTH.map((l) => (
            <SheetClose asChild key={l.href}>
              <Link href={l.href} className={cn(typo.navLink, "text-primary")}>
                {l.label}
              </Link>
            </SheetClose>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
