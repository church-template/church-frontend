import { type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface FeatureCardProps {
  icon?: ReactNode;
  title: string;
  description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="p-xl">
      {icon ? <div className="mb-base text-primary">{icon}</div> : null}
      <h3 className={cn(typo.titleMd, "text-ink")}>{title}</h3>
      <p className={cn(typo.bodyMd, "mt-xs text-body")}>{description}</p>
    </Card>
  );
}
