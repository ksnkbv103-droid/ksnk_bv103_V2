import { describe, expect, it } from "vitest";
import { buildLoaiCatalogUpdatePatch } from "./cssd-catalog-de-nghi-apply";

describe("applyLoai kho dự phòng", () => {
  it("không ghi đè so_luong_kho_du_phong từ snapshot đề nghị", () => {
    const patch = buildLoaiCatalogUpdatePatch(
      {
        ten_loai: "Kéo Mayo",
        so_luong_kho_du_phong: 0,
        is_active: true,
      },
      "2026-09-25T00:00:00.000Z",
    );
    expect(patch.ten_loai).toBe("Kéo Mayo");
    expect(patch.is_active).toBe(true);
    expect(patch).not.toHaveProperty("so_luong_kho_du_phong");
  });
});
