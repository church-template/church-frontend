// 백엔드는 별도 오리진(:8080). NEXT_PUBLIC_API_BASE는 Next가 빌드 시 인라인.
// 테스트(vitest)에서는 미설정이라 ""로 fallback → path만 남아 endsWith 매칭이 동작.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

// path는 항상 "/api/..." 형태. base와 결합해 요청 URL을 만든다(호출자는 apiUrl을 미리 붙이지 않는다).
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
