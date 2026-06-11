import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// Next 16 testing 문서 기준 수동 설정. jsdom이 localStorage를 제공해 Zustand persist를 무-mock으로 테스트.
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
  },
});
