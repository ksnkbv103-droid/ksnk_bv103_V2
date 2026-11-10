/**
 * BK-3: field tiêu chí mà form GSC đang đọc từ `tieu_chi_jsonb`.
 */

export const TIEU_CHI_KIEU_DU_LIEU = ["BOOLEAN", "LUA_CHON", "SO_LIEU"] as const;
export type TieuChiKieuDuLieu = (typeof TIEU_CHI_KIEU_DU_LIEU)[number];

export const TIEU_CHI_WEIGHT_TYPE = ["CRITICAL", "MAJOR", "MINOR"] as const;
export type TieuChiWeightType = (typeof TIEU_CHI_WEIGHT_TYPE)[number];

export const TIEU_CHI_KIEU_DU_LIEU_LABEL: Record<TieuChiKieuDuLieu, string> = {
  BOOLEAN: "Đạt / Không đạt",
  LUA_CHON: "Chọn trong danh sách",
  SO_LIEU: "Nhập số liệu",
};

export const TIEU_CHI_WEIGHT_TYPE_LABEL: Record<TieuChiWeightType, string> = {
  CRITICAL: "Chí mạng",
  MAJOR: "Nghiêm trọng",
  MINOR: "Hành chính",
};

export type TieuChiGscPersistFields = {
  kieu_du_lieu: TieuChiKieuDuLieu;
  la_then_chot: boolean;
  cho_phep_kpa: boolean;
  cac_lua_chon: string[] | null;
  nguong_min: number | null;
  nguong_max: number | null;
  don_vi: string | null;
  weight_type: TieuChiWeightType;
  is_red_flag: boolean;
};

const KIEU_SET = new Set<string>(TIEU_CHI_KIEU_DU_LIEU);
const WEIGHT_SET = new Set<string>(TIEU_CHI_WEIGHT_TYPE);

export function parseTieuChiKieuDuLieu(raw: unknown): TieuChiKieuDuLieu | null {
  const v = String(raw ?? "").trim().toUpperCase();
  if (v === "ENUM") return "LUA_CHON";
  if (v === "NUMBER") return "SO_LIEU";
  return KIEU_SET.has(v) ? (v as TieuChiKieuDuLieu) : null;
}

export function parseTieuChiWeightType(raw: unknown): TieuChiWeightType | null {
  const v = String(raw ?? "").trim().toUpperCase();
  return WEIGHT_SET.has(v) ? (v as TieuChiWeightType) : null;
}

export function parseTieuChiLuaChon(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x ?? "").trim()).filter(Boolean);
  }
  return String(raw ?? "")
    .split(/\r?\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function asBool(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  if (raw == null || raw === "") return fallback;
  const t = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "có", "co"].includes(t)) return true;
  if (["0", "false", "no", "không", "khong"].includes(t)) return false;
  return fallback;
}

function asOptionalNumber(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

export function resolveTieuChiGscPersistFields(
  data: Record<string, unknown>,
): { ok: true; fields: TieuChiGscPersistFields } | { ok: false; error: string } {
  const kieu = parseTieuChiKieuDuLieu(data.kieu_du_lieu) ?? "BOOLEAN";
  const weight =
    parseTieuChiWeightType(data.weight_type ?? data.weightType) ?? "MAJOR";
  const options = parseTieuChiLuaChon(data.cac_lua_chon);
  if (kieu === "LUA_CHON" && options.length === 0) {
    return { ok: false, error: "Kiểu chọn danh sách: nhập ít nhất 1 lựa chọn (mỗi dòng một mục)." };
  }
  const min = asOptionalNumber(data.nguong_min);
  const max = asOptionalNumber(data.nguong_max);
  if (min != null && max != null && min > max) {
    return { ok: false, error: "Ngưỡng tối thiểu không được lớn hơn ngưỡng tối đa." };
  }
  return {
    ok: true,
    fields: {
      kieu_du_lieu: kieu,
      la_then_chot: asBool(data.la_then_chot, false),
      cho_phep_kpa: asBool(data.cho_phep_kpa, true),
      cac_lua_chon: kieu === "LUA_CHON" ? options : null,
      nguong_min: kieu === "SO_LIEU" ? min : null,
      nguong_max: kieu === "SO_LIEU" ? max : null,
      don_vi: kieu === "SO_LIEU" ? String(data.don_vi ?? "").trim() || null : null,
      weight_type: weight,
      is_red_flag: asBool(data.is_red_flag ?? data.isRedFlag, false),
    },
  };
}

export function luaChonToTextarea(raw: unknown): string {
  return parseTieuChiLuaChon(raw).join("\n");
}

export function labelTieuChiKieuDuLieu(raw: unknown): string {
  const parsed = parseTieuChiKieuDuLieu(raw);
  return parsed ? TIEU_CHI_KIEU_DU_LIEU_LABEL[parsed] : TIEU_CHI_KIEU_DU_LIEU_LABEL.BOOLEAN;
}
