import { createAdminSupabaseClient } from "@/lib/supabase-server";
import {
  eventDateFromVerification,
  khoaIdByDateMap,
  khoaIdOnOrBefore,
  stripCopiedStayFieldsFromVerification,
} from "./nkbv-ba-ngay";

/**
 * Đổi lưới → cập nhật khoa quy kết trên phiếu; không đổi loại nhiễm.
 * Helper nội bộ (không "use server") — chỉ gọi sau khi action đã verifyPermission.
 */
export async function syncNkbvPhieuFromBaNgay(maBenhAn: string) {
  const ma = String(maBenhAn || "").trim();
  if (!ma) return { success: false as const, error: "Thiếu mã bệnh án" };
  const supabase = createAdminSupabaseClient();
  const [{ data: khoaRows }, { data: cases }] = await Promise.all([
    supabase.from("nkbv_fact_ba_ngay_khoa").select("ngay_lich, khoa_id").eq("ma_benh_an", ma),
    supabase
      .from("nkbv_fact_su_kien")
      .select("id, ngay_phat_hien, verification_data, khoa_ghi_nhan_id")
      .eq("ma_benh_an", ma)
      .eq("is_active", true),
  ]);
  const byDate = khoaIdByDateMap(
    (khoaRows || []).map((r) => ({
      ngay_lich: String(r.ngay_lich).slice(0, 10),
      khoa_id: String(r.khoa_id),
    })),
  );
  for (const c of cases || []) {
    const vd =
      c.verification_data && typeof c.verification_data === "object"
        ? (c.verification_data as Record<string, unknown>)
        : {};
    const doe = eventDateFromVerification(vd, c.ngay_phat_hien ? String(c.ngay_phat_hien).slice(0, 10) : null);
    const khoaId = doe ? khoaIdOnOrBefore(byDate, doe) : null;
    const nextVd = stripCopiedStayFieldsFromVerification(vd);
    const patch: Record<string, unknown> = { verification_data: nextVd };
    if (khoaId && khoaId !== String(c.khoa_ghi_nhan_id || "")) {
      patch.khoa_ghi_nhan_id = khoaId;
    }
    await supabase.from("nkbv_fact_su_kien").update(patch).eq("id", c.id);
  }
  return { success: true as const };
}
