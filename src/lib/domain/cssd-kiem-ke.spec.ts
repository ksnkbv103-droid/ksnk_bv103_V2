import { describe, expect, it } from "vitest";
import {
  buildKiemKeBoDeltas,
  buildKiemKeKhoDeltas,
  decreaseTongPhysicalLoss,
  preserveTongBoToBo,
  preserveTongBoToKho,
  preserveTongKhoToBo,
  resolveTrangThaiAfterKiemKe,
  validateDemNonNegative,
} from "./cssd-kiem-ke";

describe("cssd-kiem-ke deltas", () => {
  it("builds bo deltas and skips zero", () => {
    const res = buildKiemKeBoDeltas([
      { loaiDungCuId: "a", dem: 5, thucTeHienTai: 3 },
      { loaiDungCuId: "b", dem: 2, thucTeHienTai: 2 },
      { loaiDungCuId: "c", dem: 0, thucTeHienTai: 1 },
    ]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.deltas).toEqual([
      { loaiDungCuId: "a", dem: 5, baseline: 3, soLuongThayDoi: 2 },
      { loaiDungCuId: "c", dem: 0, baseline: 1, soLuongThayDoi: -1 },
    ]);
  });

  it("rejects negative dem on bo", () => {
    const res = buildKiemKeBoDeltas([{ loaiDungCuId: "a", dem: -1, thucTeHienTai: 0 }]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/âm/i);
  });

  it("builds kho deltas", () => {
    const res = buildKiemKeKhoDeltas([
      { loaiDungCuId: "a", demKho: 10, khoCu: 7 },
      { loaiDungCuId: "b", demKho: 3, khoCu: 3 },
    ]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.deltas).toHaveLength(1);
    expect(res.deltas[0].soLuongThayDoi).toBe(3);
  });

  it("rejects negative dem on kho", () => {
    const res = buildKiemKeKhoDeltas([{ loaiDungCuId: "a", demKho: -2, khoCu: 1 }]);
    expect(res.ok).toBe(false);
  });

  it("validateDemNonNegative", () => {
    expect(validateDemNonNegative(0)).toBeNull();
    expect(validateDemNonNegative(1.5)).toMatch(/nguyên/i);
    expect(validateDemNonNegative(-1)).toMatch(/âm/i);
  });
});

describe("cssd-kiem-ke tong invariants", () => {
  it("kho↔bộ preserves tong", () => {
    const before = { kho: 10, trongBo: 5 };
    const tong0 = before.kho + before.trongBo;
    const after = preserveTongKhoToBo({ ...before, quantity: 3 });
    expect(after.tong).toBe(tong0);
    expect(after.kho).toBe(7);
    expect(after.trongBo).toBe(8);
    const back = preserveTongBoToKho({ kho: after.kho, trongBo: after.trongBo, quantity: 3 });
    expect(back.tong).toBe(tong0);
    expect(back.kho).toBe(10);
    expect(back.trongBo).toBe(5);
  });

  it("bộ↔bộ preserves tong", () => {
    const before = { kho: 4, trongBoNguon: 6, trongBoDich: 2 };
    const tong0 = before.kho + before.trongBoNguon + before.trongBoDich;
    const after = preserveTongBoToBo({ ...before, quantity: 2 });
    expect(after.tong).toBe(tong0);
    expect(after.trongBoNguon).toBe(4);
    expect(after.trongBoDich).toBe(4);
  });

  it("Hỏng/Mất decreases tong", () => {
    const fromBo = decreaseTongPhysicalLoss({ kho: 5, trongBo: 8, quantity: 2, from: "bo" });
    expect(fromBo.tong).toBe(11);
    expect(fromBo.trongBo).toBe(6);
    const fromKho = decreaseTongPhysicalLoss({ kho: 5, trongBo: 8, quantity: 1, from: "kho" });
    expect(fromKho.tong).toBe(12);
    expect(fromKho.kho).toBe(4);
  });

  it("INVENTORY → ACTIVE after kiểm kê", () => {
    expect(resolveTrangThaiAfterKiemKe("INVENTORY")).toBe("ACTIVE");
    expect(resolveTrangThaiAfterKiemKe("ACTIVE")).toBe("ACTIVE");
    expect(resolveTrangThaiAfterKiemKe("MAINTENANCE")).toBe("MAINTENANCE");
  });
});
