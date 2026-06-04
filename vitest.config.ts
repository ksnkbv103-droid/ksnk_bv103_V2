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
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["**/*.spec.ts", "**/*.test.ts", "src/**/*.d.ts", "**/node_modules/**", "**/*.config.*"],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
});
