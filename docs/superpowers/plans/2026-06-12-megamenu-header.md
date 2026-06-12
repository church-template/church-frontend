# 메가메뉴 헤더 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 우리은행 GNB 방식의 호버 풀폭 메가메뉴 + IA 4컬럼 재편 + 인증 단일 링크 + 헤더 텍스트 확대.

**Architecture:** `navigation.ts`(IA 단일 출처)에 icon 키를 추가해 4항목으로 재편 — 헤더(MegaMenu)·모바일·푸터가 자동 추종. 패널 상태는 SiteHeader가 소유, MegaMenu는 표시 전용.

**근거 스펙:** `docs/superpowers/specs/2026-06-12-megamenu-header-design.md` (M1~M6)

**공통:** pnpm / 커밋은 사용자가 일괄(태스크별 커밋 생략) / 삼항 조건부 / 주석 한국어 WHY / TDD

---

### Task 1: navigation.ts 재편 + nav.ts + 토큰/DESIGN.md

- [ ] **Step 1: `src/constants/navigation.ts` 전체 교체**

```ts
// 사이트 정보구조(IA) 단일 출처. 헤더(메가메뉴)·모바일·푸터가 이 데이터를 소비한다(하드코딩 0).
export type NavIconKey =
  | "church"
  | "history"
  | "sparkles"
  | "mapPin"
  | "calendarClock"
  | "bookOpen"
  | "graduationCap"
  | "bell"
  | "calendar"
  | "newspaper"
  | "images";

export interface NavLink {
  label: string;
  href: string;
  /** 메가메뉴 아이콘 플레이트 키 — 직렬화 가능한 문자열만, lucide 매핑은 MegaMenu가 담당 */
  icon?: NavIconKey;
}
export interface NavItem {
  label: string;
  /** 1뎁스 라벨 클릭 시 이동하는 대표 페이지 */
  href: string;
  children: NavLink[];
}

// 링크 그룹은 메가메뉴 컬럼과 푸터 열에서 공유한다(DRY).
const ABOUT_LINKS: NavLink[] = [
  { label: "소개", href: "/about", icon: "church" },
  { label: "연혁", href: "/about/history", icon: "history" },
  { label: "비전", href: "/about/vision", icon: "sparkles" },
  { label: "오시는 길", href: "/about/location", icon: "mapPin" },
];
const WORSHIP_LINKS: NavLink[] = [
  { label: "예배시간", href: "/worship", icon: "calendarClock" },
  { label: "설교", href: "/sermons", icon: "bookOpen" },
];
const DEPT_LINKS: NavLink[] = [
  // 부서별 라우트(T9/T13)가 생기면 여기에 추가 — 라우트 없는 항목은 만들지 않는다(스펙 M1).
  { label: "교육부서 안내", href: "/departments", icon: "graduationCap" },
];
const NEWS_LINKS: NavLink[] = [
  { label: "공지", href: "/notices", icon: "bell" },
  { label: "일정", href: "/events", icon: "calendar" },
  { label: "주보", href: "/bulletins", icon: "newspaper" },
  { label: "갤러리", href: "/gallery", icon: "images" },
];

export const NAV_PRIMARY: NavItem[] = [
  { label: "교회안내", href: "/about", children: ABOUT_LINKS },
  { label: "예배·설교", href: "/worship", children: WORSHIP_LINKS },
  { label: "교육부서", href: "/departments", children: DEPT_LINKS },
  { label: "소식", href: "/notices", children: NEWS_LINKS },
];

// 인증 영역은 하나만 노출 — member 스냅샷 유무로 SiteHeader/MobileNav가 선택(스펙 M4).
export const NAV_LOGIN: NavLink = { label: "로그인", href: "/login" };
export const NAV_MYPAGE: NavLink = { label: "마이페이지", href: "/mypage" };

export const FOOTER_COLUMNS: { title: string; links: NavLink[] }[] = [
  { title: "교회안내", links: ABOUT_LINKS },
  { title: "예배·설교", links: WORSHIP_LINKS },
  { title: "소식", links: NEWS_LINKS },
];
```

- [ ] **Step 2: `src/lib/nav.ts`의 isActiveItem 교체** — href가 비활성이어도 children이 활성이면 활성(예: /events에서 "소식"):

```ts
// NavItem 활성: 대표 href가 활성이거나 자식 중 하나가 활성.
export function isActiveItem(pathname: string, item: NavItem): boolean {
  if (item.href && isActivePath(pathname, item.href)) return true;
  return item.children?.some((c) => isActivePath(pathname, c.href)) ?? false;
}
```

- [ ] **Step 3: 토큰** — `src/app/globals.css`의 `--text-nav-link: 19px;` → `21px`

- [ ] **Step 4: DESIGN.md** — 타이포 표 nav-link 19→21 갱신, `### 네비게이션` 절에 추가:

