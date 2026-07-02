import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 닫는 초대 — primary-soft 밴드(따뜻한 강조). 전화·시간은 알림 사항에 있어 중복 제거, 메시지만.
export function DeptInvite({
  heading,
  body,
}: {
  heading: string;
  body: string;
}) {
  return (
    <section className="bg-primary-soft py-section">
      <Container className="break-keep">
        <Reveal>
          <h2 className={cn(typo.displayMd, "text-ink")}>{heading}</h2>
          <p className={cn(typo.bodyLg, "mt-base text-body")}>{body}</p>
        </Reveal>
      </Container>
    </section>
  );
}
