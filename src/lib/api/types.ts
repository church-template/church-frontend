// 공개 API 응답 타입 — docs/api-docs.json(OpenAPI, 스키마 단일 진실)을 그대로 선언한다.
// 카드 응답은 본문(content)·version 없는 메타만(가이드 3.2). T10~T12 목록 페이지가 재사용.
//
// ── 어드민 트랙(02~07) 요청 타입 컨벤션 (병렬 작업 공유 규칙) ─────────────────
// 1. 어드민 쓰기 요청 타입(SermonCreateRequest·NoticeUpdateRequest·EventCreateRequest 등)은
//    이 공유 파일이 아니라 각 도메인 src/lib/api/{도메인}.ts 에 도메인-로컬로 둔다
//    (여러 도메인이 이 파일을 동시 확장하면 머지 충돌 → 도메인 파일로 격리).
// 2. 수정(PUT/PATCH) 요청 타입에는 낙관락 version: number 를 포함한다
//    (가이드 8장 OPTIMISTIC_LOCK_CONFLICT 재편집 흐름).
// 3. 이 파일에는 공개 GET 응답 타입만 둔다.
// ─────────────────────────────────────────────────────────────────────────────

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

export interface DepartmentCardResponse {
  id: number;
  name: string;
  leader: string;
  parentId: number | null;
  sortOrder: number;
}

export interface DepartmentDetailResponse extends DepartmentCardResponse {
  description: string;
  createdAt: string; // LocalDateTime
  updatedAt: string;
  version: number; // 낙관적 락
}

export interface DepartmentNode extends DepartmentCardResponse {
  children: DepartmentNode[];
}

// 공지 상세 응답 — 카드 메타 + 본문·수정일·낙관적 락(가이드 10장, OpenAPI NoticeDetailResponse).
export interface NoticeDetailResponse {
  id: number;
  title: string;
  content: string; // raw 마크다운
  isPinned: boolean;
  viewCount: number;
  createdAt: string; // LocalDateTime
  updatedAt: string;
  version: number; // 낙관적 락
  tags: TagResponse[];
  author?: string | null; // 서버 마스킹 적용
}

// 상세 응답 — 카드 메타 + 본문·외부링크·낙관적 락(가이드 10장, OpenAPI SermonDetailResponse).
export interface SermonDetailResponse {
  id: number;
  title: string;
  preacher: string;
  series?: string | null;
  scripture?: string | null;
  content: string; // raw 마크다운
  videoUrl?: string | null;
  audioUrl?: string | null;
  preachedAt: string; // date (yyyy-MM-dd)
  viewCount: number;
  createdAt: string; // LocalDateTime
  updatedAt: string;
  version: number;
  tags: TagResponse[];
  author?: string | null; // 서버 마스킹 적용
}

// 일정 상세 — 카드 메타 + description·수정일·낙관적 락(OpenAPI EventDetailResponse).
// 필드 집합은 OpenAPI와 정확히 일치(11개). nullable(?)은 OpenAPI 명시가 아니라
// 도메인 규약(가이드 13.2 점 이벤트·10장 description) + types.ts 관행 기반 해석.
export interface EventDetailResponse {
  id: number;
  title: string;
  description?: string | null; // raw 마크다운 (없을 수 있음)
  location?: string | null;
  startAt: string; // offset 없는 LocalDateTime
  endAt?: string | null; // null = 점(단일 시점) 이벤트
  allDay: boolean;
  createdAt: string;
  updatedAt: string;
  version: number; // 낙관적 락 (표시엔 미사용, 어드민 대비)
  tags: TagResponse[];
}

// 주보 카드 — 본문 없음, PDF는 mediaId FK(가이드 10장, OpenAPI BulletinCardResponse).
export interface BulletinCardResponse {
  id: number;
  title: string;
  serviceDate: string; // date (yyyy-MM-dd) — 예배일
  mediaId: number;
  createdAt: string; // LocalDateTime
  author?: string | null; // 서버 마스킹 적용(가이드 7장) — 그대로 표기
}

// 주보 상세(공개 GET /api/bulletins/{id}) — 어드민 수정 시 낙관락 version 시드에 사용(스펙 §3.3·§5.3).
export interface BulletinDetailResponse {
  id: number;
  title: string;
  serviceDate: string; // date (yyyy-MM-dd)
  mediaId: number;
  author?: string | null;
  createdAt: string; // LocalDateTime
  updatedAt: string;
  version: number; // 낙관락
}

// 갤러리(회원전용, GALLERY_VIEW) — OpenAPI Gallery*Response. 다른 Response와 달리 authFetch로만 조회.
// nullable(?)은 OpenAPI 명시가 아니라 도메인 규약(가이드 6.5 author 보유)·types.ts 관행 기반 해석.
export interface GalleryAlbumCardResponse {
  id: number;
  title: string;
  thumbnailMediaId: number | null; // 첫 사진, 없으면 null → 플레이스홀더
  photoCount: number;
  createdAt: string; // offset 없는 LocalDateTime — parseServerDate/formatDate로 표기
  tags: TagResponse[];
  author?: string | null;
}

export interface GalleryPhotoResponse {
  id: number;
  mediaId: number; // /api/media/{mediaId} 공개 서빙
  caption?: string | null;
  sortOrder: number;
}

export interface GalleryAlbumDetailResponse {
  id: number;
  title: string;
  description?: string | null; // raw 마크다운
  tags: TagResponse[];
  author?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number; // 낙관락 — 앨범 PATCH에서 읽어 전송(스펙 §8)
  photos: GalleryPhotoResponse[];
}

export interface PositionResponse {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string; // ISO. 화면 미표시(정렬·진단용)
}
