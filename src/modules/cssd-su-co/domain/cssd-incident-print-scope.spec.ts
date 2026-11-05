import { describe, expect, it } from "vitest";
import { canPrintIncidentInScope } from "./cssd-incident-print-scope";

const base = { isAdmin: false, isNhanVienKsnk: false, roles: [] as string[], actorKhoaId: "k1" };

describe("canPrintIncidentInScope", () => {
  it("đúng khoa thì qua", () => expect(canPrintIncidentInScope(base, "k1")).toBe(true));
  it("khác khoa bị từ chối", () => expect(canPrintIncidentInScope(base, "k2")).toBe(false));
  it("sự cố không rõ khoa bị từ chối (fail-closed)", () => expect(canPrintIncidentInScope(base, null)).toBe(false));
  it("người dùng chưa gán khoa bị từ chối", () =>
    expect(canPrintIncidentInScope({ ...base, actorKhoaId: null }, "k1")).toBe(false));
  it("KSNK / admin / hội đồng in tất cả", () => {
    expect(canPrintIncidentInScope({ ...base, isNhanVienKsnk: true }, "k2")).toBe(true);
    expect(canPrintIncidentInScope({ ...base, isAdmin: true }, null)).toBe(true);
    expect(canPrintIncidentInScope({ ...base, roles: ["HOI_DONG_KSNK"] }, "k2")).toBe(true);
  });
});
