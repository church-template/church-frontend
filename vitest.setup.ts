import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// 각 테스트 후 렌더된 DOM을 정리한다(테스트 격리). globals:false라 RTL 자동 cleanup이
// 걸리지 않으므로 명시 등록 — 한 파일에서 여러 번 render할 때 screen 쿼리가 누적 매칭되는 것 방지.
afterEach(() => {
  cleanup();
});

// Radix(Dialog/Sheet·DropdownMenu)가 jsdom에서 마운트될 때 참조하는 API 스텁.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}
