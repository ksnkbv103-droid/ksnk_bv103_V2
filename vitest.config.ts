import path from "node:path";
import { defineConfig } from "vitest/config";

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
      "src/modules/cssd-su-co/domain/**/*.spec.ts",
      "src/modules/cssd-erp/helpers/**/*.spec.ts",
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
  },
});
