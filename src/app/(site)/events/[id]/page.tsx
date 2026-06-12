import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { getEvent } from "@/lib/api/events";
import { EventDetailView } from "@/components/events/EventDetailView";

// 공개 일정 상세(딥링크). 일정은 viewCount 없음 → 캐시 가능(getEvent revalidate 60).
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const event = await getEvent(numId);
  if (!event) notFound();

  return (
    <Container as="section" className="py-section">
      <Link
        href="/events"
        className={cn(typo.bodySm, "inline-flex items-center gap-xxs text-primary")}
      >
        <ChevronLeft size={16} aria-hidden />
        일정
      </Link>

      <h1 className={cn(typo.titleLg, "mt-lg text-ink")}>{event.title}</h1>
      <div className="mt-xs">
        <EventDetailView event={event} />
      </div>
    </Container>
  );
}