```markdown
- **`mega-menu`**: 데스크톱 GNB(참조: 우리은행). 1뎁스 호버/포커스 시 헤더 아래 풀폭 캔버스
  패널이 펼쳐지고 전 카테고리가 컬럼으로 표시된다. 행 = 아이콘 플레이트(`{rounded.full}` 40px,
  `primary-soft` 틴트 단일 — 다색 금지) + lucide 아이콘(20px, `currentColor`=primary) + 라벨.
  닫힘: mouseleave·Esc·링크 클릭. 모바일은 햄버거 시트 유지.
```

- [ ] **Step 5: 기존 테스트 적응** — `navigation.test.ts`·`nav.test.ts`를 새 IA로 갱신(4항목·전부 href+children·NAV_LOGIN/NAV_MYPAGE·아이콘 키 존재, isActiveItem의 children 활성 케이스 추가). `pnpm test src/constants src/lib/nav.test.ts` GREEN까지.

---

### Task 2: MegaMenu 컴포넌트 (TDD)

- [ ] **Step 1: 실패하는 테스트** — `src/components/shell/MegaMenu.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { NAV_PRIMARY } from "@/constants/navigation";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { MegaMenu } from "./MegaMenu";

describe("MegaMenu", () => {
  it("열림: 4컬럼(1뎁스 라벨)과 모든 하위 링크·아이콘 플레이트를 렌더한다", () => {
    const { container } = render(<MegaMenu open onNavigate={() => {}} />);
    for (const item of NAV_PRIMARY) {
      expect(screen.getByText(item.label)).toBeDefined();
      for (const c of item.children) {
        expect(screen.getByText(c.label)).toBeDefined();
      }
    }
    const totalLinks = NAV_PRIMARY.reduce((n, i) => n + i.children.length, 0);
    expect(container.querySelectorAll("svg").length).toBe(totalLinks);
    expect(screen.getByTestId("mega-menu").getAttribute("aria-hidden")).toBe("false");
  });

  it("닫힘: aria-hidden + 모든 링크 tabIndex -1(포커스 차단)", () => {
    const { container } = render(<MegaMenu open={false} onNavigate={() => {}} />);
    expect(screen.getByTestId("mega-menu").getAttribute("aria-hidden")).toBe("true");
    container.querySelectorAll("a").forEach((a) => {
      expect(a.getAttribute("tabindex")).toBe("-1");
    });
  });

  it("링크 클릭 시 onNavigate를 호출한다(패널 닫기)", () => {
    const onNavigate = vi.fn();
    render(<MegaMenu open onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText("설교"));
    expect(onNavigate).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: RED 확인 → Step 3: 구현** — `src/components/shell/MegaMenu.tsx`:

```tsx
import Link from "next/link";
import {
  Bell,
  BookOpen,
  Calendar,
  CalendarClock,
  Church,
  GraduationCap,
  History,
  Images,
  MapPin,
  Newspaper,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Container } from "./Container";
import { NAV_PRIMARY, type NavIconKey } from "@/constants/navigation";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 아이콘은 컴포넌트에서 매핑 — 상수는 직렬화 가능한 키만(MinistryCards와 동일 패턴).
const ICONS: Record<NavIconKey, LucideIcon> = {
  church: Church,
  history: History,
  sparkles: Sparkles,
  mapPin: MapPin,
  calendarClock: CalendarClock,
  bookOpen: BookOpen,
  graduationCap: GraduationCap,
  bell: Bell,
  calendar: Calendar,
  newspaper: Newspaper,
  images: Images,
};

export interface MegaMenuProps {
  open: boolean;
  /** 링크 클릭 시 패널 닫기 — 상태는 SiteHeader가 소유 */
  onNavigate: () => void;
}

