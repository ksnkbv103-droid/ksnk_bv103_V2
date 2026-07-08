import type { SupabaseClient } from "@supabase/supabase-js";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { hasRBACAdminSupervisionBypass } from "@/lib/server-permission";
import { QLCV_KSNK_MA_KHOA, pickKsnkKhoaFromRows, isKsnkStaff } from "@/lib/domain/qlcv/ksnk-boundary";

let cachedKsnkKhoaId: string | null = null;

/** SSOT id khoa KSNK — tra MDM (ma_khoa KSNK / alias / tên khoa). */
export async function resolveKsnkKhoaId(supabase: SupabaseClient): Promise<string> {
  if (cachedKsnkKhoaId) return cachedKsnkKhoaId;
  const { data, error } = await supabase
    .from("mdm_dm_khoa_phong")
    .select("id, ma_khoa, ten_khoa")
    .eq("is_active", true);
  if (error) throw new Error(`Không tra được khoa KSNK: ${error.message}`);

  const picked = pickKsnkKhoaFromRows(data ?? []);
  if (!picked?.id) {
    throw new Error(
      `Chưa cấu hình khoa KSNK trong MDM (mdm_dm_khoa_phong: ma_khoa='${QLCV_KSNK_MA_KHOA}' hoặc C18/KHOA_KSNK, hoặc tên chứa "Kiểm soát nhiễm khuẩn"). Liên hệ quản trị.`,
    );
  }
  cachedKsnkKhoaId = String(picked.id);
  return cachedKsnkKhoaId;
}

async function assertStaffBelongsToKsnk(
  supabase: SupabaseClient,
  staffId: string,
  ksnkKhoaId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("mdm_nhan_su")
    .select("id, khoa_id")
    .eq("id", staffId)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) throw new Error("Không tìm thấy nhân sự phụ trách.");
  if (!isKsnkStaff({ id: String(data.id), khoa_id: data.khoa_id }, ksnkKhoaId)) {
    throw new Error("Chỉ được giao việc cho nhân viên thuộc Khoa KSNK.");
  }
}

/** Chặn NV khoa lâm sàng — admin hệ thống vẫn được (bypass). */
export async function assertActorIsKsnkStaffForQlcv(supabase: SupabaseClient): Promise<string> {
  const ksnkKhoaId = await resolveKsnkKhoaId(supabase);
  if (await hasRBACAdminSupervisionBypass()) return ksnkKhoaId;

  const actorId = await getActorNhanSuId();
  if (!actorId) {
    throw new Error("Tài khoản cần gắn hồ sơ nhân sự (mdm_nhan_su) để dùng Quản lý công việc.");
  }

  const { data, error } = await supabase
    .from("mdm_nhan_su")
    .select("id, khoa_id")
    .eq("id", actorId)
    .maybeSingle();
  if (error || !data) throw new Error("Không tìm thấy hồ sơ nhân sự của bạn.");

  if (!isKsnkStaff({ id: String(data.id), khoa_id: data.khoa_id }, ksnkKhoaId)) {
    throw new Error("Quản lý công việc chỉ dành cho nhân viên Khoa Kiểm soát nhiễm khuẩn (KSNK).");
  }

  return ksnkKhoaId;
}

export async function validateAssigneeForQlcv(
  supabase: SupabaseClient,
  assigneeId: string | null | undefined,
  ksnkKhoaId: string,
): Promise<void> {
  if (!assigneeId) return;
  await assertStaffBelongsToKsnk(supabase, String(assigneeId), ksnkKhoaId);
}
