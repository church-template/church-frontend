import { describe, it, expect } from "vitest";
import { isSafeHttpUrl } from "./url";

describe("isSafeHttpUrl", () => {
  it("http/https만 허용", () => {
    expect(isSafeHttpUrl("https://x.com/a.mp3")).toBe(true);
    expect(isSafeHttpUrl("http://x.com")).toBe(true);
    expect(isSafeHttpUrl("  https://x.com  ")).toBe(true);
  });
  it("위험·기타 스킴은 거부", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,<script>")).toBe(false);
    expect(isSafeHttpUrl("//evil.com")).toBe(false);
    expect(isSafeHttpUrl("")).toBe(false);
  });
});
