import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

Object.assign(process.env, loadEnv("", process.cwd(), ""));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: [
      "src/modules/cssd-erp/domain/**/*.spec.ts",
      "src/modules/cssd-erp/workflow/domain/**/*.spec.ts",
      "src/modules/cssd-erp/workflow/application/**/*.spec.ts",
      "src/modules/cssd-su-co/domain/**/*.spec.ts",
      "src/modules/cssd-su-co/application/**/*.spec.ts",
      "src/modules/cssd-erp/helpers/**/*.spec.ts",
      "src/modules/cssd-erp/lib/**/*.spec.ts",
      "src/lib/**/*.spec.ts",
      "src/modules/quan-ly-cong-viec/**/*.spec.ts",
      "src/modules/quan-tri-he-thong/**/*.spec.ts",
      "src/modules/giam-sat-vst/**/*.spec.ts",
      "src/modules/giam-sat-chung/**/*.spec.ts",
      "src/modules/giam-sat-nkbv/**/*.spec.ts",
      "src/modules/dashboard/**/*.spec.ts",
      "src/lib/bv103-feature-config.spec.ts",
    ],
    environment: "node",
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      // json-summary → scripts/ci-coverage-honesty.mjs (ENG-CI-01 honest banner)
      reporter: ["text", "json", "json-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["**/*.spec.ts", "**/*.test.ts", "src/**/*.d.ts", "**/node_modules/**", "**/*.config.*"],
      // ENG-CI-01: KHÔNG đặt thresholds toàn repo. include `src/**` ~20% lines —
      // claim ≥80% trên CI là giả xanh. Report-only; gate % theo module pilot
      // (verify:cssd / engineering) khi thu hẹp include.
    },
  },
});
