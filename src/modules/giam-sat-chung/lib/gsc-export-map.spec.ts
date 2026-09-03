import { describe, expect, it } from "vitest";
import { mapGscSessionToExportRow } from "./gsc-export-map";

describe("mapGscSessionToExportRow", () => {
  it("uses one live percent from counts, not saved tong_diem", () => {
    const row = mapGscSessionToExportRow({
      id: "s1",
      tong_quan_sat: 3,
      tong_dat: 2,
      tong_diem: 67,
      cach_tinh_diem: "TY_LE",
      loai_giam_sat: "TUAN_THU",
    });
    expect(row.ty_le_tuan_thu).toBe(66.67);
    expect(row.so_dat).toBe(2);
    expect(row.so_tieu_chi_co_ap_dung).toBe(3);
    expect(row.ghi_chu_ty_le).toContain("Đạt");
    expect(row).not.toHaveProperty("tong_diem");
  });

  it("leaves nhật ký percent blank", () => {
    const row = mapGscSessionToExportRow({
      id: "s2",
      tong_quan_sat: 4,
      tong_dat: 4,
      tong_diem: 100,
      cach_tinh_diem: "NHAT_KY",
      loai_giam_sat: "NHAT_KY_VAN_HANH",
    });
    expect(row.ty_le_tuan_thu).toBeNull();
    expect(row.ghi_chu_ty_le).toContain("Nhật ký");
  });

  it("falls back to tong_diem when live counts are missing", () => {
    const row = mapGscSessionToExportRow({
      id: "s3",
      tong_diem: 87.5,
      cach_tinh_diem: "TY_LE",
    });
    expect(row.ty_le_tuan_thu).toBe(87.5);
  });
});
