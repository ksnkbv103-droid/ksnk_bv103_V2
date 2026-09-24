import { describe, expect, it } from "vitest";
import { mergeCssdQuyTrinhMetadata } from "./cssd-quy-trinh-metadata";

describe("mergeCssdQuyTrinhMetadata", () => {
  it("keeps VAO_ME, HOAN_ME and bom_lines when stamping a surgery case", () => {
    const merged = mergeCssdQuyTrinhMetadata(
      {
        bom_lines: [{ ten_dung_cu_le: "Kẹp", so_luong_ke_hoach: 1 }],
        ngoai_le: [
          { su_kien: "VAO_ME_TIET_KHUAN" },
          { su_kien: "HOAN_ME_TIET_KHUAN_DAT" },
        ],
      },
      { ma_ca_mo_id: "CA-12" },
    );
    expect(merged.ma_ca_mo_id).toBe("CA-12");
    expect(merged.bom_lines).toEqual([{ ten_dung_cu_le: "Kẹp", so_luong_ke_hoach: 1 }]);
    expect(merged.ngoai_le).toEqual([
      { su_kien: "VAO_ME_TIET_KHUAN" },
      { su_kien: "HOAN_ME_TIET_KHUAN_DAT" },
    ]);
  });
});
