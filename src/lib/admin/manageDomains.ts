// 관리 허브 진입 카드의 단일 정의. 공개 페이지 있는 도메인(inline)은 그 페이지로,
// 운영 도메인(manage)은 /mypage/manage/* 전용 화면으로 링크.
export interface ManageDomain {
  key: string;
  label: string;
  permission: string;
  href: string;
  kind: "inline" | "manage";
}

export const MANAGE_DOMAINS: ManageDomain[] = [
  { key: "sermons", label: "설교 관리", permission: "SERMON_WRITE", href: "/sermons", kind: "inline" },
  { key: "notices", label: "공지 관리", permission: "NOTICE_WRITE", href: "/notices", kind: "inline" },
  { key: "events", label: "일정 관리", permission: "EVENT_WRITE", href: "/events", kind: "inline" },
  { key: "gallery", label: "갤러리 관리", permission: "GALLERY_WRITE", href: "/gallery", kind: "inline" },
  { key: "bulletins", label: "주보 관리", permission: "BULLETIN_WRITE", href: "/bulletins", kind: "inline" },
  { key: "departments", label: "부서 관리", permission: "DEPT_WRITE", href: "/mypage/manage/departments", kind: "manage" },
  { key: "media", label: "미디어 관리", permission: "MEDIA_MANAGE", href: "/mypage/manage/media", kind: "manage" },
  { key: "tags", label: "태그 관리", permission: "TAG_MANAGE", href: "/mypage/manage/tags", kind: "manage" },
  { key: "positions", label: "직분 관리", permission: "POSITION_MANAGE", href: "/mypage/manage/positions", kind: "manage" },
  { key: "members", label: "회원 관리", permission: "MEMBER_MANAGE", href: "/mypage/manage/members", kind: "manage" },
  { key: "roles", label: "역할·권한 관리", permission: "ROLE_MANAGE", href: "/mypage/manage/roles", kind: "manage" },
];
