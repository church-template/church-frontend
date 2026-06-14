import { describe, it, expect, vi, afterEach } from "vitest";

const { updateTagMock } = vi.hoisted(() => ({ updateTagMock: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: updateTagMock }));

import { revalidateEvents, revalidateSermons, revalidateNotices } from "./revalidate";

afterEach(() => vi.clearAllMocks());

describe("어드민 캐시 무효화 서버 액션", () => {
  it("revalidateEvents는 events 태그를 즉시 무효화한다", async () => {
    await revalidateEvents();
    expect(updateTagMock).toHaveBeenCalledWith("events");
  });
  it("revalidateSermons는 sermons 태그를 무효화한다", async () => {
    await revalidateSermons();
    expect(updateTagMock).toHaveBeenCalledWith("sermons");
  });
  it("revalidateNotices는 notices 태그를 무효화한다", async () => {
    await revalidateNotices();
    expect(updateTagMock).toHaveBeenCalledWith("notices");
  });
});
