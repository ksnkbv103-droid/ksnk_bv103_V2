/**
 * Hai tuần ISO được so «tuần trước» có chấm CÙNG bộ bảng kiểm không?
 * Tỷ lệ GSC tổng phụ thuộc bảng kiểm nào được chấm trong tuần; nếu bộ bảng kiểm khác nhau thì chênh lệch
 * phản ánh cơ cấu chấm, không phải tuân thủ thật — BCTH hiện chú thích (PO chọn cách 1, 2026-10-12).
 * Logic thuần ở `weeksUseDifferentChecklists`; `fetchGscWeeksUseDifferentChecklists` chỉ đọc dữ liệu.
 */
import { addDays, format, parseISO } from "date-fns";

export type GscSessionRow = { bang_kiem_id: string | null; ngay_giam_sat: string | null };
export type ComparedWeeks = { prev: string; cur: string };

/** `prev`/`cur` là Thứ Hai đầu tuần (yyyy-MM-dd). Trả null khi không đủ dữ liệu để kết luận. */
export function weeksUseDifferentChecklists(
  rows: GscSessionRow[],
  weeks: ComparedWeeks,
  allowedBangKiemIds?: ReadonlySet<string> | null,
): boolean | null {
  const prevSet = new Set<string>();
  const curSet = new Set<string>();
  const curEnd = format(addDays(parseISO(`${weeks.cur}T12:00:00`), 6), "yyyy-MM-dd");
  for (const r of rows) {
    const id = r.bang_kiem_id;
    const day = String(r.ngay_giam_sat ?? "").slice(0, 10);
    if (!id || !day) continue;
    if (allowedBangKiemIds && !allowedBangKiemIds.has(id)) continue;
    if (day > curEnd) continue;
    if (day >= weeks.cur) curSet.add(id);
    else if (day >= weeks.prev) prevSet.add(id);
  }
  if (!prevSet.size || !curSet.size) return null;
  if (prevSet.size !== curSet.size) return true;
  for (const id of prevSet) if (!curSet.has(id)) return true;
  return false;
}

type Q = {
  from: (t: string) => {
    select: (c: string) => unknown;
  };
};

/** Trần dòng đọc; chạm trần = dữ liệu có thể bị cắt → không kết luận. */
export const GSC_WEEK_SETS_ROW_CAP = 5000;

/** Chuỗi chú thích dùng chung cho thẻ KPI và bản in A4. */
export const GSC_KHAC_CO_CAU_NOTE =
  "Hai tuần chấm bộ bảng kiểm khác nhau — chênh lệch chủ yếu do cơ cấu bảng kiểm, không phải tuân thủ thật.";

/**
 * Đọc phiên GSC của hai tuần rồi so bộ bảng kiểm. Lỗi, chạm trần hay không rõ phạm vi → null
 * (không chú thích, không chặn báo cáo). `bangKiemMas` = tập bảng kiểm của tổng GSC (TUAN_THU trừ BM.02/03);
 * null = không rõ phạm vi → không kết luận. `khoaIds` = bộ lọc khoa của BCTH (rỗng = toàn viện).
 * Các bộ lọc khác (khu vực, hình thức…) không áp dụng: chú thích là tín hiệu cảnh báo, không phải số liệu.
 */
export async function fetchGscWeeksUseDifferentChecklists(
  supabase: Q,
  weeks: ComparedWeeks,
  bangKiemMas: string[] | null,
  khoaIds?: string[] | null,
): Promise<boolean | null> {
  if (!bangKiemMas || bangKiemMas.length === 0) return null;
  try {
    const end = format(addDays(parseISO(`${weeks.cur}T12:00:00`), 6), "yyyy-MM-dd");
    const dm = await (supabase.from("gstt_dm_bang_kiem").select("id") as unknown as {
      in: (c: string, v: string[]) => PromiseLike<{ data: { id: string }[] | null; error: unknown }>;
    }).in("ma_bk", bangKiemMas);
    if (dm.error || !dm.data) {
      console.error({ module: "dashboard", action: "gsc-week-sets", step: "dm_bang_kiem" });
      return null;
    }
    const allowed = new Set(dm.data.map((r) => String(r.id)));

    type Rows = PromiseLike<{ data: GscSessionRow[] | null; error: unknown }>;
    type Lte = { lte: (c: string, v: string) => { limit: (n: number) => Rows; in: (c: string, v: string[]) => { limit: (n: number) => Rows } } };
    const base = (supabase.from("v_gstt_giam_sat_chung_sessions_full").select("bang_kiem_id, ngay_giam_sat") as unknown as {
      eq: (c: string, v: boolean) => { gte: (c: string, v: string) => Lte };
    })
      .eq("is_active", true)
      .gte("ngay_giam_sat", weeks.prev)
      .lte("ngay_giam_sat", end);
    const res = await (khoaIds && khoaIds.length > 0
      ? base.in("khoa_id", khoaIds).limit(GSC_WEEK_SETS_ROW_CAP)
      : base.limit(GSC_WEEK_SETS_ROW_CAP));
    if (res.error || !res.data) {
      console.error({ module: "dashboard", action: "gsc-week-sets", step: "sessions" });
      return null;
    }
    if (res.data.length >= GSC_WEEK_SETS_ROW_CAP) return null;
    return weeksUseDifferentChecklists(res.data, weeks, allowed);
  } catch {
    console.error({ module: "dashboard", action: "gsc-week-sets", step: "exception" });
    return null;
  }
}
