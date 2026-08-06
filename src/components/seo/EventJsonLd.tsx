import {
  CHURCH_ADDRESS,
  CHURCH_NAME_FULL,
  CHURCH_URL,
} from "@/constants/church";
import { parseServerDate } from "@/lib/date";
import { excerpt } from "@/lib/seo";
import type { EventDetailResponse } from "@/lib/api/types";

// 행사 상세 구조화데이터(schema.org Event) — ArticleJsonLd와 같은 패턴·이스케이프.
// location은 자유 텍스트 필드가 있으면 그 이름을, 없으면 교회를 장소로 둔다(외부 장소의
// 정확한 주소는 데이터에 없어 대표 주소로 갈음).
export function EventJsonLd({ event }: { event: EventDetailResponse }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: parseServerDate(event.startAt).toISOString(),
    ...(event.endAt
      ? { endDate: parseServerDate(event.endAt).toISOString() }
      : {}),
    ...(event.description ? { description: excerpt(event.description) } : {}),
    location: {
      "@type": "Place",
      name: event.location || CHURCH_NAME_FULL,
      address: CHURCH_ADDRESS,
    },
    organizer: {
      "@type": "Organization",
      name: CHURCH_NAME_FULL,
      url: CHURCH_URL,
    },
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
