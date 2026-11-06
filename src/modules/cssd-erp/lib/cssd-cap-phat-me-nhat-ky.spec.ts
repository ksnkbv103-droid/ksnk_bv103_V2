import { describe, expect, it } from "vitest";
import { buildCapPhatMeInfo, phutGiuaHaiMoc } from "./cssd-cap-phat-me-nhat-ky";

const nk = [
  { su_kien: "KET_THUC_NAP", ten: "A", thoi_gian: "2026-10-30T01:00:00Z" },
  { su_kien: "BAT_DAU_TIET_KHUAN", ten: "B", thoi_gian: "2026-10-30T01:05:00Z" },
  { su_kien: "KET_THUC_TIET_KHUAN", ten: "C", thoi_gian: "2026-10-30T01:50:00Z" },
  { su_kien: "GHI_TEST", ten: "D", thoi_gian: "2026-10-30T02:00:00Z", chi_tiet: { loai: "CI_PCD", ket_qua: "DAT", dat: true } },
  { su_kien: "GHI_TEST", ten: "E", thoi_gian: "2026-10-30T02:01:00Z", chi_tiet: { loai: "BI", ket_qua: "AM", dat: true } },
];

describe("buildCapPhatMeInfo", () => {
  it("mẻ đạt: bảng test, mốc, 45 phút, kết luận ĐẠT", () => {
    const r = buildCapPhatMeInfo({ tk_qc_json: { nhat_ky: nk }, ket_qua_test: true });
    expect(r.ketLuan).toBe("DAT");
    expect(r.tests.map((t) => [t.loai, t.nguoi])).toEqual([
      ["Chỉ thị hóa học đa thông số (PCD)", "D"],
      ["Chỉ thị sinh học (BI)", "E"],
    ]);
    expect(r.nap?.ten).toBe("A");
    expect(r.phutTietKhuan).toBe(45);
  });
  it("có test không đạt → KHONG_DAT dù ket_qua_test true", () => {
    const bad = [...nk, { su_kien: "GHI_TEST", ten: "F", thoi_gian: "2026-10-30T02:02:00Z", chi_tiet: { loai: "BI", ket_qua: "DUONG", dat: false } }];
    expect(buildCapPhatMeInfo({ tk_qc_json: { nhat_ky: bad }, ket_qua_test: true }).ketLuan).toBe("KHONG_DAT");
  });
  it("mẻ cũ không nhật ký → không có dữ liệu, mốc null", () => {
    const r = buildCapPhatMeInfo({ tk_qc_json: null, ket_qua_test: null });
    expect(r).toEqual({ tests: [], ketLuan: "KHONG_CO_DU_LIEU", nap: null, batDau: null, ketThuc: null, phutTietKhuan: null });
  });
  it("phutGiuaHaiMoc: thiếu hoặc âm → null", () => {
    expect(phutGiuaHaiMoc(null, "2026-10-30T01:00:00Z")).toBeNull();
    expect(phutGiuaHaiMoc("2026-10-30T02:00:00Z", "2026-10-30T01:00:00Z")).toBeNull();
  });
});
