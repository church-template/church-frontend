"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MobileNav } from "./MobileNav";
import { Container } from "./Container";
import { NAV_PRIMARY, NAV_AUTH } from "@/constants/navigation";
import { isActiveItem, isActivePath } from "@/lib/nav";
import { CHURCH_NAME } from "@/constants/church";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

export interface SiteHeaderProps {
  variant?: "light" | "transparent";
}

// 전역 헤더. light=서브페이지(흐름·64px), transparent=히어로 위(fixed·on-dark, 메인 T8/부서 T9).
export function SiteHeader({ variant = "light" }: SiteHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isTransparent = variant === "transparent";

  // TODO(T8/T9): transparent variant 스크롤 진행도 배경 전환 — T07은 정적 fixed+on-dark만(스펙 §5.2).
  const headerCls = isTransparent
    ? "fixed inset-x-0 top-0 z-nav bg-transparent text-on-dark"
    : "border-b border-hairline bg-canvas text-ink";
  const linkColor = isTransparent ? "text-on-dark" : "text-ink";
  const accentColor = isTransparent ? "text-on-dark" : "text-primary";

  return (
    <header className={headerCls}>
      <Container className="flex h-nav items-center justify-between">
        <Link href="/" className={cn(typo.titleMd, accentColor)}>
          {CHURCH_NAME}
        </Link>

        <nav aria-label="주 메뉴" className="hidden items-center gap-lg md:flex">
          {NAV_PRIMARY.map((item) =>
            item.children ? (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger
                  className={cn(
                    typo.navLink,
                    linkColor,
                    isActiveItem(pathname, item) && "underline underline-offset-8",
                  )}
                >
                  {item.label}
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {item.children.map((c) => (
                    <DropdownMenuItem key={c.href} asChild>
                      <Link href={c.href}>{c.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // children 없는 항목은 href가 항상 존재(navigation.ts 데이터 계약)
              <Link
                key={item.label}
                href={item.href!}
                className={cn(
                  typo.navLink,
                  linkColor,
                  isActivePath(pathname, item.href!) &&
                    "underline underline-offset-8",
                )}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-base md:flex">
          {NAV_AUTH.map((l) => (
            <Link key={l.href} href={l.href} className={cn(typo.navLink, accentColor)}>
              {l.label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={menuOpen}
          className={cn(
            "p-xs md:hidden", // 아이콘 24 + 패딩 8×2 = 40px 터치 타깃
            "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
            linkColor,
          )}
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={24} aria-hidden />
        </button>
      </Container>
      <MobileNav open={menuOpen} onOpenChange={setMenuOpen} />
    </header>
  );
}
