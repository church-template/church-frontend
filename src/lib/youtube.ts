// 외부 영상 URL에서 유튜브 video id(11자)를 추출한다. 유튜브가 아니면 null → 호출부가 링크 폴백.
const PATTERNS = [
  /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/,
  /youtu\.be\/([\w-]{11})/,
  /youtube\.com\/embed\/([\w-]{11})/,
];

export function parseYouTubeId(url: string): string | null {
  if (!url) return null;
  for (const re of PATTERNS) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}
