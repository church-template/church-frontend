import { CHURCH_NAME_FULL, CHURCH_URL } from "@/constants/church";
import { parseServerDate } from "@/lib/date";
import { excerpt } from "@/lib/seo";
import type { NoticeDetailResponse } from "@/lib/api/types";

// 공지 상세 구조화데이터(schema.org Article) — ChurchJsonLd 패턴. 데이터는 페이지 RSC가
// 이미 가진 응답을 주입해 추가 fetch가 없다. 제목·본문은 어드민 입력이라 </script> 이탈을
// 막기 위해 "<"를 유니코드 이스케이프한다(상수만 넣는 ChurchJsonLd와 다른 점).
export function ArticleJsonLd({ notice }: { notice: NoticeDetailResponse }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: notice.title,
    description: excerpt(notice.content),
    datePublished: parseServerDate(notice.createdAt).toISOString(),
    dateModified: parseServerDate(notice.updatedAt).toISOString(),
    mainEntityOfPage: `${CHURCH_URL}/notices/${notice.id}`,
    author: { "@type": "Organization", name: CHURCH_NAME_FULL },
    publisher: { "@type": "Organization", name: CHURCH_NAME_FULL },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}
