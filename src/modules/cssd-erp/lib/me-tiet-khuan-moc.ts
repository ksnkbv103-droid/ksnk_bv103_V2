/** Mốc người + giờ trên phiếu mẻ — đọc từ tk_qc_json.nhat_ky (thuần, không I/O). */
import type { MeSlipStep } from "./me-tiet-khuan-slip-ux";

export type MeMoc = { ten: string; gio: string };
export type MeMocByStep = Partial<Record<MeSlipStep, MeMoc>>;

/** Sự kiện nhật ký → bước stepper (GHI_TEST thuộc bước «Nhả»). */
const SU_KIEN_BUOC: Record<string, MeSlipStep> = {
  KET_THUC_NAP: 4,
  BAT_DAU_TIET_KHUAN: 5,
  KET_THUC_TIET_KHUAN: 6,
};

function gioVn(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

/** Lấy dòng cuối của mỗi sự kiện; bước «Nhả» lấy lần ghi test gần nhất. */
export function mocTuNhatKy(tkQcJson: unknown): MeMocByStep {
  const arr = (tkQcJson as { nhat_ky?: unknown } | null)?.nhat_ky;
  const out: MeMocByStep = {};
  if (!Array.isArray(arr)) return out;
  for (const raw of arr) {
    const r = raw as { su_kien?: string; ten?: string; thoi_gian?: string };
    const step = r.su_kien === "GHI_TEST" ? 7 : SU_KIEN_BUOC[String(r.su_kien || "")];
    if (!step || !r.thoi_gian) continue;
    out[step] = { ten: String(r.ten || "—"), gio: gioVn(r.thoi_gian) };
  }
  return out;
}
