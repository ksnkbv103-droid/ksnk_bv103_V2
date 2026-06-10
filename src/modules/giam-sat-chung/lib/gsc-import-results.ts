import type { ChecklistResult } from "@/types/giam-sat-chung";
import { parseGscResultsJsonb } from "./gsc-results-jsonb";

/** Parse `results_jsonb` từ dòng import (mảng hoặc JSON string). */
export function parseGscImportResults(raw: unknown): ChecklistResult[] {
  return parseGscResultsJsonb(raw).map((r) => ({
    criterionId: r.criterion_id,
    value: r.value,
    note: r.note ?? null,
    weightType: r.weight_type,
    isRedFlag: r.is_red_flag ?? false,
    gia_tri_so: r.gia_tri_so ?? null,
    gia_tri_lua_chon: r.gia_tri_lua_chon ?? null,
  }));
}
