import { type RegistryEntry, getRegistryEntry } from "./domain-registry";
import { getDanhMucItemById } from "./repository";
import {
  collectExistingCodes,
  composeLookupCode,
  dedupeLookupCode,
  lookupCodePrefixForLoai,
  nextSequentialPrefixedCode,
  slugifyLookupCode,
} from "./lookup-code-prefix";

function nowIso(): string {
  return new Date().toISOString();
}

export type BuildNextDmCodeOptions = {
  /** Tên danh mục — ưu tiên slug hóa thành mã có nghĩa (NN_BAC_SI). */
  ten?: string;
};

/**
 * Sinh mã nghiệp vụ tiếp theo:
 * - Có prefix theo loai (NN_, HT_, …) — slug từ `ten` hoặc seq `PREFIX_001`.
 * - Không prefix (LOAI_CONG_VIEC, LOAI_NKBV…) — slug UPPER_SNAKE từ `ten` hoặc `MUC_001`.
 */
export async function buildNextDmBusinessCode(
  supabase: any,
  reg: RegistryEntry,
  options: BuildNextDmCodeOptions = {},
): Promise<string> {
  const col = reg.maColumn;
  let res = await supabase.from(reg.sourceTable).select(col).order("updated_at", { ascending: false }).limit(500);
  if (res.error) {
    res = await supabase.from(reg.sourceTable).select(col).order(col, { ascending: false }).limit(500);
  }
  if (res.error) throw res.error;

  const existing = collectExistingCodes(Array.isArray(res.data) ? res.data : [], col);
  const prefix = lookupCodePrefixForLoai(reg.loaiDanhMuc);
  const ten = String(options.ten ?? "").trim();

  if (ten) {
    const base = prefix ? composeLookupCode(prefix, ten) : slugifyLookupCode(ten);
    return dedupeLookupCode(base, existing);
  }

  if (prefix) {
    if (reg.loaiDanhMuc === "KHU_VUC_GIAM_SAT") {
      return dedupeLookupCode(`${prefix}_TR_MUC`, existing);
    }
    return nextSequentialPrefixedCode(prefix, existing);
  }

  let maxSeq = 0;
  for (const code of existing) {
    const tail = code.match(/_(\d+)$/);
    if (tail) {
      const n = parseInt(tail[1], 10);
      if (!Number.isNaN(n)) maxSeq = Math.max(maxSeq, n);
    }
  }
  return `MUC_${String(maxSeq + 1).padStart(3, "0")}`;
}

export function buildMigratedUpsertPayload(
  reg: RegistryEntry,
  input: {
    ma: string;
    ten: string;
    isActive: boolean;
  }
): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    [reg.maColumn]: input.ma,
    [reg.tenColumn]: input.ten,
    is_active: input.isActive,
    updated_at: nowIso(),
  };
  if (reg.sourceTable === "cssd_dm_loai_dung_cu") {
    patch.ma_loai = String(input.ma).slice(0, 50);
    patch.ten_loai = input.ten;
  }
  return patch;
}

/** Bật/tắt is_active trên bảng `{module}_dm_*` từ registry. */
export async function setDanhMucActiveFlag(supabase: any, id: string, isActive: boolean): Promise<void> {
  const item = await getDanhMucItemById(supabase, id);
  if (!item?.loai_danh_muc) throw new Error("Không tìm thấy danh mục.");
  const reg = getRegistryEntry(item.loai_danh_muc);
  const ts = nowIso();
  const { error } = await supabase.from(reg.sourceTable).update({ is_active: isActive, updated_at: ts }).eq("id", id);
  if (error) throw error;
}
