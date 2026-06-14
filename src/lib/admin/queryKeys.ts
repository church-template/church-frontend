// 어드민 관리 쿼리키 규약. 공개/회원 키(["me"]·["albums",...])와 "admin" prefix로 분리.
export const adminKeys = {
  list: (domain: string, params?: unknown) => ["admin", domain, "list", params] as const,
  detail: (domain: string, id: number | string) => ["admin", domain, "detail", id] as const,
};
