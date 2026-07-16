import {
  CHURCH_ADDRESS,
  CHURCH_EMAIL,
  CHURCH_LOGO,
  CHURCH_NAME,
  CHURCH_NAME_FULL,
  CHURCH_PHONE,
  CHURCH_URL,
} from "@/constants/church";

// 교회 구조화데이터(schema.org Church). 검색엔진이 교회명·위치·연락처를 리치 결과로 인식하게 한다.
// 콘텐츠는 전부 church.ts 상수 주입(하드코딩 금지). root layout에서 1회 렌더한다.
export function ChurchJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Church",
    name: CHURCH_NAME_FULL,
    alternateName: CHURCH_NAME,
    url: CHURCH_URL,
    logo: `${CHURCH_URL}${CHURCH_LOGO.src}`,
    image: `${CHURCH_URL}/og-image.jpg`,
    telephone: CHURCH_PHONE,
    email: CHURCH_EMAIL,
    address: {
      "@type": "PostalAddress",
      streetAddress: CHURCH_ADDRESS,
      addressCountry: "KR",
    },
  };

  return (
    <script
      type="application/ld+json"
      // 상수 데이터를 JSON.stringify한 결과라 사용자 입력이 없어 XSS 벡터가 없다.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
