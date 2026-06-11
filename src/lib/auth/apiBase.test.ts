import { describe, it, expect } from "vitest";
import { API_BASE, apiUrl } from "./apiBase";

describe("apiUrl", () => {
  it("API_BASE와 path를 결합한다", () => {
    expect(apiUrl("/api/auth/login")).toBe(`${API_BASE}/api/auth/login`);
  });

  it("path만 받아 이중 결합하지 않는다(맨 끝이 path)", () => {
    expect(apiUrl("/api/members/me").endsWith("/api/members/me")).toBe(true);
  });
});
