/** Chuẩn hóa mã danh mục QLCV khi ghi fact — chỉ TEXT (SSOT sau migration 20260607100000). */

export type QlcvDmPersistFields = {
  loai_cong_viec: string;
  trang_thai: string;
};

export function normalizeQlcvDmFields(params: {
  loai_cong_viec?: string | null;
  trang_thai?: string | null;
}): QlcvDmPersistFields {
  const loai = String(params.loai_cong_viec ?? "").trim();
  const tt = String(params.trang_thai ?? "").trim();
  return {
    loai_cong_viec: loai || "DOT_XUAT",
    trang_thai: tt || "MOI",
  };
}

/** @deprecated Alias — dùng normalizeQlcvDmFields (sync, không SELECT FK). */
export async function buildQlcvDmPersistFields(
  _supabase: unknown,
  params: { loai_cong_viec?: string | null; trang_thai?: string | null },
): Promise<QlcvDmPersistFields> {
  return normalizeQlcvDmFields(params);
}

/** Chỉ dùng trong test — giữ API ổn định sau khi bỏ cache lookup. */
export function clearQlcvLookupIdCacheForTests(): void {
  /* no-op */
}
