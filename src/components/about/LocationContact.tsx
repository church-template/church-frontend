import { Copy } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { buttonVariants } from "@/components/ui/Button";
import { CopyableField } from "./CopyableField";
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
          {/* 좌 — 연락 정보(각 항목은 복사 버튼·길게 누르기로 복사) */}
          <div>
            <p className={cn(typo.caption, "flex items-center gap-xs text-muted")}>
              <Copy size={16} aria-hidden />
              복사 버튼을 누르거나 항목을 길게 누르면 복사됩니다.
            </p>
            <dl className="mt-sm border-t border-hairline">
              <CopyableField label="주소" value={CHURCH_ADDRESS} />
              <CopyableField label="전화번호" value={CHURCH_PHONE} href={`tel:${CHURCH_PHONE}`} />
              <CopyableField label="이메일 주소" value={CHURCH_EMAIL} href={`mailto:${CHURCH_EMAIL}`} />
            </dl>
          </div>

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
