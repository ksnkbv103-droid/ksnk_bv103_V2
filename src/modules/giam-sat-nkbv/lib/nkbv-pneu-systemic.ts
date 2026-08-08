/**
 * PNEU toàn thân: atom sốt / hạ thân nhiệt / WBC + tương thích field gộp legacy.
 */

import type { VaeVerificationData } from "../types/nkbv-verification";

export type PneuSystemicAtoms = {
  has_pneu_fever?: boolean;
  has_pneu_hypothermia?: boolean;
  has_pneu_wbc_abnormal?: boolean;
  /** Legacy gộp — vẫn đọc khi ca cũ chưa tách atom */
  fever_or_wbc_abnormal?: boolean;
};

/** Đạt ≥1 dấu hiệu toàn thân PNEU (atom hoặc legacy bundle). */
export function derivePneuSystemic(data: PneuSystemicAtoms): boolean {
  return (
    !!data.has_pneu_fever ||
    !!data.has_pneu_hypothermia ||
    !!data.has_pneu_wbc_abnormal ||
    !!data.fever_or_wbc_abnormal
  );
}

/** Đồng bộ field gộp từ atom (giữ BA / DOE / ca cũ đọc được). */
export function syncPneuSystemicBundle(
  form: VaeVerificationData,
  patch: Partial<VaeVerificationData> = {},
): VaeVerificationData {
  const next = { ...form, ...patch };
  next.fever_or_wbc_abnormal = derivePneuSystemic(next);
  return next;
}
