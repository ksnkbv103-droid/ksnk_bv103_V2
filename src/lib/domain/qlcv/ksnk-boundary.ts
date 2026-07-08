/** Invariant phạm vi QLCV — chỉ Khoa Kiểm soát nhiễm khuẩn (KSNK). */

export const QLCV_KSNK_MA_KHOA = "KSNK" as const;

/** Mã khoa thực tế trong MDM pilot (excel import, legacy). */
const QLCV_KSNK_MA_KHOA_ALIASES = ["KSNK", "C18", "KHOA_KSNK"] as const;

export type QlcvKsnkStaffRow = {
  id: string;
  khoa_id?: string | null;
};

export type QlcvKhoaPhongRow = {
  id: string;
  ma_khoa?: string | null;
  ten_khoa?: string | null;
};

const KSNK_NAME_RE = /kiểm soát nhiễm khuẩn|kiem soat nhiem khuan/i;

/** Chọn dòng khoa KSNK — ưu tiên ma_khoa=KSNK, rồi alias, rồi tên khoa. */
export function pickKsnkKhoaFromRows(rows: QlcvKhoaPhongRow[]): QlcvKhoaPhongRow | null {
  const list = rows.filter((r) => r?.id);
  const normMa = (ma: string | null | undefined) => String(ma || "").trim().toUpperCase();

  const exact = list.find((r) => normMa(r.ma_khoa) === QLCV_KSNK_MA_KHOA);
  if (exact) return exact;

  const aliasSet = new Set<string>(QLCV_KSNK_MA_KHOA_ALIASES.map((m) => m.toUpperCase()));
  const byAlias = list.find((r) => aliasSet.has(normMa(r.ma_khoa)));
  if (byAlias) return byAlias;

  const byName = list.find((r) => KSNK_NAME_RE.test(String(r.ten_khoa || "")));
  return byName ?? null;
}

function isKsnkKhoaId(khoaId: string | null | undefined, ksnkKhoaId: string): boolean {
  return khoaId != null && String(khoaId) === String(ksnkKhoaId);
}

export function isKsnkStaff(staff: QlcvKsnkStaffRow, ksnkKhoaId: string): boolean {
  return isKsnkKhoaId(staff.khoa_id, ksnkKhoaId);
}
