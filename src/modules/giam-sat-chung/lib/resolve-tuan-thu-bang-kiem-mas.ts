type BangKiemQueryResult = {
  data: Array<{ ma_bk?: string | null }> | null;
  error: { message: string } | null;
};

/** Tra `gstt_dm_bang_kiem` TUAN_THU — BCTH gọi 1 lần/tải rồi truyền vào các lời gọi GSC. */
export async function resolveTuanThuBangKiemMas(supabase: {
  // Postgrest builder thenable — không ép Promise thuần.
  from: (table: string) => {
    select: (cols: string) => {
      or: (filter: string) => PromiseLike<BangKiemQueryResult>;
    };
  };
}): Promise<{ success: true; mas: string[] | null } | { success: false; error: string }> {
  const { data: tuanThuRows, error: bkErr } = await supabase
    .from("gstt_dm_bang_kiem")
    .select("ma_bk")
    .or("loai_giam_sat.is.null,loai_giam_sat.eq.TUAN_THU");
  if (bkErr) return { success: false, error: bkErr.message };
  const mas = (tuanThuRows ?? [])
    .map((r) => String(r.ma_bk ?? "").trim())
    .filter((ma) => ma.length > 0);
  return { success: true, mas: mas.length > 0 ? mas : null };
}
