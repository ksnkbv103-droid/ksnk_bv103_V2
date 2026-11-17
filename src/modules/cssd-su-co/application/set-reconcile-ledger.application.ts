import type { SupabaseClient } from "@supabase/supabase-js";
import { mapInstrumentPresetToLedgerType } from "@/lib/domain/cssd-instrument-incident";
import {
  isMoveOnlyKind,
  isPhysicalKind,
  physicalQuantity,
  physicalTypeIdForKind,
  rejectMoveOnlyKindsOnReconcile,
  type SetReconcileLineInput,
} from "@/lib/domain/cssd-set-reconcile";
import {
  applyInstrumentLinesRpc,
  type CssdLedgerLine,
} from "./instrument-incident.application";

export function buildSetReconcileLedgerLines(
  args: {
    boDungCuId: string;
    quyTrinhId?: string | null;
    maQr?: string;
    headerNote: string;
    lines: SetReconcileLineInput[];
    door?: "reconcile" | "move";
  },
  opts?: { includeEngraved?: boolean },
): CssdLedgerLine[] {
  const door = args.door || "reconcile";
  if (door === "reconcile") {
    const moveErr = rejectMoveOnlyKindsOnReconcile(args.lines);
    if (moveErr) throw new Error(moveErr);
  }
  const out: CssdLedgerLine[] = [];
  for (const line of args.lines) {
    const apply =
      door === "reconcile" ? isPhysicalKind(line.kind) : isMoveOnlyKind(line.kind) || isPhysicalKind(line.kind);
    const typeId = apply ? physicalTypeIdForKind(line.kind) : null;
    const qty = apply && typeId ? physicalQuantity(line) : 0;
    const ledgerType = typeId ? mapInstrumentPresetToLedgerType(typeId) : null;
    const ledger = Boolean(apply && ledgerType && qty >= 1);
    const nextKhac = String(line.maKhac || "").trim();
    const origKhac = String(line.maKhacGoc || "").trim();
    const engraved = Boolean(opts?.includeEngraved && line.chiTietId && nextKhac !== origKhac);
    if (!ledger && !engraved) continue;
    if (ledger) {
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
    }
    const issue =
      ledgerType === "BAO_HONG" ? "HONG" : ledgerType === "BAO_MAT" ? "MAT" : null;
    out.push({
      skip_ledger: !ledger,
      loai_dung_cu_id: line.loaiDungCuId,
      bo_dung_cu_id: args.boDungCuId,
      quy_trinh_id: args.quyTrinhId || null,
      loai_giao_dich: ledger ? ledgerType || undefined : undefined,
      so_luong_thay_doi: ledger && ledgerType ? (ledgerType === "BO_SUNG" ? qty : -qty) : undefined,
      ghi_chu: line.note || args.headerNote || null,
      chi_tiet_id: line.chiTietId || null,
      issue_type: issue,
      ten_dung_cu_le: line.tenDungCuLe,
      ma_qr_nguon: args.maQr || null,
      ma_qr_den: line.kind === "DIEU_CHUYEN" ? line.maQrDen || null : null,
      ma_khac: engraved ? nextKhac : undefined,
      ma_khac_goc: engraved ? origKhac : undefined,
    });
  }
  return out;
}

/** Ghi sổ thực tế một lần. Cửa rà soát: chỉ Hỏng/Mất. Cửa Chuyển: lấy kho / trả kho / điều chuyển. */
export async function applySetReconcilePhysicalLines(
  supabase: SupabaseClient,
  suCoId: string,
  args: {
    boDungCuId: string;
    quyTrinhId?: string | null;
    maQr?: string;
    headerNote: string;
    lines: SetReconcileLineInput[];
    door?: "reconcile" | "move";
  },
): Promise<void> {
  const lines = buildSetReconcileLedgerLines(args);
  if (!lines.length) return;
  await applyInstrumentLinesRpc(supabase, {
    suCoId,
    lines,
    boDungCuId: args.boDungCuId,
    touchNgayKiemKe: false,
  });
}
