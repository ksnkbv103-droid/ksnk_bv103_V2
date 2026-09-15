import { describe, expect, it } from "vitest";
import {
  CSSD_KHO_IMPORT_SOFT_DELETE_BLOCKED_MESSAGE,
  countCssdKhoImportDeactivations,
  rejectCssdKhoImportSoftDelete,
} from "./cssd-kho-import-policy";

describe("cssd-kho-import-policy", () => {
  it("rejects softDeleteMissing for fact quy trình", () => {
    expect(rejectCssdKhoImportSoftDelete(false)).toBeNull();
    expect(rejectCssdKhoImportSoftDelete(true)).toBe(CSSD_KHO_IMPORT_SOFT_DELETE_BLOCKED_MESSAGE);
  });

  it("counts planned deactivations only when soft-delete requested", () => {
    const existing = ["A", "B", "C"];
    const imported = new Set(["A", "C"]);
    expect(countCssdKhoImportDeactivations(existing, imported, false)).toBe(0);
    expect(countCssdKhoImportDeactivations(existing, imported, true)).toBe(1);
  });
});
