import { mapNhanSuViewRow } from "@/lib/nhan-su-view-row";
import { getCachedDmKhoaPhong } from "@/lib/cache/master-data-cache";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { type NhanSu } from "@/modules/to-chuc/nhan-su/types";

/** Gắn nested khoa/tổ từ `v_mdm_nhan_su_full` (alias chuc_* đã có trên view) và fallback role từ `sys_user_roles`. */
export async function enrichNhanSuListRows(rows: Record<string, unknown>[]): Promise<NhanSu[]> {
  const mapped = rows.map((x) => mapNhanSuViewRow(x) as unknown as NhanSu);
  const khoaList = await getCachedDmKhoaPhong();
  const maById = new Map(
    (khoaList || []).map((k) => [String(k.id), String(k.ma_khoa || "").trim()] as const),
  );

  // Fallback vai trò KSNK từ sys_user_roles nếu cột trên view trống
  const missingRoleAuthIds = mapped
    .filter((r) => r.auth_user_id && !r.vai_tro_he_thong_ksnk)
    .map((r) => String(r.auth_user_id));

  const roleByUserId = new Map<string, string>();
  if (missingRoleAuthIds.length > 0) {
    try {
      const supabase = createAdminSupabaseClient();
      const { data: userRoles } = await supabase
        .from("sys_user_roles")
        .select("user_id, role:sys_roles(name)")
        .in("user_id", missingRoleAuthIds);

      for (const ur of userRoles || []) {
        const roleData = ur.role as unknown as { name?: string } | { name?: string }[] | null;
        const roleName = Array.isArray(roleData) ? roleData[0]?.name : roleData?.name;
        if (ur.user_id && roleName) {
          roleByUserId.set(String(ur.user_id), roleName);
        }
      }
    } catch {
      /* ignore fallback error */
    }
  }

  return mapped.map((row) => {
    const fallbackRole = row.auth_user_id ? roleByUserId.get(String(row.auth_user_id)) : undefined;
    const finalRow: NhanSu = {
      ...row,
      vai_tro_he_thong_ksnk: row.vai_tro_he_thong_ksnk || fallbackRole || "",
    };
    if (!finalRow.khoa?.id) return finalRow;
    const ma = maById.get(String(finalRow.khoa.id)) || "";
    return {
      ...finalRow,
      khoa: {
        ...finalRow.khoa,
        ...(ma ? { ma_khoa: ma } : {}),
      },
    };
  });
}
