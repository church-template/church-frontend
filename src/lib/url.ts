// 외부 URL 스킴 화이트리스트 — 저장형 XSS(javascript:·data: 스킴) 방어. http(s)만 허용.
export function isSafeHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}
