"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { verifyPermission } from "@/lib/server-permission";
import { assertQlcvHanHoanThanhNotPast, insertQlcvTaskRow } from "../lib/qlcv-create-task";
import { parseQlcvImportRow, type QlcvImportRow } from "../lib/qlcv-import-parse";

async function resolveNhanSuIdByMa(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  maNv: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("mdm_nhan_su")
    .select("id")
    .eq("ma_nv", maNv)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error(`Không tìm thấy nhân sự ma_nv=${maNv}`);
  return String(data.id);
}

async function resolveKhoaIdByMa(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  maKhoa: string | null,
): Promise<string | null> {
  if (!maKhoa) return null;
  const { data, error } = await supabase
    .from("mdm_dm_khoa_phong")
    .select("id")
    .eq("ma_khoa", maKhoa)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error(`Không tìm thấy khoa ma_khoa=${maKhoa}`);
  return String(data.id);
}

async function resolveToIdByMa(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  maTo: string | null,
): Promise<string | null> {
  if (!maTo) return null;
  const { data, error } = await supabase
    .from("mdm_dm_to_cong_tac")
    .select("id")
    .eq("ma_to", maTo)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error(`Không tìm thấy tổ ma_to=${maTo}`);
  return String(data.id);
}

async function importOneRow(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  actor: string,
  row: QlcvImportRow,
) {
  assertQlcvHanHoanThanhNotPast(row.han_hoan_thanh);
  const nguoi_phu_trach_id = await resolveNhanSuIdByMa(supabase, row.ma_nv);
  const khoa_thuc_hien_id = await resolveKhoaIdByMa(supabase, row.ma_khoa);
  const to_cong_tac_id = await resolveToIdByMa(supabase, row.ma_to);

  const data = await insertQlcvTaskRow(supabase, {
    tieu_de: row.tieu_de,
    mo_ta: row.mo_ta,
    loai_cong_viec: row.loai_cong_viec,
    muc_do_uu_tien: row.muc_do_uu_tien,
    han_hoan_thanh: row.han_hoan_thanh,
    nguoi_phu_trach_id,
    khoa_thuc_hien_id,
    to_cong_tac_id,
    is_active: true,
    nguoi_tao_id: actor,
    nguoi_giao_viec_id: actor,
  });

  await supabase.from("qlcv_fact_cong_viec_hoat_dong").insert({
    id_cong_viec: String(data.id),
    loai_hoat_dong: "PHAN_CONG",
    nguoi_thuc_hien_id: actor,
    noi_dung: "Import lô công việc",
  });

  return data;
}

/** Import công việc từ Excel/CSV — một phiếu một dòng, bắt buộc ma_nv phụ trách. */
export async function importCongViecRows(rows: Record<string, unknown>[]) {
  await verifyPermission("CONG_VIEC", "import");
  const actor = await getActorNhanSuId();
  if (!actor) {
    throw new Error("Tài khoản cần gắn hồ sơ nhân sự (mdm_nhan_su) mới import được.");
  }

  const supabase = createAdminSupabaseClient();
  const parsed = (rows || []).map((row, idx) => parseQlcvImportRow(row, idx + 2));
  const invalid = parsed.filter((r) => !r.ok);
  if (invalid.length) {
    const first = invalid[0];
    if (!first.ok) {
      throw new Error(`Dòng ${first.rowIdx}: ${first.errors.join("; ")}`);
    }
  }

  let inserted = 0;
  for (const item of parsed) {
    if (!item.ok) continue;
    await importOneRow(supabase, actor, item.row);
    inserted += 1;
  }

  revalidatePath("/quan-ly-cong-viec");
  return { inserted };
}
