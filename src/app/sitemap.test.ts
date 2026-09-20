import { beforeEach, describe, expect, it, vi } from "vitest";
import sitemap from "./sitemap";
import { getNotices } from "@/lib/api/notices";
import { getEvents } from "@/lib/api/events";

vi.mock("@/lib/api/notices", () => ({ getNotices: vi.fn() }));
vi.mock("@/lib/api/events", () => ({ getEvents: vi.fn() }));

describe("sitemap", () => {
  beforeEach(() => {
    vi.mocked(getNotices).mockReset();
    vi.mocked(getEvents).mockReset();
  });

  it("백엔드 실패 시 정적 엔트리만 반환한다 (CI 빌드 폴백)", async () => {
    vi.mocked(getNotices).mockRejectedValue(new Error("backend down"));
    vi.mocked(getEvents).mockRejectedValue(new Error("backend down"));
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://www.eunsaem.com/notices");
    expect(urls).toContain("https://www.eunsaem.com/bulletins");
    expect(urls.some((u) => u.includes("/sermons"))).toBe(false);
    expect(urls.some((u) => u.includes("/gallery"))).toBe(false);
    expect(urls.some((u) => u.includes("/challenges"))).toBe(false);
  });

  it("공지·행사 상세 URL을 포함하고 월 중복 행사는 1건만 넣는다", async () => {
    vi.mocked(getNotices).mockResolvedValue({
      content: [
        {
          id: 7,
          title: "공지",
          isPinned: false,
          viewCount: 0,
          createdAt: "2026-08-01T10:00:00",
          tags: [],
        },
      ],
      page: { size: 100, number: 0, totalElements: 1, totalPages: 1 },
    });
    // 모든 월 조회가 같은 행사를 반환해도(걸친 행사) URL은 1개여야 한다.
    vi.mocked(getEvents).mockResolvedValue({
      content: [
        {
          id: 3,
          title: "행사",
          startAt: "2026-08-15T11:00:00",
          endAt: null,
          allDay: false,
          tags: [],
        },
      ],
      page: { size: 200, number: 0, totalElements: 1, totalPages: 1 },
    });
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://www.eunsaem.com/notices/7");
    expect(
      urls.filter((u) => u === "https://www.eunsaem.com/events/3"),
    ).toHaveLength(1);
  });
});
