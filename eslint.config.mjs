import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // .gitignore 된 산출물·도구 아티팩트·고객자료 — 저장소 소스가 아니므로 린트하지 않는다.
    "coverage/**",
    ".vercel/**",
    ".playwright-mcp/**",
    "graphify-out/**",
    ".codex/**",
    "estimate-ops/**",
    "견본/**",
    "견적서 사본/**",
    "ZEROS_DB 구축/**",
    "ZEROS 작성_0606/**",
  ]),
]);

export default eslintConfig;
