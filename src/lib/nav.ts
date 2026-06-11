import type { NavItem } from "@/constants/navigation";

// 현재 경로가 href에 속하는지(네비 활성 표시). "/"는 정확 일치만, 그 외는 정확 일치 또는 하위 경로.
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// NavItem 활성: 자기 href가 활성이거나, 드롭다운이면 자식 중 하나가 활성.
export function isActiveItem(pathname: string, item: NavItem): boolean {
  if (item.href) return isActivePath(pathname, item.href);
  return item.children?.some((c) => isActivePath(pathname, c.href)) ?? false;
}
