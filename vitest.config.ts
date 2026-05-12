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
      "src/modules/cssd-erp/incident/domain/**/*.spec.ts",
      "src/modules/cssd-erp/helpers/**/*.spec.ts",
    ],
    environment: "node",
    passWithNoTests: true,
  },
});
