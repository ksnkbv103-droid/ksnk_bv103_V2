import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isPhysicalKind,
  physicalQuantity,
  physicalTypeIdForKind,
  type SetReconcileLineInput,
} from "@/lib/domain/cssd-set-reconcile";
import { applyInstrumentIncidentLedger } from "./instrument-incident.application";

/** Ghi sổ thực tế cho các dòng Hỏng/Mất/Bổ sung — cùng một phiếu. */
export async function applySetReconcilePhysicalLines(
  supabase: SupabaseClient,
  suCoId: string,
  args: {
    boDungCuId: string;
    quyTrinhId?: string | null;
    maQr?: string;
    headerNote: string;
    lines: SetReconcileLineInput[];
  },
): Promise<void> {
  for (const line of args.lines) {
    if (!isPhysicalKind(line.kind)) continue;
    const typeId = physicalTypeIdForKind(line.kind);
    if (!typeId) continue;
    const qty = physicalQuantity(line);
    if (qty < 1) continue;
    if (!line.loaiDungCuId) throw new Error(`${line.tenDungCuLe}: thiếu loại dụng cụ.`);
    if ((line.kind === "HONG" || line.kind === "MAT") && !line.chiTietId) {
      throw new Error(`${line.tenDungCuLe}: thiếu dòng thành phần.`);
    }
    if (line.kind === "DIEU_CHUYEN") {
      const dest = String(line.maQrDen || "").trim().toUpperCase();
      const src = String(args.maQr || "").trim().toUpperCase();
      if (!dest || dest === src) {
        throw new Error(`${line.tenDungCuLe}: điều chuyển cần mã bộ đích khác bộ đang kiểm kê.`);
      }
    }
    await applyInstrumentIncidentLedger(supabase, suCoId, {
      typeId,
      chiTietId: line.chiTietId,
      loaiDungCuId: line.loaiDungCuId,
      boDungCuId: args.boDungCuId,
      quyTrinhId: args.quyTrinhId,
      maQrNguon: args.maQr,
      maQrDen: line.kind === "DIEU_CHUYEN" ? line.maQrDen : undefined,
      quantity: qty,
      tenDungCuLe: line.tenDungCuLe,
      note: line.note || args.headerNote,
    });
  }
}

/** Ghi mã khắc viện lên dòng thành phần (specs.ma_khac) khi NV bổ sung lúc kiểm kê. */
export async function applySetReconcileEngravedCodes(
  supabase: SupabaseClient,
  lines: SetReconcileLineInput[],
): Promise<void> {
  for (const line of lines) {
    const id = String(line.chiTietId || "").trim();
    if (!id) continue;
    const next = String(line.maKhac || "").trim();
    const orig = String(line.maKhacGoc || "").trim();
    if (next === orig) continue;
    const { data, error } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .select("specs")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const prev =
      data?.specs && typeof data.specs === "object" && !Array.isArray(data.specs)
        ? (data.specs as Record<string, unknown>)
        : {};
    const specs = { ...prev, ma_khac: next, co_ma_khac: Boolean(next) };
    const { error: updErr } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .update({ specs, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) throw new Error(updErr.message);
  }
}
