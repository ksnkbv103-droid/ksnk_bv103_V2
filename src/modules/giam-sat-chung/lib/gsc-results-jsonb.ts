import type { ChecklistResult, ChecklistResultValue } from "@/types/giam-sat-chung";

/** Shape persisted in `gstt_fact_chung_sessions.results_jsonb`. */
export type GscResultsJsonbRow = {
  criterion_id: string;
  value: ChecklistResultValue;
  note?: string | null;
  weight_type?: ChecklistResult["weightType"];
  is_red_flag?: boolean;
  image_url?: string | null;
  thoi_diem_ghi?: string | null;
  gia_tri_so?: number | null;
  gia_tri_lua_chon?: string | null;
};

function normValue(raw: unknown): ChecklistResultValue {
  const v = String(raw ?? "").trim().toUpperCase();
  return v === "DAT" || v === "KHONG_DAT" || v === "NA" ? v : "NA";
}

function normWeightType(raw: unknown): ChecklistResult["weightType"] | undefined {
  const v = String(raw ?? "").trim().toUpperCase();
  if (v === "CRITICAL" || v === "MAJOR" || v === "MINOR") return v;
  return undefined;
}

/** Parse `results_jsonb` column (array or JSON string) → typed rows for read actions. */
export function parseGscResultsJsonb(raw: unknown): GscResultsJsonbRow[] {
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

  const out: GscResultsJsonbRow[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const criterion_id = String(o.criterion_id ?? o.criterionId ?? "").trim();
    if (!criterion_id) continue;
    out.push({
      criterion_id,
      value: normValue(o.value),
      note: o.note != null ? String(o.note) : null,
      weight_type: normWeightType(o.weight_type ?? o.weightType),
      is_red_flag: Boolean(o.is_red_flag ?? o.isRedFlag),
      image_url: o.image_url != null ? String(o.image_url) : null,
      thoi_diem_ghi: o.thoi_diem_ghi != null ? String(o.thoi_diem_ghi) : null,
      gia_tri_so: typeof o.gia_tri_so === "number" ? o.gia_tri_so : null,
      gia_tri_lua_chon: o.gia_tri_lua_chon != null ? String(o.gia_tri_lua_chon) : null,
    });
  }
  return out;
}
