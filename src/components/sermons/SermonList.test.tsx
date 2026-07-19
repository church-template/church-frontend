import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

// next/link → plain <a> (프로젝트 테스트 컨벤션)
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const { useSermonsMock, useSermonTagsMock, searchParamsRef } = vi.hoisted(() => ({
  useSermonsMock: vi.fn(),
  useSermonTagsMock: vi.fn(),
  searchParamsRef: { current: new URLSearchParams("") },
}));
vi.mock("./queries", () => ({ useSermons: useSermonsMock, useSermonTags: useSermonTagsMock }));
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParamsRef.current }));
// 자식 컴포넌트 격리 — URL 조작 동작은 각자 테스트(SermonSearch.test 등)에서 검증.
vi.mock("./SermonSearch", () => ({ SermonSearch: () => null }));
vi.mock("./ActiveFilters", () => ({ ActiveFilters: () => null }));
vi.mock("@/components/common/TagFilter", () => ({ TagFilter: () => null }));
vi.mock("@/components/common/Pagination", () => ({ Pagination: () => "PAGINATION" }));

import { SermonList } from "./SermonList";

function state(over: Record<string, unknown>) {
  return { data: undefined, isPending: false, isError: false, refetch: vi.fn(), ...over };
}
const card = {
  id: 1, title: "주일설교", preacher: "김목사", series: null, scripture: null,
  preachedAt: "2026-07-19", viewCount: 0, tags: [],
};
const page = { size: 12, number: 0, totalElements: 1, totalPages: 1 };

beforeEach(() => {
  useSermonsMock.mockReset();
  useSermonTagsMock.mockReturnValue({ data: [], isPending: false, isError: false });
  searchParamsRef.current = new URLSearchParams("");
});

describe("SermonList", () => {
  it("로딩 중엔 카드 링크가 없다(스켈레톤)", () => {
    useSermonsMock.mockReturnValue(state({ isPending: true }));
    render(<SermonList />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("빈 배열이면 EmptyState를 보인다", () => {
    useSermonsMock.mockReturnValue(state({ data: { content: [], page: { ...page, totalElements: 0, totalPages: 0 } } }));
    render(<SermonList />);
    expect(screen.getByText("조건에 맞는 설교가 없습니다.")).toBeDefined();
  });

  it("설교가 있으면 카드 그리드를 보인다", () => {
    useSermonsMock.mockReturnValue(state({ data: { content: [card], page } }));
    render(<SermonList />);
    expect(screen.getByText("주일설교")).toBeDefined();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/sermons/1");
  });

  it("여러 페이지면 페이지네이션을 보인다", () => {
    useSermonsMock.mockReturnValue(state({ data: { content: [card], page: { ...page, totalElements: 30, totalPages: 3 } } }));
    render(<SermonList />);
    expect(screen.queryByText("PAGINATION")).not.toBeNull();
  });

  it("한 페이지면 페이지네이션을 숨긴다", () => {
    useSermonsMock.mockReturnValue(state({ data: { content: [card], page } }));
    render(<SermonList />);
    expect(screen.queryByText("PAGINATION")).toBeNull();
  });

  it("에러면 다시 시도 버튼을 보이고, 클릭하면 refetch를 호출한다", () => {
    const refetch = vi.fn();
    useSermonsMock.mockReturnValue(state({ isError: true, refetch }));
    render(<SermonList />);
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(refetch).toHaveBeenCalled();
  });

  // 구 RSC 페이지 parseParams 커버리지 이전 — 파싱 로직이 SermonList로 이동했다.
  it("URL 파라미터를 파싱해 쿼리에 전달한다", () => {
    searchParamsRef.current = new URLSearchParams("q=은혜&tagId=3&page=0&preacher=김목사");
    useSermonsMock.mockReturnValue(state({ isPending: true }));
    render(<SermonList />);
    expect(useSermonsMock).toHaveBeenCalledWith(
      expect.objectContaining({ q: "은혜", tagId: 3, page: 0, preacher: "김목사" }),
    );
  });

  it("잘못된 쿼리 파라미터는 undefined로 방어한다", () => {
    searchParamsRef.current = new URLSearchParams("tagId=abc&from=not-a-date&to=2026-12-31");
    useSermonsMock.mockReturnValue(state({ isPending: true }));
    render(<SermonList />);
    expect(useSermonsMock).toHaveBeenCalledWith(
      expect.objectContaining({ tagId: undefined, from: undefined, to: "2026-12-31" }),
    );
  });
});
