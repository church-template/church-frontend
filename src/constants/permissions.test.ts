import { describe, it, expect } from "vitest";
import { permissionLabel } from "./permissions";

describe("permissionLabel", () => {
  it("정의된 권한은 한글 라벨", () => {
    expect(permissionLabel("SERMON_WRITE")).toBe("설교 관리");
    expect(permissionLabel("GALLERY_VIEW")).toBe("갤러리 열람");
  });
  it("미정의 권한은 raw 폴백", () => {
    expect(permissionLabel("UNKNOWN_PERM")).toBe("UNKNOWN_PERM");
  });
});
