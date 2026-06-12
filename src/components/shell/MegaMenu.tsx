import Link from "next/link";
import {
  Bell,
  BookOpen,
  Calendar,
  CalendarClock,
  Church,
  GraduationCap,
  Heart,
  History,
  Images,
  MapPin,
  Music,
  Newspaper,
  Sparkles,
  Users,
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
  users: Users,
  music: Music,
  heart: Heart,
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
