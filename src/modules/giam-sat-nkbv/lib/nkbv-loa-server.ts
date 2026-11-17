/**
 * NKBV-026 (PO 2026-11-13): máy chủ tự tính khoa quy kết (LOA) theo NHSN Transfer Rule.
 * - DOE phải trong khoảng nằm viện [ngày vào, ngày ra + 1] (ngày kế sau ra viện quy cho khoa cho ra).
 * - Khoa = khoa nằm ngày DOE; DOE trùng ngày chuyển khoa hoặc ngày kế → khoa chuyển đi.
 * Dùng chung `attributeLocationOfAttribution` với form lâm sàng — không viết luật thứ hai.
 */
import { attributeLocationOfAttribution } from "./nkbv-timeline-math";
import { locationDaysToTreatmentHistory, type NkbvNgayKhoaRow } from "./nkbv-ba-ngay";
import { addDays } from "./nkbv-shared-timeline";

export type ServerLoaResult = { ok: true; khoaId: string } | { ok: false; error: string };

export function resolveServerLoa(input: {
  gridRows: NkbvNgayKhoaRow[];
  doe: string;
  ngayVaoVien: string | null;
  ngayRaVien: string | null;
  khoaDieuTriId: string | null;
}): ServerLoaResult {
  const doe = input.doe.slice(0, 10);
  const vv = String(input.ngayVaoVien || "").slice(0, 10);
  const rv = String(input.ngayRaVien || "").slice(0, 10);
  if (vv && doe < vv) {
    return { ok: false, error: `Ngày sự kiện (${doe}) trước ngày vào viện (${vv}).` };
  }
  if (rv && doe > addDays(rv, 1)) {
    return { ok: false, error: `Ngày sự kiện (${doe}) sau ngày ra viện (${rv}) quá 1 ngày.` };
  }

  const stays = locationDaysToTreatmentHistory(input.gridRows, () => ({}));
  if (stays.length === 0) {
    const k = String(input.khoaDieuTriId || "").trim();
    return k
      ? { ok: true, khoaId: k }
      : { ok: false, error: "Thiếu lưới ngày–khoa và khoa điều trị — chưa tính được khoa quy kết." };
  }

  const last = stays[stays.length - 1];
  const lastDay = String(last.ngay_ra || last.ngay_vao).slice(0, 10);
  if (doe === addDays(lastDay, 1) && rv && lastDay === rv) {
    return { ok: true, khoaId: last.khoa_id };
  }
  const { attributedStay } = attributeLocationOfAttribution(stays, doe);
  if (!attributedStay?.khoa_id) {
    return { ok: false, error: `Lưới ngày–khoa chưa phủ ngày sự kiện (${doe}) — bổ sung lưới trước khi gửi.` };
  }
  return { ok: true, khoaId: attributedStay.khoa_id };
}
