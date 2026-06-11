// Spring PagedModel(VIA_DTO) 직렬화(가이드 3.1). page 하위 키는 정확히 4개.
export interface PageMeta {
  size: number;
  number: number; // 0-base 현재 페이지
  totalElements: number;
  totalPages: number;
}
export interface Page<T> {
  content: T[];
  page: PageMeta;
}

// 표준 목록 쿼리(가이드 3.4): page 0-base, tagId 단수. undefined 필드는 생략한다.
export interface ListQuery {
  page?: number;
  size?: number;
  sort?: string;
  tagId?: number;
}
export function buildListQuery(q: ListQuery): string {
  const sp = new URLSearchParams();
  if (q.page != null) sp.set("page", String(q.page));
  if (q.size != null) sp.set("size", String(q.size));
  if (q.sort) sp.set("sort", q.sort);
  if (q.tagId != null) sp.set("tagId", String(q.tagId));
  const s = sp.toString();
  return s ? `?${s}` : "";
}
