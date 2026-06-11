import { describe, it, expect } from "vitest";
import { buildListQuery } from "./page";

describe("buildListQuery", () => {
  it("page는 0-base로 직렬화", () => {
    expect(buildListQuery({ page: 0 })).toBe("?page=0");
  });

  it("size·sort·tagId 조합", () => {
    expect(buildListQuery({ page: 1, size: 10, sort: "createdAt,desc", tagId: 3 })).toBe(
      "?page=1&size=10&sort=createdAt%2Cdesc&tagId=3",
    );
  });

  it("tagId는 단수 키", () => {
    expect(buildListQuery({ tagId: 7 })).toBe("?tagId=7");
  });

  it("빈 객체면 빈 문자열", () => {
    expect(buildListQuery({})).toBe("");
  });

  it("undefined 필드는 생략(0은 포함)", () => {
    expect(buildListQuery({ page: 0, tagId: undefined })).toBe("?page=0");
  });
});
