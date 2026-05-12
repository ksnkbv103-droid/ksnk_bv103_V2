import { getBangKiemsForGiamSat, getTieuChisForGiamSatChung } from "@/modules/quan-tri-he-thong/bang-kiem/actions/bang-kiem.actions";
import type { ChecklistResult, ChecklistTemplate } from "@/types/giam-sat-chung";

export type GscTemplateOption = { id: string; ma_bk: string; ten_bang_kiem: string };

export async function loadGscTemplateOptions(): Promise<GscTemplateOption[]> {
  const res = await getBangKiemsForGiamSat();
  if (!res.success) return [];
  return (res.data || []).map((b) => ({
    id: b.id,
    ma_bk: b.ma_bk || "",
    ten_bang_kiem: b.ten_bang_kiem || "",
  }));
}

type SwitchOk = { ok: true; template: ChecklistTemplate; results: ChecklistResult[] };
type SwitchErr = { ok: false; error: string };
export type SwitchGscTemplateResult = SwitchOk | SwitchErr;

export async function switchGscTemplateByBangKiemId(
  bkId: string,
  dbTemplates: GscTemplateOption[],
): Promise<SwitchGscTemplateResult> {
  const bk = dbTemplates.find((t) => t.id === bkId);
  if (!bk) return { ok: false, error: "Không tìm thấy mẫu" };

  const tcRes = await getTieuChisForGiamSatChung(bkId, true);
  if (!tcRes.success) return { ok: false, error: "Không thể tải tiêu chí: " + tcRes.error };

  const criteria = tcRes.data || [];
  const ma = String(bk.ma_bk ?? "").trim();
  const template: ChecklistTemplate = {
    id: ma || String(bk.id ?? ""),
    dbId: bk.id,
    title: bk.ten_bang_kiem,
    criteria: criteria.map((c: { id: string; noi_dung?: string | null; stt: number; diem_toi_da?: number }) => ({
      id: c.id,
      label: String(c.noi_dung ?? "").trim() || "Tiêu chí",
      maxScore: c.diem_toi_da || 1,
    })),
  };
  const results = template.criteria.map((c) => ({ criterionId: c.id, value: "NA" as const }));
  return { ok: true, template, results };
}
