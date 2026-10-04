import type { SupabaseClient } from "@supabase/supabase-js";
import { isKhuVucAllowedForKhoa, type KhuVucSelectRow } from "@/lib/khu-vuc-giam-sat-ui";

/**
 * GS-01 — server: khu vực phải thuộc `allowed_khu_vucs` của khoa (hoặc is_common).
 * `allowed == null` → không khóa (giữ hành vi UI hiện tại).
 */
export async function assertKhuVucAllowedForKhoa(params: {
  supabase: SupabaseClient;
  khoaId: string;
  khuVucId: string;
}): Promise<void> {
  const khoaId = String(params.khoaId || "").trim();
  const khuVucId = String(params.khuVucId || "").trim();
  if (!khoaId || !khuVucId) {
    throw new Error("Vui lòng chọn Khoa và Khu vực giám sát.");
  }

  const [{ data: khoa, error: khoaErr }, { data: kv, error: kvErr }] = await Promise.all([
    params.supabase.from("mdm_dm_khoa_phong").select("specs").eq("id", khoaId).maybeSingle(),
    params.supabase
      .from("sys_lookup_value")
      .select("id, code, name, metadata")
      .eq("id", khuVucId)
      .eq("category_type", "KHU_VUC_GIAM_SAT")
      .maybeSingle(),
  ]);
  if (khoaErr) throw new Error(`Khoa phòng: ${khoaErr.message}`);
  if (kvErr) throw new Error(`Khu vực giám sát: ${kvErr.message}`);
  if (!kv?.id) throw new Error("Khu vực giám sát không tồn tại trong danh mục.");

  const specs = (khoa?.specs ?? null) as { allowed_khu_vucs?: string[] } | null;
  const allowed = Array.isArray(specs?.allowed_khu_vucs) ? specs!.allowed_khu_vucs : null;
  const meta =
    kv.metadata && typeof kv.metadata === "object" && !Array.isArray(kv.metadata)
      ? (kv.metadata as { is_common?: boolean })
      : null;
  const row: KhuVucSelectRow = {
    id: String(kv.id),
    ma_danh_muc: String(kv.code ?? ""),
    ten_danh_muc: String(kv.name ?? ""),
    metadata: meta,
  };
  if (!isKhuVucAllowedForKhoa(row, allowed)) {
    throw new Error("Khu vực không thuộc danh mục cho phép của khoa đã chọn.");
  }
}
