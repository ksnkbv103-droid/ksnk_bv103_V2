import { describe, expect, it } from "vitest";
import { resolveServerLoa } from "./nkbv-loa-server";

// Lưới: k1 ngày 01–04, chuyển k2 ngày 05–08 (ngày chuyển = 05).
const grid = [
  ...["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04"].map((d) => ({ ngay_lich: d, khoa_id: "k1" })),
  ...["2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08"].map((d) => ({ ngay_lich: d, khoa_id: "k2" })),
];
const base = { gridRows: grid, ngayVaoVien: "2026-08-01", ngayRaVien: "2026-08-08", khoaDieuTriId: null };

describe("NKBV-026 resolveServerLoa — NHSN Transfer Rule (PO 2026-11-13)", () => {
  it("DOE ngày chuyển khoa → khoa chuyển đi", () => {
    expect(resolveServerLoa({ ...base, doe: "2026-08-05" })).toEqual({ ok: true, khoaId: "k1" });
  });
  it("DOE ngày kế sau chuyển → khoa chuyển đi", () => {
    expect(resolveServerLoa({ ...base, doe: "2026-08-06" })).toEqual({ ok: true, khoaId: "k1" });
  });
  it("DOE từ ngày thứ 3 ở khoa mới → khoa đang nằm", () => {
    expect(resolveServerLoa({ ...base, doe: "2026-08-07" })).toEqual({ ok: true, khoaId: "k2" });
  });
  it("DOE trước ngày vào viện → từ chối", () => {
    expect(resolveServerLoa({ ...base, doe: "2026-07-31" }).ok).toBe(false);
  });
  it("DOE sau ngày ra viện quá 1 ngày → từ chối", () => {
    expect(resolveServerLoa({ ...base, doe: "2026-08-10" }).ok).toBe(false);
  });
  it("DOE ngày kế sau ra viện → khoa cho ra viện (Transfer Rule)", () => {
    expect(resolveServerLoa({ ...base, doe: "2026-08-09" })).toEqual({ ok: true, khoaId: "k2" });
  });
  it("lưới trống, BA một khoa điều trị → khoa điều trị", () => {
    expect(
      resolveServerLoa({ ...base, gridRows: [], khoaDieuTriId: "k9", doe: "2026-08-03" }),
    ).toEqual({ ok: true, khoaId: "k9" });
  });
  it("lưới trống, không có khoa điều trị → từ chối", () => {
    expect(resolveServerLoa({ ...base, gridRows: [], doe: "2026-08-03" }).ok).toBe(false);
  });
  it("lưới không phủ ngày DOE → từ chối (không gán im lặng)", () => {
    const gap = grid.filter((r) => r.ngay_lich !== "2026-08-03" && r.ngay_lich !== "2026-08-02");
    expect(resolveServerLoa({ ...base, gridRows: gap, doe: "2026-08-03" }).ok).toBe(false);
  });
  it("chưa có ngày ra viện: DOE sau vào viện vẫn hợp lệ", () => {
    expect(resolveServerLoa({ ...base, ngayRaVien: null, doe: "2026-08-08" })).toEqual({ ok: true, khoaId: "k2" });
  });
});
