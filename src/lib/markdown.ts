import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

// 경계 안전: media:42 뒤에 숫자가 이어지면 매칭 안 함(420/421 오탐 방지) — 서버 추적 규약과 동일.
const MEDIA_REF = /media:(\d+)(?!\d)/g;

// 마크다운이 생성하는 태그만 허용. 저자 작성 raw HTML(<div>·<iframe> 등)은 태그가 제거되고(내용은 보존),
// <script>·이벤트 핸들러는 통째 제거된다 → 가이드 5.1 "raw HTML 비허용" + 이슈 §7 "raw HTML 제거" 충족.
const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr",
  "strong", "em", "del", "blockquote", "ul", "ol", "li",
  "a", "img", "code", "pre", "table", "thead", "tbody", "tr", "th", "td",
];
const ALLOWED_ATTR = ["href", "title", "src", "alt"];

export function renderMarkdown(raw: string): string {
  const withUrls = raw.replace(MEDIA_REF, (_, id) => `/api/media/${id}`); // 1) media:{id} → 공개 URL
  const html = marked.parse(withUrls, { async: false }) as string;        // 2) MD → HTML
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });        // 3) 마크다운 태그만 허용(raw HTML 제거)
}
