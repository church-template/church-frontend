import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { DepartmentCard } from "./DepartmentCard";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { DEPT_PAGE, type Department } from "@/constants/departments";

// 상세 하위부서 — soft 밴드 교차 리듬 + 카드별 Reveal 등장.
export function SubDepartments({ items }: { items: Department[] }) {
  return (
    <section className="bg-surface-soft py-section">
      <Container>
        <h2 className={cn(typo.titleLg, "text-ink")}>{DEPT_PAGE.subHeading}</h2>
        <div className="mt-lg grid gap-base sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d, i) => (
            <Reveal key={d.slug} delay={i * 120} className="h-full">
              <DepartmentCard dept={d} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
