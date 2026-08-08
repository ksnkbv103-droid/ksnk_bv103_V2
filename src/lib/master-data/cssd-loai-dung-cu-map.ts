/** SSOT cột vật lý `cssd_dm_loai_dung_cu` vs alias UI/view (`ma_loai_dung_cu`). */

export const CSSD_LOAI_DM_VIEW = "v_cssd_loai_dung_cu_summary" as const;

export const CSSD_LOAI_PHYSICAL_SELECT = "id, ma_loai, ten_loai, is_active" as const;

export type CssdLoaiAlias = { ma_loai_dung_cu: string; ten_loai_dung_cu: string };

export type CssdSpaulding = "CRITICAL" | "SEMI_CRITICAL" | "NON_CRITICAL";
export type CssdSterileMethod = "STEAM_134" | "STEAM_121" | "PLASMA" | "EO";

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

const SPAULDING = new Set<CssdSpaulding>(["CRITICAL", "SEMI_CRITICAL", "NON_CRITICAL"]);
const STERILE = new Set<CssdSterileMethod>(["STEAM_134", "STEAM_121", "PLASMA", "EO"]);

/** UI chữ «Cao/Thấp» (và biến thể) → cột `is_chiu_nhiet`. */
export function mapKhaNangToIsChiuNhiet(value: unknown): boolean {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!v) return true;
  if (v === "thấp" || v === "thap" || v === "false" || v === "0" || v === "no") return false;
  if (v === "cao" || v === "true" || v === "1" || v === "yes") return true;
  return true;
}

export function mapIsChiuNhietToKhaNang(isChiuNhiet: unknown): "Cao" | "Thấp" {
  return isChiuNhiet === false ? "Thấp" : "Cao";
}

export function normalizeSpauldingForMaster(value: unknown): CssdSpaulding {
  const v = String(value || "CRITICAL")
    .trim()
    .toUpperCase() as CssdSpaulding;
  return SPAULDING.has(v) ? v : "CRITICAL";
}

/** Nhãn UI cũ («Hơi nước») + mã chuẩn → `phuong_phap_tiet_khuan_chi_dinh`. */
export function normalizeSterileMethodForMaster(value: unknown): CssdSterileMethod {
  const raw = String(value || "STEAM_134").trim();
  const upper = raw.toUpperCase();
  if (STERILE.has(upper as CssdSterileMethod)) return upper as CssdSterileMethod;
  const low = raw.toLowerCase();
  if (low.includes("eo") || low.includes("ethylene")) return "EO";
  if (low.includes("plasma")) return "PLASMA";
  if (low.includes("121")) return "STEAM_121";
  if (low.includes("hơi") || low.includes("hoi") || low.includes("steam") || low.includes("134")) {
    return "STEAM_134";
  }
  return "STEAM_134";
}

export function sterileMethodLabel(code: unknown): string {
  switch (normalizeSterileMethodForMaster(code)) {
    case "STEAM_121":
      return "Hơi 121°C";
    case "PLASMA":
      return "Plasma";
    case "EO":
      return "EO";
    default:
      return "Hơi 134°C";
  }
}

export function spauldingLabel(code: unknown): string {
  switch (normalizeSpauldingForMaster(code)) {
    case "SEMI_CRITICAL":
      return "Bán thiết yếu";
    case "NON_CRITICAL":
      return "Không thiết yếu";
    default:
      return "Thiết yếu";
  }
}

/** Mã trạm CSSD gợi ý (lookup TRAM_CSSD) từ Spaulding + chịu nhiệt + PP tiệt khuẩn — D-16. */
export type CssdStationSuggestion = {
  maTramGoiY: string;
  lyDo: string;
};

