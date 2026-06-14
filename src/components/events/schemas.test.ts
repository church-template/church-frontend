import { describe, it, expect } from "vitest";
import { eventSchema } from "./schemas";

const base = { title: "수련회", startAt: "2026-06-14T10:00", endAt: "", allDay: false, location: "", description: "", tagIds: [] };

describe("eventSchema", () => {
  it("title·startAt 누락 시 실패", () => {
    expect(eventSchema.safeParse({ ...base, title: "", startAt: "" }).success).toBe(false);
  });
  it("필수가 있으면 통과(종료 비움=점 이벤트)", () => {
    expect(eventSchema.safeParse(base).success).toBe(true);
  });
  it("종료가 시작보다 이전이면 실패", () => {
    expect(eventSchema.safeParse({ ...base, endAt: "2026-06-14T09:00" }).success).toBe(false);
  });
  it("종료가 시작보다 이후면 통과", () => {
    expect(eventSchema.safeParse({ ...base, endAt: "2026-06-14T12:00" }).success).toBe(true);
  });
});
