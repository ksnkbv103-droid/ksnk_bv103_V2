/** Chuẩn hóa mã danh mục QLCV khi ghi fact — chỉ TEXT (SSOT sau migration 20260607100000). */

import { normalizeQlcvTrangThaiToCanonical } from "@/lib/domain/qlcv/trang-thai-canonical";

export type QlcvDmPersistFields = {
  loai_cong_viec: string;
  trang_thai: string;
};

export function normalizeQlcvDmFields(params: {
  loai_cong_viec?: string | null;
  trang_thai?: string | null;
}): QlcvDmPersistFields {
  const loai = String(params.loai_cong_viec ?? "").trim();
  return {
    loai_cong_viec: loai || "DOT_XUAT",
    trang_thai: normalizeQlcvTrangThaiToCanonical(params.trang_thai),
  };
}

/** Chỉ dùng trong test — giữ API ổn định sau khi bỏ cache lookup. */
export function clearQlcvLookupIdCacheForTests(): void {
  /* no-op */
}
