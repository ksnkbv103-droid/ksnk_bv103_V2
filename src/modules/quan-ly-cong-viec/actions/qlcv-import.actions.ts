"use server";

import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { assertQlcvHanHoanThanhNotPast, insertQlcvTaskRow } from "../lib/qlcv-create-task";
import { parseQlcvImportRow, type QlcvImportRow } from "../lib/qlcv-import-parse";
import { ensureQlcvKsnkAccess } from "../lib/qlcv-action-guard";
import { validateAssigneeForQlcv } from "../lib/qlcv-ksnk-server";
import { appendQlcvNhatKy } from "../lib/qlcv-nhat-ky";

async function resolveKsnkNhanSuIdByMa(
  supabase: Awaited<ReturnType<typeof ensureQlcvKsnkAccess>>["supabase"],
  ksnkKhoaId: string,
  maNv: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("mdm_nhan_su")
    .select("id, khoa_id")
    .eq("ma_nv", maNv)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error(`Không tìm thấy nhân sự KSNK ma_nv=${maNv}`);
  await validateAssigneeForQlcv(supabase, String(data.id), ksnkKhoaId);
  return String(data.id);
}

async function resolveKhoaIdByMa(
  supabase: Awaited<ReturnType<typeof ensureQlcvKsnkAccess>>["supabase"],
  maKhoa: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("mdm_dm_khoa_phong")
    .select("id")
    .eq("ma_khoa", maKhoa)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error(`Không tìm thấy khoa địa điểm ma_khoa=${maKhoa}`);
  return String(data.id);
}

async function resolveToIdByMa(
  supabase: Awaited<ReturnType<typeof ensureQlcvKsnkAccess>>["supabase"],
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
  supabase: Awaited<ReturnType<typeof ensureQlcvKsnkAccess>>["supabase"],
  ksnkKhoaId: string,
  actor: string,
  row: QlcvImportRow,
) {
  assertQlcvHanHoanThanhNotPast(row.han_hoan_thanh);
  const nguoi_phu_trach_id = await resolveKsnkNhanSuIdByMa(supabase, ksnkKhoaId, row.ma_nv);
  const to_cong_tac_id = await resolveToIdByMa(supabase, row.ma_to);
  const dia_diem_khoa_id = await resolveKhoaIdByMa(supabase, row.ma_khoa);

  const data = await insertQlcvTaskRow(supabase, {
    tieu_de: row.tieu_de,
    mo_ta: row.mo_ta,
    loai_cong_viec: row.loai_cong_viec,
    muc_do_uu_tien: row.muc_do_uu_tien,
    han_hoan_thanh: row.han_hoan_thanh,
    nguoi_phu_trach_id,
    ksnkKhoaId,
    to_cong_tac_id,
    dia_diem_khoa_id,
    is_active: true,
    nguoi_tao_id: actor,
    nguoi_giao_viec_id: actor,
  });

  await appendQlcvNhatKy(supabase, {
    congViecId: String(data.id),
    loaiHoatDong: "PHAN_CONG",
    nguoiThucHienId: actor,
    noiDung: "Import lô công việc nội bộ KSNK",
  });

  return data;
}

/** Import công việc từ Excel/CSV — nhân viên KSNK only. */
export async function importCongViecRows(rows: Record<string, unknown>[]) {
  const { supabase, ksnkKhoaId } = await ensureQlcvKsnkAccess("import");
  const actor = await getActorNhanSuId();
  if (!actor) {
    throw new Error("Tài khoản cần gắn hồ sơ nhân sự (mdm_nhan_su) mới import được.");
  }

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
    await importOneRow(supabase, ksnkKhoaId, actor, item.row);
    inserted += 1;
  }

  revalidatePath("/quan-ly-cong-viec");
  return { inserted };
}
