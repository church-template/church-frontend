import { describe, it, expect } from "vitest";
import {
  DEPARTMENTS,
  DEPT_PAGE,
  DEPT_SECTIONS,
  allDepartmentSlugs,
  findDepartment,
  thumbnailOf,
  type Department,
} from "./departments";

describe("사역 부서 상수", () => {
  it("최소 한 개 이상이고 slug가 유일하다", () => {
    const slugs = allDepartmentSlugs();
    expect(DEPARTMENTS.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("findDepartment: slug로 부서를 찾는다", () => {
    expect(findDepartment("youth")?.name).toBe("청년부");
    expect(findDepartment("praise")?.name).toBe("예배부");
  });

  it("findDepartment: 없는 slug는 undefined", () => {
    expect(findDepartment("nope")).toBeUndefined();
  });

  it("allDepartmentSlugs는 모든 부서 slug를 포함한다", () => {
    const slugs = allDepartmentSlugs();
    expect(slugs).toContain("student");
    expect(slugs).toContain("youth");
    expect(slugs).toContain("women");
  });

  // 현재 공개 상수는 하위 부서가 없지만, 함수는 깊이 탐색을 지원한다(어드민·향후 대비) — 로컬 픽스처로 분기 커버.
  it("findDepartment·allDepartmentSlugs는 하위 부서까지 깊이 탐색한다", () => {
    const nested: Department[] = [
      {
        slug: "p",
        name: "상위부서",
        description: "",
        media: { type: "image", src: "/dept/p.jpg" },
        caption: [],
        children: [
          {
            slug: "c",
            name: "하위부서",
            description: "",
            media: { type: "image", src: "/dept/c.jpg" },
            caption: [],
          },
        ],
      },
    ];
    expect(findDepartment("c", nested)?.name).toBe("하위부서");
    expect(allDepartmentSlugs(nested)).toEqual(["p", "c"]);
  });

  it("thumbnailOf: image는 src, video는 poster, poster 없으면 기본", () => {
    expect(thumbnailOf({ type: "image", src: "/dept/youth.jpg" })).toBe("/dept/youth.jpg");
    expect(thumbnailOf({ type: "video", src: "/v.mp4", poster: "/p.jpg" })).toBe("/p.jpg");
    expect(thumbnailOf({ type: "video", src: "/v.mp4" })).toBe("/dept/default.jpg");
  });

  it("페이지 카피 상수를 노출한다(하드코딩 0)", () => {
    expect(DEPT_PAGE.title.length).toBeGreaterThan(0);
    expect(DEPT_PAGE.leaderLabel.length).toBeGreaterThan(0);
    expect(DEPT_PAGE.subHeading.length).toBeGreaterThan(0);
  });

  it("학생부는 보강 섹션 데이터(intro·features·info·activities·programs·gallery·invite)를 보유한다", () => {
    const student = findDepartment("student")!;
    expect(student.intro?.heading).toBe("학생부 소개");
    expect(student.features).toHaveLength(3);
    expect(student.features?.[0]).toMatchObject({ icon: "book", title: "청소년 신앙 교육" });
    expect(student.info?.map((i) => i.label)).toEqual([
      "담당자",
      "모임 시간",
      "연락처",
      "모임 장소",
    ]);
    expect(student.activities).toHaveLength(4);
    expect(student.programs).toHaveLength(4);
    expect(student.gallery?.length).toBeGreaterThan(0);
    expect(student.invite?.heading).toBe("학생부에서 함께해요");
  });

  it("섹션 헤딩 상수를 노출한다(하드코딩 0)", () => {
    expect(DEPT_SECTIONS.info).toBe("알림 사항");
    expect(DEPT_SECTIONS.activities.length).toBeGreaterThan(0);
    expect(DEPT_SECTIONS.programs.length).toBeGreaterThan(0);
    expect(DEPT_SECTIONS.gallery.length).toBeGreaterThan(0);
  });
});
