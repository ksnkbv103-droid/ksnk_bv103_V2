import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CSSD-03 Đóng gói scan-only", () => {
  it("hook không mở gate panel; page không render CompositionReconcilePanel", () => {
    const hook = readFileSync("src/modules/cssd-erp/hooks/useCSSDWorkflow.ts", "utf8");
    const page = readFileSync("src/modules/cssd-erp/views/CSSDERPPage.tsx", "utf8");
    const app = readFileSync(
      "src/modules/cssd-erp/workflow/application/cssd-workflow-application.ts",
      "utf8",
    );
    expect(hook).not.toMatch(/openDongGoiGate|dongGoiGate|bảng kiểm/);
    expect(page).not.toMatch(/CompositionReconcilePanel|gateMode|Sự cố & biến động/);
    expect(app).not.toMatch(/assertPlasmaPackMaterialAllowed/);
  });
});
