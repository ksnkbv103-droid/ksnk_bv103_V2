import type { SupabaseClient } from "@supabase/supabase-js";

type ResolveOpts = {
  /** UUID auth.users — ưu tiên liên kết trực tiếp mdm_nhan_su.auth_user_id */
  authUserId?: string | null;
  /** Email đăng nhập hoặc extra_data.email (cùng logic RPC quét trạm). */
  email?: string | null;
  /** Họ tên trên form (mẻ TK) — khớp chính xác không phân biệt hoa thường. */
  hoTen?: string | null;
};

/** Tra cứu mdm_nhan_su.id cho audit CSSD — parity với rpc_scan_workflow_station. */
export async function resolveCssdOperatorNhanSuId(
  client: SupabaseClient,
  opts: ResolveOpts,
): Promise<string | null> {
  const authUserId = String(opts.authUserId || "").trim();
  if (authUserId) {
    const { data } = await client
      .from("mdm_nhan_su")
      .select("id")
      .eq("auth_user_id", authUserId)
      .eq("is_active", true)
      .maybeSingle();
    if (data?.id) return String(data.id);
  }

  const email = String(opts.email || "").trim().toLowerCase();
  if (email) {
    const { data: rows } = await client
      .from("mdm_nhan_su")
      .select("id, extra_data, auth_user_id")
      .eq("is_active", true);
    for (const row of rows || []) {
      const extraEmail = String((row.extra_data as { email?: string } | null)?.email || "")
        .trim()
        .toLowerCase();
      if (extraEmail === email) return String(row.id);
    }
    for (const row of rows || []) {
      const uid = String(row.auth_user_id || "").trim();
      if (!uid) continue;
      const { data: authUser, error } = await client.auth.admin.getUserById(uid);
      if (error) continue;
      const authEmail = String(authUser.user?.email || "")
        .trim()
        .toLowerCase();
      if (authEmail === email) return String(row.id);
    }
  }

  const hoTen = String(opts.hoTen || "").trim();
  if (hoTen) {
    const { data } = await client
      .from("mdm_nhan_su")
      .select("id, ho_ten")
      .eq("is_active", true)
      .ilike("ho_ten", hoTen)
      .limit(1)
      .maybeSingle();
    if (data?.id) return String(data.id);
  }

  return null;
}

export async function loadNhanSuHoTen(
  client: SupabaseClient,
  nhanSuId: string | null | undefined,
): Promise<string | null> {
  const id = String(nhanSuId || "").trim();
  if (!id) return null;
  const { data } = await client.from("mdm_nhan_su").select("ho_ten").eq("id", id).maybeSingle();
  const name = String((data as { ho_ten?: string } | null)?.ho_ten || "").trim();
  return name || null;
}
