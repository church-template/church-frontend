import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Button } from "./Button";

describe("Button iconOnly", () => {
  it("iconOnly면 정사각 사이즈 클래스를 적용한다", () => {
    const { getByRole } = render(<Button iconOnly aria-label="닫기">x</Button>);
    const cls = getByRole("button").getAttribute("class") ?? "";
    expect(cls.includes("size-9")).toBe(true);
    // variant 기본값 primary의 h-12/px-5가 제거되어 정사각이 보장됨
    expect(cls.includes("h-12")).toBe(false);
    expect(cls.includes("px-5")).toBe(false);
  });
  it("기본(텍스트) 버튼엔 정사각 클래스가 없다", () => {
    const { getByRole } = render(<Button>저장</Button>);
    const cls = getByRole("button").getAttribute("class") ?? "";
    expect(cls.includes("size-9")).toBe(false);
  });
});

describe("Button 텍스트 줄바꿈 방지", () => {
  it("flex 행에서 눌려도 라벨이 줄바꿈되지 않도록 whitespace-nowrap을 적용한다", () => {
    const { getByRole } = render(<Button>새 앨범</Button>);
    const cls = getByRole("button").getAttribute("class") ?? "";
    expect(cls.includes("whitespace-nowrap")).toBe(true);
  });
});
