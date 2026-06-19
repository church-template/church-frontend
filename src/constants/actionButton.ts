// 액션 버튼의 라벨·아이콘 단일 정의(버튼 일관성 스펙 §4.4). 호출부는 여기서 가져와 흔들림을 막는다.
import { Plus, Pencil, Trash2 } from "lucide-react";

export const ACTION = {
  edit: { label: "수정", Icon: Pencil },
  delete: { label: "삭제", Icon: Trash2 },
  save: { label: "저장" },
  cancel: { label: "취소" },
} as const;

// 생성 라벨은 엔티티명이 들어가 동적 → 헬퍼로 조합. 아이콘은 Plus 공유.
export const CREATE_ICON = Plus;
export const createLabel = (entity: string) => `새 ${entity}`;
