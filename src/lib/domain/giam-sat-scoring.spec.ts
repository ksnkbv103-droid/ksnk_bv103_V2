import { describe, expect, it } from "vitest";
import {
  GsttScoringInputItem,
  computeScore,
  scoreDatKhongDat,
  scoreNhatKy,
  scoreTronGoi,
  scoreTyLe,
} from "./giam-sat-scoring";

const r = (
  id: string,
  value: GsttScoringInputItem["value"],
  extra: Partial<GsttScoringInputItem> = {},
): GsttScoringInputItem => ({ criterionId: id, value, ...extra });

describe("scoreTyLe (PERCENTAGE)", () => {
  it("trả 0 khi không có tiêu chí evaluable", () => {
    expect(scoreTyLe([])).toBe(0);
    expect(scoreTyLe([r("1", "NA"), r("2", "NA")])).toBe(0);
  });

  it("trả % chính xác (làm tròn) loại NA", () => {
    const items = [r("1", "DAT"), r("2", "KHONG_DAT"), r("3", "DAT"), r("4", "NA")];
    expect(scoreTyLe(items)).toBe(66.67);
  });
});

describe("scoreTronGoi (ALL_OR_NONE)", () => {
  it("PASS chỉ khi mọi tiêu chí then chốt DAT (bỏ NA)", () => {
    const items = [
      r("1", "DAT", { la_then_chot: true }),
      r("2", "DAT", { la_then_chot: true }),
      r("3", "KHONG_DAT", { la_then_chot: false }),
    ];
    expect(scoreTronGoi(items)).toBe(true);
  });

  it("FAIL khi 1 tiêu chí then chốt KHONG_DAT", () => {
    const items = [
      r("1", "DAT", { la_then_chot: true }),
      r("2", "KHONG_DAT", { la_then_chot: true }),
    ];
    expect(scoreTronGoi(items)).toBe(false);
  });

  it("Khi không có tiêu chí then chốt nào → fallback toàn bộ phải DAT", () => {
    expect(
      scoreTronGoi([r("1", "DAT"), r("2", "DAT"), r("3", "NA")]),
    ).toBe(true);
    expect(scoreTronGoi([r("1", "DAT"), r("2", "KHONG_DAT")])).toBe(false);
  });

  it("trả null khi không có tiêu chí evaluable", () => {
    expect(scoreTronGoi([r("1", "NA"), r("2", "NA")])).toBe(null);
    expect(scoreTronGoi([])).toBe(null);
  });
});

describe("scoreDatKhongDat (PASS_FAIL)", () => {
  it("PASS khi mọi evaluable DAT", () => {
    expect(scoreDatKhongDat([r("1", "DAT"), r("2", "DAT"), r("3", "NA")])).toBe(true);
  });

  it("FAIL khi 1 KHONG_DAT", () => {
    expect(scoreDatKhongDat([r("1", "DAT"), r("2", "KHONG_DAT")])).toBe(false);
  });

  it("null khi rỗng / toàn NA", () => {
    expect(scoreDatKhongDat([])).toBe(null);
    expect(scoreDatKhongDat([r("1", "NA")])).toBe(null);
  });
});

describe("scoreNhatKy (LOG_ENTRY)", () => {
  it("đếm số giá trị ngoài ngưỡng (so_oor)", () => {
    const items: GsttScoringInputItem[] = [
      r("temp", "DAT", { gia_tri_so: 134.2, nguong_min: 132, nguong_max: 137 }), // OK
      r("press", "DAT", { gia_tri_so: 0.5, nguong_min: 1.0, nguong_max: 2.0 }),  // OOR (dưới min)
      r("ph", "DAT", { gia_tri_so: 9.5, nguong_min: 6.5, nguong_max: 8.5 }),     // OOR (vượt max)
      r("text", "DAT"),                                                           // không số → bỏ qua
    ];
    expect(scoreNhatKy(items).so_oor).toBe(2);
  });
});

describe("computeScore — engine dispatch", () => {
  it("TY_LE: trả ty_le_percent + tong_diem khớp", () => {
    const items = [r("1", "DAT"), r("2", "DAT"), r("3", "KHONG_DAT")];
    const out = computeScore("TY_LE", items);
    expect(out.cach_tinh_diem).toBe("TY_LE");
    expect(out.ty_le_percent).toBe(66.67);
    expect(out.tong_diem).toBe(66.67);
    expect(out.dat_tron_goi).toBeNull();
    expect(out.ket_qua_pass_fail).toBeNull();
  });

  it("TRON_GOI: dat_tron_goi=true → tong_diem=100; false → 0", () => {
    const passItems = [
      r("1", "DAT", { la_then_chot: true }),
      r("2", "DAT", { la_then_chot: true }),
    ];
    const failItems = [
      r("1", "DAT", { la_then_chot: true }),
      r("2", "KHONG_DAT", { la_then_chot: true }),
    ];
    expect(computeScore("TRON_GOI", passItems).dat_tron_goi).toBe(true);
    expect(computeScore("TRON_GOI", passItems).tong_diem).toBe(100);
    expect(computeScore("TRON_GOI", failItems).dat_tron_goi).toBe(false);
    expect(computeScore("TRON_GOI", failItems).tong_diem).toBe(0);
  });

  it("DAT_KHONG_DAT: ket_qua_pass_fail=true → tong_diem=100", () => {
    const out = computeScore("DAT_KHONG_DAT", [r("1", "DAT"), r("2", "DAT")]);
    expect(out.ket_qua_pass_fail).toBe(true);
    expect(out.tong_diem).toBe(100);
  });

  it("NHAT_KY: tong_diem=null + so_oor đếm đúng", () => {
    const items = [
      r("temp", "DAT", { gia_tri_so: 200, nguong_max: 137 }),
      r("press", "DAT", { gia_tri_so: 1.5, nguong_min: 1, nguong_max: 2 }),
    ];
    const out = computeScore("NHAT_KY", items);
    expect(out.tong_diem).toBeNull();
    expect(out.so_oor).toBe(1);
  });

  it("anti-Hawthorne: cờ du_lieu_nghi_van TRUE khi start=end", () => {
    const items = [r("1", "DAT")];
    const out = computeScore("TY_LE", items, {
      thoi_gian_bat_dau: "2026-05-27T08:00:00Z",
      thoi_gian_ket_thuc: "2026-05-27T08:00:00Z",
    });
    expect(out.du_lieu_nghi_van).toBe(true);
  });

  it("anti-Hawthorne: TRUE khi tốc độ >30 quan sát/phút", () => {
    const items = Array.from({ length: 100 }, (_, i) => r(String(i), "DAT"));
    const out = computeScore("TY_LE", items, {
      thoi_gian_bat_dau: "2026-05-27T08:00:00Z",
      thoi_gian_ket_thuc: "2026-05-27T08:01:00Z", // 1 minute → 100/min > 30
    });
    expect(out.du_lieu_nghi_van).toBe(true);
  });

  it("anti-Hawthorne: FALSE khi tốc độ bình thường", () => {
    const items = Array.from({ length: 5 }, (_, i) => r(String(i), "DAT"));
    const out = computeScore("TY_LE", items, {
      thoi_gian_bat_dau: "2026-05-27T08:00:00Z",
      thoi_gian_ket_thuc: "2026-05-27T08:30:00Z",
    });
    expect(out.du_lieu_nghi_van).toBe(false);
  });
});
