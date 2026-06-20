// 어드민 관리 쿼리키 규약. 공개/회원 키(["me"]·["albums",...])와 "admin" prefix로 분리.
export const adminKeys = {
  list: (domain: string, params?: unknown) => ["admin", domain, "list", params] as const,
  // 무효화 전용 prefix(params 생략). list(domain)은 trailing undefined가 붙어 params 있는 쿼리와
  // 매칭 못 하므로, 파라미터 무관 일괄 무효화는 이 3요소 prefix(퍼지 매칭)를 쓴다.
  listAll: (domain: string) => ["admin", domain, "list"] as const,
  detail: (domain: string, id: number | string) => ["admin", domain, "detail", id] as const,
};
