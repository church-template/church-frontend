import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { useMediaFlag, REDUCED_MQ } from "./useMediaFlag";
import { useHasHydrated } from "./useHasHydrated";

afterEach(() => vi.unstubAllGlobals());

function FlagProbe({ query }: { query: string }) {
  return <span data-testid="flag">{String(useMediaFlag(query))}</span>;
}
function HydrateProbe() {
  return <span data-testid="hyd">{String(useHasHydrated())}</span>;
}

describe("useMediaFlag", () => {
  it("matchMedia의 matches를 반환한다", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })),
    );
    const { getByTestId } = render(<FlagProbe query={REDUCED_MQ} />);
    expect(getByTestId("flag").textContent).toBe("true");
  });
});

describe("useHasHydrated", () => {
  it("클라이언트 렌더에서 true를 반환한다", () => {
    const { getByTestId } = render(<HydrateProbe />);
    expect(getByTestId("hyd").textContent).toBe("true");
  });
});
