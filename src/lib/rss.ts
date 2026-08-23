// RSS 2.0 XML 생성 — 네이버 서치어드바이저 제출용(웹문서 수집 보조, 스펙 6장).
// 순수 함수로 두고 route handler와 분리해 테스트한다.

export interface RssItem {
  title: string;
  link: string; // 절대 URL
  pubDate: Date;
  description: string;
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildRssXml(
  channel: { title: string; link: string; description: string },
  items: RssItem[],
): string {
  const itemXml = items
    .map(
      (i) => `    <item>
      <title>${escapeXml(i.title)}</title>
      <link>${escapeXml(i.link)}</link>
      <guid>${escapeXml(i.link)}</guid>
      <pubDate>${i.pubDate.toUTCString()}</pubDate>
      <description>${escapeXml(i.description)}</description>
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>
${itemXml}
  </channel>
</rss>`;
}
