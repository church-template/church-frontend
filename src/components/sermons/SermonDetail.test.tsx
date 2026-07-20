import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const { useSermonMock } = vi.hoisted(() => ({ useSermonMock: vi.fn() }));
vi.mock("./queries", () => ({ useSermon: useSermonMock }));
vi.mock("./SermonVideo", () => ({ SermonVideo: () => "VIDEO" }));
vi.mock("./SermonAudio", () => ({ SermonAudio: () => "AUDIO" }));
// SermonDetailActions(useRouter·RequirePermission 포함) 무력화 — SermonAdminActions.test에서 검증.
vi.mock("./SermonAdminActions", () => ({ SermonDetailActions: () => null, SermonListAction: () => null }));
vi.mock("@/components/common/MarkdownContent", () => ({
  MarkdownContent: ({ source }: { source: string }) => <div>{source}</div>,
}));

import { SermonDetail } from "./SermonDetail";

function state(over: Record<string, unknown>) {
  return { data: undefined, isPending: false, isError: false, refetch: vi.fn(), ...over };
}
const sermon = {
  id: 7, title: "은혜의 설교", preacher: "김목사", series: "로마서", scripture: "롬 1:1",
  content: "본문 마크다운", videoUrl: "https://youtu.be/x", audioUrl: "https://cdn.x.com/s.mp3",
  preachedAt: "2026-07-19", viewCount: 1240, createdAt: "2026-07-19T10:00:00",
  updatedAt: "2026-07-19T10:00:00", version: 0, tags: [{ id: 2, name: "주일" }], author: "관리자",
};

beforeEach(() => useSermonMock.mockReset());

describe("SermonDetail", () => {
  it("로딩 중엔 제목을 렌더하지 않는다", () => {
    useSermonMock.mockReturnValue(state({ isPending: true }));
    render(<SermonDetail id={7} />);
    expect(screen.queryByText("은혜의 설교")).toBeNull();
  });

  it("에러면 다시 시도 버튼을 보인다", () => {
    useSermonMock.mockReturnValue(state({ isError: true }));
    render(<SermonDetail id={7} />);
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeDefined();
  });

  it("성공 시 제목·조회수·클릭 메타·본문·영상·오디오를 렌더한다", () => {
    useSermonMock.mockReturnValue(state({ data: sermon }));
    render(<SermonDetail id={7} />);
    expect(screen.getByText("은혜의 설교")).toBeDefined();
    expect(screen.getByText("VIDEO")).toBeDefined();
    expect(screen.getByText("AUDIO")).toBeDefined();
    expect(screen.getByText(/조회 1,240/)).toBeDefined();
    // 클릭 메타 → 목록 필터 링크(스펙 D9)
    expect(screen.getByRole("link", { name: "김목사" }).getAttribute("href")).toBe(
      `/sermons?preacher=${encodeURIComponent("김목사")}`,
    );
    expect(screen.getByRole("link", { name: "로마서" }).getAttribute("href")).toBe(
      `/sermons?series=${encodeURIComponent("로마서")}`,
    );
    expect(screen.getByText("주일").closest("a")?.getAttribute("href")).toBe("/sermons?tagId=2");
    expect(screen.getByText("본문 마크다운")).toBeDefined();
  });

  it("videoUrl·audioUrl 없으면 각 영역이 없다", () => {
    useSermonMock.mockReturnValue(state({ data: { ...sermon, videoUrl: null, audioUrl: null } }));
    render(<SermonDetail id={7} />);
    expect(screen.queryByText("VIDEO")).toBeNull();
    expect(screen.queryByText("AUDIO")).toBeNull();
  });
});
