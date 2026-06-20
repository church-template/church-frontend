import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PASTOR } from "@/constants/content";
import PastorPage from "./page";

describe("PastorPage", () => {
  it("제목·목회자명·소개·인사말·학력경력·목회철학을 렌더한다", () => {
    render(<PastorPage />);
    expect(screen.getByText(PASTOR.title)).toBeDefined();
    expect(screen.getByText(`${PASTOR.name} ${PASTOR.position}`)).toBeDefined();
    expect(screen.getByText(PASTOR.degree)).toBeDefined();
    expect(screen.getByText(PASTOR.intro)).toBeDefined();
    expect(screen.getByText(PASTOR.greeting[0])).toBeDefined();
    expect(screen.getByText(PASTOR.credentials.heading)).toBeDefined();
    expect(screen.getByText(PASTOR.credentials.items[0])).toBeDefined();
    expect(screen.getByText(PASTOR.philosophy.heading)).toBeDefined();
    expect(screen.getByText(PASTOR.philosophy.items[0])).toBeDefined();
  });
});
