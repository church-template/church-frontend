// src/components/sermons/SermonSearch.test.tsx
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { push, spRef } = vi.hoisted(() => ({
  push: vi.fn(),
  spRef: { current: new URLSearchParams("tagId=3") },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/sermons",
  useSearchParams: () => spRef.current,
}));

import { SermonSearchForm } from "./SermonSearch";

beforeEach(() => {
  spRef.current = new URLSearchParams("tagId=3");
});
afterEach(() => vi.clearAllMocks());

describe("SermonSearchForm", () => {
  it("검색어 제출 → q 추가(기존 tagId 보존, page 리셋)", () => {
    render(<SermonSearchForm />);
    fireEvent.change(screen.getByLabelText("설교 검색"), {
      target: { value: "grace" },
    });
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenCalledWith("/sermons?tagId=3&q=grace");
  });

  it("빈 검색어 제출 → q 없이 이동", () => {
    render(<SermonSearchForm />);
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenCalledWith("/sermons?tagId=3");
  });

  it("URL에 q가 있으면 입력값에 반영", () => {
    spRef.current = new URLSearchParams("q=은혜&tagId=3");
    render(<SermonSearchForm />);
    expect((screen.getByLabelText("설교 검색") as HTMLInputElement).value).toBe("은혜");
  });

  it("✕(지우기) → q 제거하고 이동", () => {
    spRef.current = new URLSearchParams("q=은혜&tagId=3");
    render(<SermonSearchForm />);
    fireEvent.click(screen.getByLabelText("검색어 지우기"));
    expect(push).toHaveBeenCalledWith("/sermons?tagId=3");
  });
});
