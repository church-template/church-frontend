import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface ScheduleCardProps {
  name: string;
  time: string;
  place: string;
}

// surface-soft 배경, 패딩 32(p-xl). 예배명·시간·장소.
export function ScheduleCard({ name, time, place }: ScheduleCardProps) {
  return (
    <Card surface="soft" className="p-xl">
      <h3 className={cn(typo.titleMd, "text-ink")}>{name}</h3>
      <p className={cn(typo.datetime, "mt-xs text-body")}>{time}</p>
      <p className={cn(typo.bodySm, "mt-xxs text-muted")}>{place}</p>
    </Card>
  );
}
