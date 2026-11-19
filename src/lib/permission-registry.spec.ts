import { describe, expect, it } from "vitest";
import { getFlatPermissions } from "./permission-registry";

describe("permission-registry: quyền approve đã có migration AR-5d", () => {
  const flat = getFlatPermissions();

  it.each(["THIET_BI", "HOA_CHAT"])("%s khai báo thao tác approve", (moduleName) => {
    expect(flat.some((p) => p.module_name === moduleName && p.action === "approve")).toBe(true);
  });

  it("không có hai dòng trùng (module, action)", () => {
    const keys = flat.map((p) => `${p.module_name}:${p.action}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