// 데스크톱 전용 풀폭 메가메뉴(스펙 M2·M3, DESIGN mega-menu). 모바일은 MobileNav 시트가 담당.
export function MegaMenu({ open, onNavigate }: MegaMenuProps) {
  return (
    <div
      data-testid="mega-menu"
      aria-hidden={!open}
      className={cn(
        "absolute inset-x-0 top-full hidden border-b border-hairline bg-canvas md:block",
        "transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none",
        open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
      )}
    >
      <Container className="grid grid-cols-4 gap-xl py-xl">
        {NAV_PRIMARY.map((item) => (
          <div key={item.label}>
            <Link
              href={item.href}
              onClick={onNavigate}
              tabIndex={open ? 0 : -1}
              className={cn(
                typo.titleSm,
                "block border-b border-hairline pb-sm text-ink transition-colors hover:text-primary",
              )}
            >
              {item.label}
            </Link>
            <ul className="mt-base flex flex-col gap-xs">
              {item.children.map((c) => {
                const Icon = c.icon ? ICONS[c.icon] : null;
                return (
                  <li key={c.href}>
                    <Link
                      href={c.href}
                      onClick={onNavigate}
                      tabIndex={open ? 0 : -1}
                      className={cn(
                        typo.navLink,
                        "flex items-center gap-sm py-xs text-body transition-colors hover:text-primary",
                      )}
                    >
                      {Icon ? (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                          <Icon size={20} aria-hidden />
                        </span>
                      ) : null}
                      {c.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </Container>
    </div>
  );
}
```

- [ ] **Step 4: PASS 확인** (3건)

---

### Task 3: SiteHeader 개편 + MobileNav 인증 단일

- [ ] **Step 1: `src/components/shell/SiteHeader.tsx` 전체 교체**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { MobileNav } from "./MobileNav";
import { MegaMenu } from "./MegaMenu";
import { Container } from "./Container";
import { NAV_PRIMARY, NAV_LOGIN, NAV_MYPAGE } from "@/constants/navigation";
import { isActiveItem } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth/authStore";
import { CHURCH_NAME } from "@/constants/church";
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
    : "relative border-b border-hairline bg-canvas text-ink"; // relative: 메가메뉴 anchor
  const linkColor = onDark ? "text-on-dark" : "text-ink";
  const accentColor = onDark ? "text-on-dark" : "text-primary";

  return (
    <header
      className={headerCls}
      onMouseLeave={() => setMegaOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setMegaOpen(false);
        }
      }}
    >
      <Container className="flex h-nav items-center justify-between">
        <Link href="/" className={cn(typo.titleMd, accentColor)}>
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
              aria-expanded={megaOpen}
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
          <Menu size={24} aria-hidden />
        </button>
      </Container>

      <MegaMenu open={megaOpen} onNavigate={() => setMegaOpen(false)} />
      <MobileNav open={menuOpen} onOpenChange={setMenuOpen} />
    </header>
  );
}
```

(기존 DropdownMenu import는 헤더에서 제거 — 쇼케이스의 사용은 무관하게 유지된다.)

- [ ] **Step 2: `src/components/shell/MobileNav.tsx` 수정** — ① import를 `NAV_PRIMARY, NAV_LOGIN, NAV_MYPAGE`로, `useAuthStore` 추가 ② nav 매핑을 전 항목 그룹 렌더로 교체:

```tsx
        <nav className="flex flex-col gap-base">
          {NAV_PRIMARY.map((item) => (
            <div key={item.label} className="flex flex-col gap-xs">
              <SheetClose asChild>
                <Link href={item.href} className={cn(typo.navLink, "text-ink")}>
                  {item.label}
                </Link>
              </SheetClose>
              {item.children.map((c) => (
                <SheetClose asChild key={c.href}>
                  <Link href={c.href} className={cn(typo.bodySm, "pl-sm text-body")}>
                    {c.label}
                  </Link>
                </SheetClose>
              ))}
            </div>
          ))}
        </nav>
```

③ 하단 인증 영역을 단일 링크로:

```tsx
        <div className="mt-auto flex flex-col gap-xs border-t border-hairline pt-base">
          <SheetClose asChild>
            <Link href={authLink.href} className={cn(typo.navLink, "text-primary")}>
              {authLink.label}
            </Link>
          </SheetClose>
        </div>
```

(컴포넌트 본문에 `const member = useAuthStore((s) => s.member); const authLink = member ? NAV_MYPAGE : NAV_LOGIN;` 추가 — 주석: 헤더와 동일 규칙, 스펙 M4.)

- [ ] **Step 3: 테스트 갱신·추가**
  - `SiteHeader.test.tsx`: 기존 단언을 새 IA 라벨로 적응 + 추가 케이스: ① nav `fireEvent.mouseEnter` → mega-menu `aria-hidden=false` ② `fireEvent.keyDown(header, { key: "Escape" })` → 닫힘 ③ 기본(member null) → "로그인"만 존재·"마이페이지" 부재 ④ `useAuthStore.setState({ member: {...최소 형태} })` 후 → "마이페이지"만 (테스트 끝에 setState로 원복) ⑤ 투명 variant에서 mouseEnter 시 헤더가 bg-canvas(라이트 스킨)
  - `MobileNav.test.tsx`: 그룹 렌더(예: "예배·설교" 라벨과 "설교" 자식 링크)·인증 단일 링크로 적응
  - `SiteFooter.test.tsx`: 새 컬럼명(교회안내·예배·설교·소식) 적응
  - `page.test.tsx` 등 라벨 의존 테스트가 깨지면 새 라벨로 갱신

- [ ] **Step 4: 전체 게이트** — `pnpm test && pnpm exec tsc --noEmit && pnpm lint && pnpm build`

---

### Task 4: 브라우저 검증 (컨트롤러)

- [ ] 데스크톱: 1뎁스 호버 → 풀폭 패널(4컬럼·아이콘 플레이트), 이탈/Esc 닫힘, 링크 정상
- [ ] 메인(투명 헤더): 호버 시 라이트 스킨 전환 → 패널 가독성
- [ ] 인증 영역: 로그인 하나만 표시
- [ ] 모바일: 햄버거 시트 그룹 구조·단일 인증 링크
- [ ] 헤더 텍스트 21px·간격 32px 실측
