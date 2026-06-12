// 공개 API 응답 타입 — docs/api-docs.json(OpenAPI, 스키마 단일 진실)을 그대로 선언한다.
// 카드 응답은 본문(content)·version 없는 메타만(가이드 3.2). T10~T12 목록 페이지가 재사용.

export interface TagResponse {
  id: number;
  name: string;
}

export interface SermonCardResponse {
  id: number;
  title: string;
  preacher: string;
  series?: string | null;
  scripture?: string | null;
  preachedAt: string; // date (yyyy-MM-dd)
  viewCount: number;
  tags: TagResponse[];
  author?: string | null;
}

export interface NoticeCardResponse {
  id: number;
  title: string;
  isPinned: boolean;
  viewCount: number;
  createdAt: string; // offset 없는 LocalDateTime — parseServerDate로 파싱
  tags: TagResponse[];
  author?: string | null;
}

export interface EventCardResponse {
  id: number;
  title: string;
  location?: string | null;
  startAt: string; // LocalDateTime
  endAt?: string | null; // null = 점(단일 시점) 이벤트 (가이드 13.2)
  allDay: boolean;
  tags: TagResponse[];
}

export interface MainResponse {
  sermons: SermonCardResponse[];
  notices: NoticeCardResponse[];
  upcomingEvents: EventCardResponse[];
}
