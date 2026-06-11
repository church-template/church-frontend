// 사이트 정보구조(IA) 단일 출처. 헤더·모바일·푸터가 이 데이터를 소비한다(하드코딩 0).
export interface NavLink {
  label: string;
  href: string;
}
export interface NavItem {
  label: string;
  /** 단일 링크면 href, 드롭다운이면 children */
  href?: string;
  children?: NavLink[];
}

// 링크 그룹은 헤더 드롭다운과 푸터 열에서 공유한다(DRY).
const ABOUT_LINKS: NavLink[] = [
  { label: "소개", href: "/about" },
  { label: "연혁", href: "/about/history" },
  { label: "비전", href: "/about/vision" },
  { label: "오시는 길", href: "/about/location" },
];
const NEWS_LINKS: NavLink[] = [
  { label: "공지", href: "/notices" },
  { label: "일정", href: "/events" },
  { label: "주보", href: "/bulletins" },
  { label: "갤러리", href: "/gallery" },
];

export const NAV_PRIMARY: NavItem[] = [
  { label: "교회소개", children: ABOUT_LINKS },
  { label: "예배", href: "/worship" },
  { label: "설교", href: "/sermons" },
  { label: "소식", children: NEWS_LINKS },
  { label: "교육부서", href: "/departments" },
];

export const NAV_AUTH: NavLink[] = [
  { label: "로그인", href: "/login" },
  { label: "마이페이지", href: "/mypage" },
];

export const FOOTER_COLUMNS: { title: string; links: NavLink[] }[] = [
  { title: "교회소개", links: ABOUT_LINKS },
  { title: "소식", links: NEWS_LINKS },
  {
    title: "바로가기",
    links: [
      { label: "예배", href: "/worship" },
      { label: "설교", href: "/sermons" },
      { label: "교육부서", href: "/departments" },
    ],
  },
];
