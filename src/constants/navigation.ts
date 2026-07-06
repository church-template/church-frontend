// 사이트 정보구조(IA) 단일 출처. 헤더(메가메뉴)·모바일·푸터가 이 데이터를 소비한다(하드코딩 0).
export type NavIconKey =
  | "church"
  | "history"
  | "sparkles"
  | "mapPin"
  | "calendarClock"
  | "bookOpen"
  | "bookOpenCheck"
  | "graduationCap"
  | "bell"
  | "calendar"
  | "newspaper"
  | "images"
  | "users"
  | "music"
  | "heart";

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
  { label: "소개 및 비전", href: "/about", icon: "church" },
  { label: "연혁", href: "/about/history", icon: "history" },
  { label: "목회자 인사말", href: "/about/pastor", icon: "users" },
  { label: "교회 사진", href: "/about/photos", icon: "images" },
  { label: "연락처 및 위치", href: "/about/location", icon: "mapPin" },
];
const WORSHIP_LINKS: NavLink[] = [
  { label: "예배시간", href: "/worship", icon: "calendarClock" },
  { label: "설교", href: "/sermons", icon: "bookOpen" },
  { label: "성경통독", href: "/challenges", icon: "bookOpenCheck" },
];
// 사역 부서 — slug는 constants/departments.ts의 DEPARTMENTS와 일치(navigation.test가 드리프트 감시).
const MINISTRY_LINKS: NavLink[] = [
  { label: "학생부", href: "/departments/student", icon: "bookOpen" },
  { label: "청년부", href: "/departments/youth", icon: "users" },
  { label: "예배부", href: "/departments/praise", icon: "music" },
  { label: "남선교회", href: "/departments/men", icon: "users" },
  { label: "여선교회", href: "/departments/women", icon: "heart" },
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
  { label: "사역", href: "/departments", children: MINISTRY_LINKS },
  { label: "교회소식", href: "/notices", children: NEWS_LINKS },
];

// 인증 영역은 하나만 노출 — member 스냅샷 유무로 SiteHeader/MobileNav가 선택(스펙 M4).
export const NAV_LOGIN: NavLink = { label: "로그인", href: "/login" };
export const NAV_MYPAGE: NavLink = { label: "마이페이지", href: "/mypage" };

export const FOOTER_COLUMNS: { title: string; links: NavLink[] }[] = [
  { title: "교회안내", links: ABOUT_LINKS },
  { title: "예배·설교", links: WORSHIP_LINKS },
  { title: "사역", links: MINISTRY_LINKS },
  { title: "교회소식", links: NEWS_LINKS },
];
