import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { Container } from "@/components/shell/Container";
import { CtaBand } from "@/components/shell/CtaBand";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import DeptHero from "@/hero/DeptHero";
import { DeptLeader } from "@/components/departments/DeptLeader";
import { SubDepartments } from "@/components/departments/SubDepartments";
import { DeptFeatures } from "@/components/departments/DeptFeatures";
import { DeptInfo } from "@/components/departments/DeptInfo";
import { DeptActivities } from "@/components/departments/DeptActivities";
import { DeptPrograms } from "@/components/departments/DeptPrograms";
import { DeptGallery } from "@/components/departments/DeptGallery";
import { DeptInvite } from "@/components/departments/DeptInvite";
import {
  allDepartmentSlugs,
  findDepartment,
  DEPT_SECTIONS,
} from "@/constants/departments";

// 빌드 시 모든 부서 slug(하위 포함)를 정적 생성 — 상수 단일 출처라 백엔드 불필요.
export function generateStaticParams() {
  return allDepartmentSlugs().map((slug) => ({ slug }));
}

// 사역 부서 상세(공개) — 상수 구동. SiteShell 대신 투명+solid 고정 헤더 직접 합성.
// DeptHero 시작이 라이트라 on-dark 투명은 가독성 위험 → 라이트 스킨 고정(메인 무수정).
// 보강 섹션은 데이터가 있는 부서에만 조건부 노출(학생부만 채움, 타 부서는 기존과 동일).
export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dept = findDepartment(slug);
  if (!dept) {
    notFound();
  }

  // 줄 단위 카피 → block span(메인 caption과 동일 패턴, "\n" 이슈 차단).
  const caption = dept.caption.map((line, i) => (
    <span key={i} className="block">
      {line}
    </span>
  ));

  return (
    <>
      <SiteHeader variant="transparent" solid />
      <main className="flex-1">
        <DeptHero title={dept.name} caption={caption} media={dept.media} />
        <Container as="section" className="py-section">
          {dept.leader ? <DeptLeader name={dept.leader} /> : null}
          {dept.description ? (
            <MarkdownContent source={dept.description} className="mt-base" />
          ) : null}
        </Container>
        {dept.intro && dept.features?.length ? (
          <DeptFeatures
            heading={dept.intro.heading}
            lead={dept.intro.lead}
            items={dept.features}
          />
        ) : null}
        {dept.info?.length ? <DeptInfo heading={DEPT_SECTIONS.info} items={dept.info} /> : null}
        {dept.activities?.length ? (
          <DeptActivities heading={DEPT_SECTIONS.activities} items={dept.activities} />
        ) : null}
        {dept.programs?.length ? (
          <DeptPrograms heading={DEPT_SECTIONS.programs} items={dept.programs} />
        ) : null}
        {dept.gallery?.length ? (
          <DeptGallery heading={DEPT_SECTIONS.gallery} photos={dept.gallery} />
        ) : null}
        {dept.invite ? (
          <DeptInvite heading={dept.invite.heading} body={dept.invite.body} />
        ) : null}
        {dept.children?.length ? <SubDepartments items={dept.children} /> : null}
      </main>
      <CtaBand />
      <SiteFooter />
    </>
  );
}
