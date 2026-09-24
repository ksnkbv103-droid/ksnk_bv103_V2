import { describe, expect, it } from "vitest";
import { deriveKiemKeLine, planKiemKePostings } from "./cssd-kiem-ke";

const base = {
  loaiDungCuId: "loai-1",
  soLuongThucTe: 10,
  soLuongKho: 4,
  soLuongTrongBo: 22,
  soLuongDem: 10,
  khoDem: null as number | null,
};

describe("deriveKiemKeLine", () => {
  it("derives set, warehouse and type stock from the count", () => {
    const res = deriveKiemKeLine({ ...base, soLuongDem: 8, khoDem: 6 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.derived).toEqual({
      tonBo: 8,
      tonKho: 6,
      tonTrongBo: 20,
      tonLoai: 26,
      deltaBo: -2,
      deltaKho: 2,
    });
  });

  it("leaves warehouse unchanged when kho count is blank", () => {
    const res = deriveKiemKeLine({ ...base, soLuongDem: 12, khoDem: null });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.derived.tonKho).toBe(4);
    expect(res.derived.deltaKho).toBe(0);
    expect(res.derived.tonTrongBo).toBe(24);
    expect(res.derived.tonLoai).toBe(28);
  });

  it("rejects a negative count", () => {
    const res = deriveKiemKeLine({ ...base, soLuongDem: -1 });
    expect(res.ok).toBe(false);
  });
});

describe("planKiemKePostings", () => {
  it("posts only KIEM_KE deltas and skips a matched count", () => {
    const same = planKiemKePostings("bo-1", base);
    expect(same.ok).toBe(true);
    if (!same.ok) return;
    expect(same.postings).toEqual([]);

    const moved = planKiemKePostings("bo-1", { ...base, soLuongDem: 7, khoDem: 1 });
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.postings).toEqual([
      { loaiGiaoDich: "KIEM_KE", loaiDungCuId: "loai-1", boDungCuId: "bo-1", soLuongThayDoi: -3 },
      { loaiGiaoDich: "KIEM_KE", loaiDungCuId: "loai-1", boDungCuId: null, soLuongThayDoi: -3 },
    ]);
    expect(moved.postings.every((p) => p.loaiGiaoDich === "KIEM_KE")).toBe(true);
  });
});
