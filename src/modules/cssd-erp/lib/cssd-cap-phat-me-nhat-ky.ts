/** Phiếu cấp phát: bảng test + mốc nạp/bắt đầu/kết thúc của mẻ — đọc từ tk_qc_json.nhat_ky (thuần, không I/O). */
import type { CssdCapPhatMeInfo, CssdCapPhatMeMoc, CssdCapPhatMeTestRow } from "../types/cssd-print.types";

export const CAP_PHAT_KHONG_CO_DU_LIEU = "không có dữ liệu";

const LOAI_TEST_LABEL: Record<string, string> = {
  THONG_SO_VAT_LY: "Thông số vật lý",
  CI_NGOAI_GOI: "Chỉ thị hóa học ngoài gói",
  CI_PCD: "Chỉ thị hóa học đa thông số (PCD)",
  BI: "Chỉ thị sinh học (BI)",
  BOWIE_DICK: "Bowie–Dick",
};

const KET_QUA_LABEL: Record<string, string> = {
  DAT: "Đạt",
  KHONG_DAT: "Không đạt",
  AM: "Âm tính (đạt)",
  DUONG: "Dương tính (không đạt)",
};

type NhatKyRow = {
  su_kien?: string;
  ten?: string;
  thoi_gian?: string;
  chi_tiet?: { loai?: string; ket_qua?: string; dat?: boolean } | null;
};

function readRows(tkQcJson: unknown): NhatKyRow[] {
  const arr = (tkQcJson as { nhat_ky?: unknown } | null)?.nhat_ky;
  return Array.isArray(arr) ? (arr as NhatKyRow[]) : [];
}

function mocOf(rows: NhatKyRow[], suKien: string): CssdCapPhatMeMoc | null {
  let found: CssdCapPhatMeMoc | null = null;
  for (const r of rows) {
    if (r.su_kien !== suKien || !r.thoi_gian) continue;
    found = { ten: String(r.ten || "").trim() || "—", thoiGian: r.thoi_gian };
  }
  return found;
}

/** Phút giữa hai mốc ISO; null nếu thiếu/âm/không hợp lệ. */
export function phutGiuaHaiMoc(batDau: string | null | undefined, ketThuc: string | null | undefined): number | null {
  if (!batDau || !ketThuc) return null;
  const a = new Date(batDau).getTime();
  const b = new Date(ketThuc).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  return Math.round((b - a) / 60000);
}

export function buildCapPhatMeInfo(batch: { tk_qc_json: unknown; ket_qua_test?: boolean | null }): CssdCapPhatMeInfo {
  const rows = readRows(batch.tk_qc_json);
  const tests: CssdCapPhatMeTestRow[] = [];
  for (const r of rows) {
    if (r.su_kien !== "GHI_TEST") continue;
    const loai = String(r.chi_tiet?.loai || "").toUpperCase();
    const kq = String(r.chi_tiet?.ket_qua || "").toUpperCase();
    if (!loai) continue;
    const dat = typeof r.chi_tiet?.dat === "boolean" ? r.chi_tiet.dat : kq === "DAT" || kq === "AM";
    tests.push({
      loai: LOAI_TEST_LABEL[loai] || loai,
      ketQua: KET_QUA_LABEL[kq] || kq || "—",
      dat,
      nguoi: String(r.ten || "").trim() || "—",
      thoiGian: r.thoi_gian || null,
    });
  }
  const nap = mocOf(rows, "KET_THUC_NAP");
  const batDau = mocOf(rows, "BAT_DAU_TIET_KHUAN");
  const ketThuc = mocOf(rows, "KET_THUC_TIET_KHUAN");
  const coKhongDat = tests.some((t) => !t.dat);
  const ketLuan: CssdCapPhatMeInfo["ketLuan"] = coKhongDat
    ? "KHONG_DAT"
    : batch.ket_qua_test === true
      ? "DAT"
      : "KHONG_CO_DU_LIEU";
  return {
    tests,
    ketLuan,
    nap,
    batDau,
    ketThuc,
    phutTietKhuan: phutGiuaHaiMoc(batDau?.thoiGian, ketThuc?.thoiGian),
  };
}
