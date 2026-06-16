// src/components/gallery/schemas.test.ts
import { describe, it, expect } from "vitest";
import { albumSchema } from "./schemas";

describe("albumSchema", () => {
  it("제목만 있어도 통과(설명·태그는 선택)", () => {
    expect(albumSchema.safeParse({ title: "앨범", description: "", tagIds: [] }).success).toBe(true);
  });
  it("제목 비면 실패", () => {
    expect(albumSchema.safeParse({ title: "", description: "", tagIds: [] }).success).toBe(false);
  });
});
