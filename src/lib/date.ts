// 서버 datetime은 offset 없는 LocalDateTime("2026-06-14T10:00:00"). JS new Date("...")는 브라우저
// 로컬TZ로 파싱돼 SSR/비KST에서 어긋남 → +09:00 명시 부착 후 파싱(KST 가정, 가이드 15.3 / 백엔드 A).
export function parseServerDate(s: string): Date {
  return /T/.test(s) ? new Date(`${s}+09:00`) : new Date(`${s}T00:00:00+09:00`);
}
