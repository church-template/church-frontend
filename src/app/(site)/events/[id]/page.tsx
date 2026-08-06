import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { getEvent } from "@/lib/api/events";
import { CHURCH_DESCRIPTION } from "@/constants/church";
import { excerpt } from "@/lib/seo";
import { EventDetailView } from "@/components/events/EventDetailView";
import { EventJsonLd } from "@/components/seo/EventJsonLd";
import { EventDetailActions } from "@/components/events/EventAdminActions";

// getEvent는 revalidate 60 캐시라 부수효과는 없지만, 같은 요청 내 generateMetadata·페이지의
// 중복 호출을 없애기 위해 공지 상세와 동일하게 요청 단위로 캐시한다.
const getEventCached = cache(getEvent);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) return {};
  const event = await getEventCached(numId);
  if (!event) return {};
  const description = excerpt(event.description) || CHURCH_DESCRIPTION;
  return {
    title: event.title,
    description,
    alternates: { canonical: `/events/${event.id}` },
    openGraph: {
      title: event.title,
      description,
      url: `/events/${event.id}`,
    },
  };
}

// 공개 일정 상세(딥링크). 일정은 viewCount 없음 → 캐시 가능(getEvent revalidate 60).
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const event = await getEventCached(numId);
  if (!event) notFound();

  return (
    <Container as="section" className="py-section">
      <EventJsonLd event={event} />
      <Link
        href="/events"
        className={cn(typo.bodySm, "inline-flex items-center gap-xxs text-primary")}
      >
        <ChevronLeft size={16} aria-hidden />
        일정
      </Link>

      <div className="flex items-start justify-between gap-base mt-lg">
        <h1 className={cn(typo.titleLg, "text-ink")}>{event.title}</h1>
        <EventDetailActions event={event} />
      </div>
      <div className="mt-xs">
        <EventDetailView event={event} />
      </div>
    </Container>
  );
}
