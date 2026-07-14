"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { MobileNav } from "./MobileNav";
import { MegaMenu } from "./MegaMenu";
import { Container } from "./Container";
import { NAV_PRIMARY, NAV_LOGIN, NAV_MYPAGE } from "@/constants/navigation";
import { isActiveItem } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth/authStore";
import { CHURCH_NAME, CHURCH_LOGO } from "@/constants/church";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

export interface SiteHeaderProps {
  variant?: "light" | "transparent";
  /** transparent 전용 — 히어로 이탈 시 fixed 유지 + 라이트 스킨. HeroHeaderSync(T8)가 제어. */
  solid?: boolean;
}

// 전역 헤더. light=서브페이지(흐름·80px), transparent=히어로 위(fixed·on-dark, 메인 T8/부서 T9).
// 데스크톱은 호버/포커스 시 풀폭 메가메뉴(우리은행 GNB 방식, 스펙 M2), 모바일은 햄버거 시트.
export function SiteHeader({ variant = "light", solid = false }: SiteHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  // 인증 영역은 하나만 — member 스냅샷이 있으면 마이페이지, 없으면 로그인(스펙 M4).
  const member = useAuthStore((s) => s.member);
  const authLink = member ? NAV_MYPAGE : NAV_LOGIN;

  const isTransparent = variant === "transparent";
  // 메가메뉴(캔버스 패널)가 열리면 투명 헤더도 라이트 스킨으로 — 흰 패널 위 흰 글씨 방지(스펙 M5).
  const lightSkin = solid || megaOpen;
  const onDark = isTransparent && !lightSkin;

  const headerCls = isTransparent
    ? cn(
        "fixed inset-x-0 top-0 z-nav transition-colors duration-200",
        lightSkin
          ? "border-b border-hairline bg-canvas text-ink"
          : "bg-transparent text-on-dark",
      )
    : "relative z-nav border-b border-hairline bg-canvas text-ink"; // relative: 메가메뉴 anchor, z-nav: sticky 본문 위로
  const linkColor = onDark ? "text-on-dark" : "text-ink";
  const accentColor = onDark ? "text-on-dark" : "text-primary";

  return (
    <header
      className={headerCls}
      onMouseLeave={() => setMegaOpen(false)}
      onBlur={(e) => {
        // 포커스가 헤더 밖으로 나가면 패널 닫기(키보드 Tab 이탈 — WCAG 1.4.13).
        // 헤더 내부 이동(relatedTarget이 헤더 자식)은 무시.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setMegaOpen(false);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setMegaOpen(false);
        }
      }}
    >
      <Container className="flex h-nav items-center justify-between">
        {/* 로고 + 교회명. 로고는 이름 옆 장식이라 alt=""(스크린리더가 이름을 두 번 읽지 않게). */}
        <Link href="/" className={cn(typo.titleLg, accentColor, "flex items-center gap-base")}>
          <Image src={CHURCH_LOGO.src} alt="" width={512} height={512} priority className="size-10 shrink-0" />
          {CHURCH_NAME}
        </Link>

        <nav
          aria-label="주 메뉴"
          className="hidden items-center gap-xl md:flex"
          onMouseEnter={() => setMegaOpen(true)}
        >
          {NAV_PRIMARY.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onFocus={() => setMegaOpen(true)}
              className={cn(
                typo.navLink,
                linkColor,
                isActiveItem(pathname, item) && "underline underline-offset-8",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center md:flex">
          <Link href={authLink.href} className={cn(typo.navLink, accentColor)}>
            {authLink.label}
          </Link>
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
          <Menu size={28} aria-hidden />
        </button>
      </Container>

      <MegaMenu open={megaOpen} onNavigate={() => setMegaOpen(false)} />
      <MobileNav open={menuOpen} onOpenChange={setMenuOpen} />
    </header>
  );
}
