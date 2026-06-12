import { describe, it, expect } from "vitest";
import {
  DEPARTMENTS,
  DEPT_PAGE,
  allDepartmentSlugs,
  findDepartment,
  thumbnailOf,
} from "./departments";

describe("사역 부서 상수", () => {
  it("최소 한 개 이상이고 slug가 유일하다", () => {
    const slugs = allDepartmentSlugs();
    expect(DEPARTMENTS.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("findDepartment: 최상위·하위 slug를 모두 찾는다", () => {
    expect(findDepartment("youth")?.name).toBe("청년부");
    expect(findDepartment("middle")?.name).toBe("중등부"); // 학생부 하위
  });

  it("findDepartment: 없는 slug는 undefined", () => {
    expect(findDepartment("nope")).toBeUndefined();
  });

  it("allDepartmentSlugs는 하위 부서까지 포함한다", () => {
    const slugs = allDepartmentSlugs();
    expect(slugs).toContain("student");
    expect(slugs).toContain("middle");
    expect(slugs).toContain("high");
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
});
