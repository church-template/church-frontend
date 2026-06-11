import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CHURCH_ADDRESS } from "@/constants/church";
import { LOCATION } from "@/constants/content";
import LocationPage from "./page";

describe("LocationPage", () => {
  it("제목·주소·교통과 외부 지도 링크(폴백)를 렌더한다", () => {
    render(<LocationPage />);
    expect(screen.getByText(LOCATION.title)).toBeDefined();
    expect(screen.getByText(CHURCH_ADDRESS)).toBeDefined();
    expect(screen.getByText(LOCATION.transit[0])).toBeDefined();
    // MAP_EMBED_SRC가 비어 있으므로 외부 지도 링크가 노출된다.
    expect(screen.getByRole("link", { name: "지도에서 보기" })).toBeDefined();
  });
});
