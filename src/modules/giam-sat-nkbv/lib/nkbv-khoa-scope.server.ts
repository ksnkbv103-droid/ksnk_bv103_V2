/**
 * Helper chỉ chạy phía server (không phải Server Action) — áp phạm vi khoa NK-SCOPE cho các action đọc NKBV.
 */
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { verifyPermission } from "@/lib/server-permission";
import { nkbvKhoaVisible, resolveNkbvKhoaRestriction, type NkbvKhoaRestriction } from "./nkbv-khoa-scope";

export async function getNkbvKhoaRestriction(): Promise<NkbvKhoaRestriction> {
  return resolveNkbvKhoaRestriction(await getActorKsnkScope());
}

/**
 * Phạm vi cho màn MDRO/RCA (cho phép cả GIAM_SAT_CHUNG view). Người không có GIAM_SAT_NKBV view
 * (RLS nkbv sẽ trả rỗng) bị coi như mạng lưới: chỉ khoa của mình; `viaGscOnly` = true → action phải đọc bằng admin client.
 */
export async function getNkbvCensusAccess(): Promise<{ restriction: NkbvKhoaRestriction; viaGscOnly: boolean }> {
  const scope = await getActorKsnkScope();
  let hasNkbvView = true;
  try {
    await verifyPermission("GIAM_SAT_NKBV", "view");
  } catch {
    hasNkbvView = false;
  }
  if (hasNkbvView) return { restriction: resolveNkbvKhoaRestriction(scope), viaGscOnly: false };
  // Đọc bằng admin client nên không xét vai rộng: chỉ khoa của chính họ, không có khoa thì không thấy gì.
  const khoaId = scope.actorKhoaId?.trim() || "";
  return { restriction: khoaId ? { kind: "khoa", khoaId } : { kind: "none" }, viaGscOnly: true };
}

export const NKBV_GSC_NO_KHOA_ERROR =
  "Chưa xác định được khoa của bạn nên không xem được danh sách MDRO. Liên hệ quản trị để gán khoa.";

export const NKBV_OUT_OF_SCOPE_ERROR = "Hồ sơ nằm ngoài khoa của bạn.";

/**
 * Hồ sơ BA có hiển thị với actor không (khoa điều trị hoặc có ngày nằm ở khoa mình).
 * `khoaKhiChuaCoBa`: khoa ghi nhận của phiếu — chỉ dùng khi BA chưa có khoa điều trị (hồ sơ đã ẩn
 * hoặc tạo chưa chọn khoa) và chưa có ngày nào trên lưới, để Mạng lưới sửa được phiếu của khoa mình.
 * Hub/đọc BA không truyền.
 */
export async function isNkbvBenhAnInScope(
  r: NkbvKhoaRestriction,
  maBenhAn: string,
  khoaKhiChuaCoBa: Array<string | null | undefined> = [],
): Promise<boolean> {
  if (r.kind === "all") return true;
  if (r.kind === "none") return false;
  const ma = maBenhAn.trim();
  if (!ma) return false;
  const admin = createAdminSupabaseClient();
  const [{ data: ba }, { data: days }] = await Promise.all([
    admin.from("nkbv_fact_benh_an").select("khoa_dieu_tri_id").eq("ma_benh_an", ma).eq("is_active", true).maybeSingle(),
    admin.from("nkbv_fact_ba_ngay_khoa").select("khoa_id").eq("ma_benh_an", ma).eq("khoa_id", r.khoaId).limit(1),
  ]);
  if (nkbvKhoaVisible(r, [ba?.khoa_dieu_tri_id as string | null, ...(days || []).map((d) => d.khoa_id as string)])) {
    return true;
  }
  if (ba?.khoa_dieu_tri_id || !khoaKhiChuaCoBa.length) return false;
  const { data: anyDay } = await admin.from("nkbv_fact_ba_ngay_khoa").select("khoa_id").eq("ma_benh_an", ma).limit(1);
  if (anyDay?.length) return false;
  return nkbvKhoaVisible(r, khoaKhiChuaCoBa);
}
