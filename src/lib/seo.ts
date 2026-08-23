// 검색 메타(description)용 텍스트 헬퍼 — raw 마크다운 본문에서 평문 요약을 뽑는다.
// marked 렌더 후 태그 제거보다 정규식 스트립이 싼 이유: 서버 metadata 경로라 DOM이 없고,
// 요약 품질은 "대충 평문"이면 충분하다(검색 스니펫은 어차피 엔진이 재조립).

export const EXCERPT_MAX = 160;

export function stripMarkdown(md: string | null | undefined): string {
  if (!md) return "";
  return (
    md
      .replace(/```[\s\S]*?```/g, " ") // 코드블록
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // 이미지(media:{id} 포함, 가이드 5장)
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 링크 → 라벨만
      .replace(/media:\d+/g, " ") // 단독 문단 미디어 토큰
      .replace(/^#{1,6}\s+/gm, "") // 제목
      .replace(/^>\s?/gm, "") // 인용
      .replace(/^(-|\*|\d+\.)\s+/gm, "") // 목록 불릿
      .replace(/^-{3,}\s*$/gm, " ") // 구분선
      .replace(/(\*\*|__|~~|`|\*|_)/g, "") // 강조
      .replace(/\|/g, " ") // 표 구분자
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function excerpt(md: string | null | undefined, max = EXCERPT_MAX): string {
  const text = stripMarkdown(md);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
