import { cache } from "react";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { todayYmdInVn } from "@/lib/format-datetime-vi";
import { resolveThamSo, type ThamSoMap } from "./supervision-thresholds";

/**
 * Ngưỡng đang áp dụng hôm nay từ `ksnk_dm_tham_so` (một lần mỗi request).
 * Chưa đăng nhập / lỗi đọc → `{}` để nơi dùng giữ số mặc định trong mã.
 */
export const loadThamSoHienHanh = cache(async (): Promise<ThamSoMap> => {
  try {
    const supabase = await createServerSupabaseUserClient();
    const ngay = todayYmdInVn();
    const { data, error } = await supabase
      .from("ksnk_dm_tham_so")
      .select("ma_tham_so, gia_tri, hieu_luc_tu")
      .lte("hieu_luc_tu", ngay);
    if (error || !data) return {};
    return resolveThamSo(data, ngay);
  } catch {
    return {};
  }
});