export function suggestCssdStationFromMaster(input: {
  spaulding?: unknown;
  sterileMethod?: unknown;
  isChiuNhiet?: unknown;
}): CssdStationSuggestion {
  const method = normalizeSterileMethodForMaster(input.sterileMethod);
  const spaulding = normalizeSpauldingForMaster(input.spaulding);
  const chiuNhiet =
    input.isChiuNhiet !== undefined && input.isChiuNhiet !== null
      ? Boolean(input.isChiuNhiet)
      : mapKhaNangToIsChiuNhiet(input.isChiuNhiet);

  if (method === "EO") {
    return {
      maTramGoiY: "TRAM_EO",
      lyDo: "PP chỉ định EO → trạm khí EO",
    };
  }
  if (method === "PLASMA" || !chiuNhiet) {
    return {
      maTramGoiY: "TRAM_PLASMA",
      lyDo: !chiuNhiet
        ? "Nhạy nhiệt → ưu tiên Plasma (không hấp hơi)"
        : "PP chỉ định Plasma → trạm Plasma",
    };
  }
  if (method === "STEAM_121") {
    return {
      maTramGoiY: "TRAM_HOI_121",
      lyDo: "PP hơi 121°C → trạm hấp 121",
    };
  }
  if (spaulding === "NON_CRITICAL") {
    return {
      maTramGoiY: "TRAM_KHU_TRUNG",
      lyDo: "Non-critical → trạm khử trùng / mức thấp hơn tiệt khuẩn",
    };
  }
  return {
    maTramGoiY: "TRAM_HOI_134",
    lyDo: "Critical/Semi + chịu nhiệt + hơi 134°C → trạm hấp 134",
  };
}

/** Ghi bảng vật lý từ form MDM (alias UI → ma_loai/ten_loai + specs + cột domain). */
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

  const isChiuNhiet =
    input.is_chiu_nhiet !== undefined && input.is_chiu_nhiet !== null
      ? Boolean(input.is_chiu_nhiet)
      : mapKhaNangToIsChiuNhiet(
          input.kha_nang_chiu_nhiet ?? prevSpecs.kha_nang_chiu_nhiet,
        );

  const spaulding = normalizeSpauldingForMaster(
    input.phan_loai_spaulding ?? prevSpecs.phan_loai_spaulding,
  );

  const sterile = normalizeSterileMethodForMaster(
    input.phuong_phap_tiet_khuan_chi_dinh ??
      input.phuong_phap_tiet_khuan ??
      prevSpecs.phuong_phap_tiet_khuan,
  );

  const khaNang = mapIsChiuNhietToKhaNang(isChiuNhiet);

  const specs: Record<string, unknown> = {
    ...prevSpecs,
    ma_loai_dung_cu: ma,
    ten_loai_dung_cu: ten,
    kha_nang_chiu_nhiet: khaNang,
    phuong_phap_tiet_khuan: sterile,
    phan_loai_spaulding: spaulding,
  };
  for (const key of LOAI_SPECS_KEYS) {
    if (key === "kha_nang_chiu_nhiet" || key === "phuong_phap_tiet_khuan") continue;
    if (input[key] !== undefined && input[key] !== null && String(input[key]).trim() !== "") {
      specs[key] = input[key];
    }
  }

  return {
    ma_loai: ma,
    ten_loai: ten,
    phan_loai: String(input.phan_loai || "PHAU_THUAT"),
    so_luong_kho_du_phong: Number(input.so_luong_kho_du_phong || 0),
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
    specs,
    is_chiu_nhiet: isChiuNhiet,
    phan_loai_spaulding: spaulding,
    phuong_phap_tiet_khuan_chi_dinh: sterile,
  };
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

  const isChiuNhiet =
    payload.is_chiu_nhiet !== undefined && payload.is_chiu_nhiet !== null
      ? Boolean(payload.is_chiu_nhiet)
      : mapKhaNangToIsChiuNhiet(payload.kha_nang_chiu_nhiet ?? specs.kha_nang_chiu_nhiet);
  const spaulding = normalizeSpauldingForMaster(
    payload.phan_loai_spaulding ?? specs.phan_loai_spaulding,
  );
  const sterile = normalizeSterileMethodForMaster(
    payload.phuong_phap_tiet_khuan_chi_dinh ??
      payload.phuong_phap_tiet_khuan ??
      specs.phuong_phap_tiet_khuan,
  );

  payload.is_chiu_nhiet = isChiuNhiet;
  payload.phan_loai_spaulding = spaulding;
  payload.phuong_phap_tiet_khuan_chi_dinh = sterile;
  specs.kha_nang_chiu_nhiet = mapIsChiuNhietToKhaNang(isChiuNhiet);
  specs.phuong_phap_tiet_khuan = sterile;
  specs.phan_loai_spaulding = spaulding;
  payload.specs = specs;

  delete payload.ma_loai_dung_cu;
  delete payload.ten_loai_dung_cu;
  delete payload.kha_nang_chiu_nhiet;
  delete payload.phuong_phap_tiet_khuan;
}
