// 권한 문자열 → 사용자 표시용 한글 라벨(가이드 2.2). 미정의 키는 raw 폴백(고령 가독성).
export const PERMISSION_LABELS: Record<string, string> = {
  SERMON_WRITE: "설교 관리",
  NOTICE_WRITE: "공지 관리",
  EVENT_WRITE: "일정 관리",
  DEPT_WRITE: "부서 관리",
  GALLERY_WRITE: "갤러리 관리",
  GALLERY_VIEW: "갤러리 열람",
  BULLETIN_WRITE: "주보 관리",
  MEDIA_MANAGE: "미디어 관리",
  TAG_MANAGE: "태그 관리",
  POSITION_MANAGE: "직분 관리",
  MEMBER_MANAGE: "회원 관리",
  ROLE_MANAGE: "역할·권한 관리",
  CHALLENGE_MANAGE: "통독 챌린지 관리",
  CHALLENGE_PARTICIPATE: "통독 챌린지 참여",
};

export function permissionLabel(perm: string): string {
  return PERMISSION_LABELS[perm] ?? perm;
}
