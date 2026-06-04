import type { ChecklistResult } from "@/types/giam-sat-chung";

/** Parse `results_jsonb` từ dòng import (mảng hoặc JSON string). */
export function parseGscImportResults(raw: unknown): ChecklistResult[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      return [];
    }
  }
  const out: ChecklistResult[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const criterionId = String(o.criterion_id ?? o.criterionId ?? "").trim();
    const valueRaw = String(o.value ?? "").trim().toUpperCase();
    if (!criterionId) continue;
    const value =
      valueRaw === "DAT" || valueRaw === "KHONG_DAT" || valueRaw === "NA" ? valueRaw : "NA";
    out.push({
      criterionId,
      value,
      note: o.note != null ? String(o.note) : null,
      weightType: o.weight_type as ChecklistResult["weightType"],
      isRedFlag: Boolean(o.is_red_flag ?? o.isRedFlag),
      gia_tri_so: typeof o.gia_tri_so === "number" ? o.gia_tri_so : null,
      gia_tri_lua_chon: o.gia_tri_lua_chon != null ? String(o.gia_tri_lua_chon) : null,
    });
  }
  return out;
}
