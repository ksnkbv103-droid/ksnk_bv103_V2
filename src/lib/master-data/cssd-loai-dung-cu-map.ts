/** SSOT cột vật lý `cssd_dm_loai_dung_cu` vs alias UI/view (`ma_loai_dung_cu`). */

export const CSSD_LOAI_DM_TABLE = "cssd_dm_loai_dung_cu" as const;
export const CSSD_LOAI_DM_VIEW = "v_cssd_loai_dung_cu_summary" as const;

export const CSSD_LOAI_PHYSICAL_SELECT = "id, ma_loai, ten_loai, is_active" as const;

export type CssdLoaiAlias = { ma_loai_dung_cu: string; ten_loai_dung_cu: string };

type LoaiLikeRow = {
  ma_loai?: string | null;
  ten_loai?: string | null;
  ma_loai_dung_cu?: string | null;
  ten_loai_dung_cu?: string | null;
  specs?: Record<string, unknown> | null;
};

export function resolveLoaiAlias(row: LoaiLikeRow): CssdLoaiAlias {
  const specs =
    row.specs && typeof row.specs === "object" && !Array.isArray(row.specs)
      ? row.specs
      : {};
  return {
    ma_loai_dung_cu: String(
      row.ma_loai_dung_cu ?? row.ma_loai ?? specs.ma_loai_dung_cu ?? "",
    ).trim(),
    ten_loai_dung_cu: String(
      row.ten_loai_dung_cu ?? row.ten_loai ?? specs.ten_loai_dung_cu ?? "",
    ).trim(),
  };
}

const LOAI_SPECS_KEYS = [
  "hinh_dang",
  "kich_thuoc",
  "cong_dung",
  "kha_nang_chiu_nhiet",
  "phuong_phap_tiet_khuan",
] as const;

/** Ghi bảng vật lý từ form MDM (alias UI → ma_loai/ten_loai + specs). */
export function buildLoaiPhysicalUpsertPayload(input: Record<string, unknown>): Record<string, unknown> {
  const ma = String(
    input.ma_danh_muc ?? input.ma_loai_dung_cu ?? input.ma_loai ?? "",
  )
    .trim()
    .toUpperCase();
  const ten = String(
    input.ten_danh_muc ?? input.ten_loai_dung_cu ?? input.ten_loai ?? "",
  ).trim();

  const prevSpecs =
    input.specs && typeof input.specs === "object" && !Array.isArray(input.specs)
      ? (input.specs as Record<string, unknown>)
      : {};
  const specs: Record<string, unknown> = {
    ...prevSpecs,
    ma_loai_dung_cu: ma,
    ten_loai_dung_cu: ten,
  };
  for (const key of LOAI_SPECS_KEYS) {
    if (input[key] !== undefined && input[key] !== null && String(input[key]).trim() !== "") {
      specs[key] = input[key];
    }
  }

  const payload: Record<string, unknown> = {
    ma_loai: ma,
    ten_loai: ten,
    phan_loai: String(input.phan_loai || "PHAU_THUAT"),
    so_luong_kho_du_phong: Number(input.so_luong_kho_du_phong || 0),
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
    specs,
  };

  const pptk = String(input.phuong_phap_tiet_khuan || specs.phuong_phap_tiet_khuan || "").trim();
  if (pptk) payload.phuong_phap_tiet_khuan_chi_dinh = pptk;

  return payload;
}

/** Smart import hybrid: đồng bộ cột vật lý sau khi gom mã vào specs. */
export function syncLoaiPhysicalColumnsOnImportPayload(
  payload: Record<string, unknown>,
  finalCode: string,
): void {
  payload.ma_loai = finalCode;
  const specs = (payload.specs as Record<string, unknown>) || {};
  specs.ma_loai_dung_cu = finalCode;
  const ten = String(payload.ten_loai_dung_cu ?? payload.ten_loai ?? specs.ten_loai_dung_cu ?? "").trim();
  if (ten) {
    payload.ten_loai = ten;
    specs.ten_loai_dung_cu = ten;
  }
  payload.specs = specs;
  delete payload.ma_loai_dung_cu;
  delete payload.ten_loai_dung_cu;
}
