import { describe, expect, it } from "vitest";
import {
  CATALOG_DE_NGHI_CLAIM_STATUS,
  CATALOG_DE_NGHI_FAILED_STATUS,
  canClaimCatalogDeNghi,
  canRejectCatalogDeNghi,
  catalogDeNghiStatusLabel,
} from "./cssd-catalog-de-nghi";

describe("catalog đề nghị claim-before-apply", () => {
  it("chỉ claim từ PENDING", () => {
    expect(canClaimCatalogDeNghi("PENDING")).toBe(true);
    expect(canClaimCatalogDeNghi("APPLYING")).toBe(false);
    expect(canClaimCatalogDeNghi("APPLY_FAILED")).toBe(false);
    expect(canClaimCatalogDeNghi("APPROVED")).toBe(false);
    expect(canClaimCatalogDeNghi("REJECTED")).toBe(false);
  });

  it("từ chối từ PENDING hoặc APPLY_FAILED — không apply lại", () => {
    expect(canRejectCatalogDeNghi("PENDING")).toBe(true);
    expect(canRejectCatalogDeNghi("APPLY_FAILED")).toBe(true);
    expect(canRejectCatalogDeNghi("APPLYING")).toBe(false);
    expect(canRejectCatalogDeNghi("APPROVED")).toBe(false);
  });

  it("token claim / fail ổn định", () => {
    expect(CATALOG_DE_NGHI_CLAIM_STATUS).toBe("APPLYING");
    expect(CATALOG_DE_NGHI_FAILED_STATUS).toBe("APPLY_FAILED");
    expect(catalogDeNghiStatusLabel("APPLY_FAILED")).toBe("Ghi danh mục lỗi");
    expect(catalogDeNghiStatusLabel("APPLYING")).toBe("Đang ghi danh mục");
  });
});
