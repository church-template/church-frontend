// 관리 허브 진입 카드의 단일 정의. 공개 페이지 있는 도메인(inline)은 그 페이지로,
// 운영 도메인(manage)은 /mypage/manage/* 전용 화면으로 링크.
// category: 허브에서 테마별 섹션으로 묶어 가독성을 높인다(MANAGE_CATEGORIES 순서대로 렌더).
export type ManageCategory = "content" | "media" | "org" | "governance";

export interface ManageDomain {
  key: string;
  label: string;
  permission: string;
  href: string;
  kind: "inline" | "manage";
  category: ManageCategory;
}

// 카테고리 표시 순서·라벨. 보유 권한 카드가 0개인 카테고리는 허브에서 제목째 숨긴다.
export const MANAGE_CATEGORIES: { key: ManageCategory; label: string }[] = [
  { key: "content", label: "콘텐츠" }, // 교회가 게시하는 글(태그는 이들에 다형 연결)
  { key: "media", label: "미디어·업로드" }, // 파일 업로드 성격
  { key: "org", label: "조직" }, // 조직 구조
  { key: "governance", label: "회원·권한" }, // 거버넌스(가장 민감)
];

export const MANAGE_DOMAINS: ManageDomain[] = [
  { key: "sermons", label: "설교 관리", permission: "SERMON_WRITE", href: "/sermons", kind: "inline", category: "content" },
  { key: "notices", label: "공지 관리", permission: "NOTICE_WRITE", href: "/notices", kind: "inline", category: "content" },
  { key: "events", label: "일정 관리", permission: "EVENT_WRITE", href: "/events", kind: "inline", category: "content" },
  { key: "gallery", label: "갤러리 관리", permission: "GALLERY_WRITE", href: "/gallery", kind: "inline", category: "media" },
  { key: "bulletins", label: "주보 관리", permission: "BULLETIN_WRITE", href: "/bulletins", kind: "inline", category: "media" },
  { key: "departments", label: "부서 관리", permission: "DEPT_WRITE", href: "/mypage/manage/departments", kind: "manage", category: "org" },
  { key: "media", label: "미디어 관리", permission: "MEDIA_MANAGE", href: "/mypage/manage/media", kind: "manage", category: "media" },
  { key: "tags", label: "태그 관리", permission: "TAG_MANAGE", href: "/mypage/manage/tags", kind: "manage", category: "content" },
  { key: "challenges", label: "통독 챌린지 관리", permission: "CHALLENGE_MANAGE", href: "/mypage/manage/challenges", kind: "manage", category: "content" },
  { key: "positions", label: "직분 관리", permission: "POSITION_MANAGE", href: "/mypage/manage/positions", kind: "manage", category: "org" },
  { key: "members", label: "회원 관리", permission: "MEMBER_MANAGE", href: "/mypage/manage/members", kind: "manage", category: "governance" },
  { key: "roles", label: "역할·권한 관리", permission: "ROLE_MANAGE", href: "/mypage/manage/roles", kind: "manage", category: "governance" },
];
