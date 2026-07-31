import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

// `__dirname` 은 Vite 의 native config loader 에서 미지원(경고) — ESM 표준 경로 계산을 쓴다.
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": path.resolve(rootDir, ".") } },
  test: { environment: "node", include: ["test/**/*.test.ts"] },
});
