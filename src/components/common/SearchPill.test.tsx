import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { push, spRef } = vi.hoisted(() => ({
  push: vi.fn(),
  spRef: { current: new URLSearchParams("tagId=3") },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/notices",
  useSearchParams: () => spRef.current,
}));

import { SearchPillForm } from "./SearchPill";

beforeEach(() => {
  spRef.current = new URLSearchParams("tagId=3");
});
afterEach(() => vi.clearAllMocks());

const props = { placeholder: "제목", ariaLabel: "공지 검색" };

describe("SearchPillForm", () => {
  it("검색어 제출 → q 추가(기존 tagId 보존, page 리셋)", () => {
    render(<SearchPillForm {...props} />);
    fireEvent.change(screen.getByLabelText("공지 검색"), { target: { value: "praise" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenCalledWith("/notices?tagId=3&q=praise");
  });

  it("page 파라미터가 있으면 검색 시 리셋", () => {
    spRef.current = new URLSearchParams("tagId=3&page=2");
    render(<SearchPillForm {...props} />);
    fireEvent.change(screen.getByLabelText("공지 검색"), { target: { value: "praise" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenCalledWith("/notices?tagId=3&q=praise");
  });

  it("빈 검색어 제출 → q 없이 이동", () => {
    render(<SearchPillForm {...props} />);
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenCalledWith("/notices?tagId=3");
  });

  it("placeholder 주입 반영", () => {
    render(<SearchPillForm {...props} />);
    const input = screen.getByLabelText("공지 검색") as HTMLInputElement;
    expect(input.getAttribute("placeholder")).toBe("제목");
  });

  it("URL에 q가 있으면 입력값에 반영", () => {
    spRef.current = new URLSearchParams("q=헌금&tagId=3");
    render(<SearchPillForm {...props} />);
    expect((screen.getByLabelText("공지 검색") as HTMLInputElement).value).toBe("헌금");
  });

  it("✕(지우기) → q 제거하고 이동", () => {
    spRef.current = new URLSearchParams("q=헌금&tagId=3");
    render(<SearchPillForm {...props} />);
    fireEvent.click(screen.getByLabelText("검색어 지우기"));
    expect(push).toHaveBeenCalledWith("/notices?tagId=3");
  });
});
