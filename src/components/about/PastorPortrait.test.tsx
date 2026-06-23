import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PastorPortrait } from "./PastorPortrait";

describe("PastorPortrait", () => {
  it("image가 있으면 alt·src를 가진 img를 렌더한다", () => {
    const { container } = render(
      <PastorPortrait image={{ src: "/about/pastor.jpg", alt: "홍성균 담임목사" }} />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("alt")).toBe("홍성균 담임목사");
    expect(img?.getAttribute("src")).toBe("/about/pastor.jpg");
  });

  it("image가 null이면 img 없이 장식 폴백(아이콘)을 렌더한다", () => {
    const { container } = render(<PastorPortrait image={null} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
