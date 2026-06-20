import { describe, it, expect } from "vitest";
import { adminKeys } from "./queryKeys";

describe("adminKeys", () => {
  it("list 키는 admin·domain·list·params 순서다", () => {
    expect(adminKeys.list("sermons", { page: 0 })).toEqual(["admin", "sermons", "list", { page: 0 }]);
  });

  it("list 키는 params 없이도 생성된다", () => {
    expect(adminKeys.list("tags")).toEqual(["admin", "tags", "list", undefined]);
  });

  it("listAll은 params 없는 3요소 prefix다(파라미터 무관 일괄 무효화용)", () => {
    expect(adminKeys.listAll("members")).toEqual(["admin", "members", "list"]);
  });

  it("detail 키는 admin·domain·detail·id 순서다", () => {
    expect(adminKeys.detail("sermons", 7)).toEqual(["admin", "sermons", "detail", 7]);
  });
});
