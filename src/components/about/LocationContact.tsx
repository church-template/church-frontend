import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { buttonVariants } from "@/components/ui/Button";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import {
  CHURCH_ADDRESS,
  CHURCH_PHONE,
  CHURCH_EMAIL,
  MAP_EMBED_SRC,
  mapSearchUrl,
  naverMapSearchUrl,
} from "@/constants/church";
import { LOCATION } from "@/constants/content";

// 흰 캔버스 — 연락 정보(좌)와 약도(우) 비대칭 5/7 스플릿. 약도는 임베드 폴백 분기 보존.
export function LocationContact() {
  return (
    <Container as="section" className="break-keep py-section">
      <Reveal>
        <h1 className={cn(typo.displayMd, "text-ink")}>{LOCATION.title}</h1>
        <p className={cn(typo.bodyLg, "mt-base text-body")}>{LOCATION.lead}</p>

        <div className="mt-xxl grid gap-xl lg:grid-cols-[5fr_7fr] lg:items-start">
          {/* 좌 — 연락 정보 */}
          <dl className="border-t border-hairline">
            <div className="border-b border-hairline py-base">
              <dt className={cn(typo.captionStrong, "text-muted")}>주소</dt>
              <dd className={cn(typo.bodyLg, "mt-xs text-ink")}>{CHURCH_ADDRESS}</dd>
            </div>
            <div className="border-b border-hairline py-base">
              <dt className={cn(typo.captionStrong, "text-muted")}>전화</dt>
              <dd className={cn(typo.bodyLg, "mt-xs text-ink")}>
                <a href={`tel:${CHURCH_PHONE}`} className="hover:text-primary">
                  {CHURCH_PHONE}
                </a>
              </dd>
            </div>
            <div className="border-b border-hairline py-base">
              <dt className={cn(typo.captionStrong, "text-muted")}>이메일</dt>
              <dd className={cn(typo.bodyLg, "mt-xs break-all text-ink")}>
                <a href={`mailto:${CHURCH_EMAIL}`} className="hover:text-primary">
                  {CHURCH_EMAIL}
                </a>
              </dd>
            </div>
          </dl>

          {/* 우 — 약도(임베드 있으면 iframe, 없으면 약도 이미지 + 외부 지도 링크) */}
          <div>
            {MAP_EMBED_SRC ? (
              <iframe
                src={MAP_EMBED_SRC}
                title="교회 위치 지도"
                loading="lazy"
                className="aspect-video w-full rounded-xl border border-hairline"
              />
            ) : (
              <div className="flex flex-col gap-base">
                {/* eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸 */}
                <img
                  src={LOCATION.map.src}
                  alt={LOCATION.map.alt}
                  loading="lazy"
                  className="aspect-video w-full rounded-xl border border-hairline object-cover"
                />
                {/* 외부 지도 폴백 — 카카오·네이버 둘 다 주소 검색(실제 경로 길찾기는 각 앱에서). */}
                <div className="grid gap-sm sm:grid-cols-2">
                  <a
                    href={mapSearchUrl(CHURCH_ADDRESS)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants("kakao")}
                  >
                    카카오맵에서 보기
                  </a>
                  <a
                    href={naverMapSearchUrl(CHURCH_ADDRESS)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants("naver")}
                  >
                    네이버지도에서 보기
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </Container>
  );
}
