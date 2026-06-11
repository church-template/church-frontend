import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// 각 테스트 후 렌더된 DOM을 정리한다(테스트 격리). globals:false라 RTL 자동 cleanup이
// 걸리지 않으므로 명시 등록 — 한 파일에서 여러 번 render할 때 screen 쿼리가 누적 매칭되는 것 방지.
afterEach(() => {
  cleanup();
});
