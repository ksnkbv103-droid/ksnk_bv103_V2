"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { verifyPermission } from "@/lib/server-permission";
import { applyQlcvListScopeToQuery, resolveQlcvListScope } from "../lib/qlcv-list-scope";
import { verifyQlcvApproveCapability } from "../lib/qlcv-rbac";
import { normalizeQlcvDmFields } from "../lib/qlcv-persist-dm-fields";
import { assertQlcvHanHoanThanhNotPast, insertQlcvTaskRow } from "../lib/qlcv-create-task";
import { resolveQlcvTrangThaiMaForTask } from "../lib/qlcv-initial-trang-thai";
import { isDeXuatChoDuyet, type CongViecLike } from "../lib/qlcv-workflow-display";
import { congViecSchema, type CongViecInput } from "@/lib/validations/quan-ly-cong-viec.validations";

interface CreateDeXuatInput {
  tieu_de: string;
  mo_ta?: string;
  han_hoan_thanh?: string;
  loai_cong_viec?: "DINH_KY" | "DOT_XUAT" | "KHAN_CAP";
  muc_do_uu_tien?: "CAO" | "TRUNG_BINH" | "THAP";
}

type DeXuatRow = CongViecLike & {
  nguoi_tao?: { ho_ten?: string | null } | null;
  nguoi_phu_trach?: { ho_ten?: string | null } | null;
  to_cong_tac?: { ten_to?: string | null } | null;
};

/**
 * Gửi đề xuất — cùng SSOT insert với tạo việc (`insertQlcvTaskRow`), is_active=false.
 */
export async function createDeXuat(input: CreateDeXuatInput) {
  await verifyPermission("CONG_VIEC", "create");
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();
  if (!actorNhanSuId) {
    throw new Error("Tài khoản cần gắn hồ sơ nhân sự (mdm_nhan_su) mới gửi được đề xuất.");
  }

  const tieuDe = String(input.tieu_de ?? "").trim();
  if (!tieuDe) throw new Error("Nhập tiêu đề đề xuất.");

  assertQlcvHanHoanThanhNotPast(input.han_hoan_thanh);

  const data = await insertQlcvTaskRow(supabase, {
    tieu_de: tieuDe,
    mo_ta: input.mo_ta != null ? String(input.mo_ta).trim() || null : null,
    loai_cong_viec: input.loai_cong_viec || "DOT_XUAT",
    muc_do_uu_tien: input.muc_do_uu_tien,
    han_hoan_thanh: input.han_hoan_thanh || null,
    is_active: false,
    nguoi_tao_id: actorNhanSuId,
  });

  await supabase.from("qlcv_fact_cong_viec_hoat_dong").insert({
    id_cong_viec: String(data.id),
    loai_hoat_dong: "DE_XUAT",
    nguoi_thuc_hien_id: actorNhanSuId,
    noi_dung: "Gửi đề xuất công việc mới",
  });

  revalidatePath("/quan-ly-cong-viec");
  return data;
}

export async function pheDuyetDeXuat(id: string, duyet: boolean, ly_do?: string) {
  await verifyQlcvApproveCapability();
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();

  const { data: row, error: fetchErr } = await supabase
    .from("qlcv_fact_cong_viec")
    .select("nguoi_phu_trach_id, to_cong_tac_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !row) throw new Error("Không tìm thấy đề xuất.");

  const trang_thai_moi = duyet
    ? resolveQlcvTrangThaiMaForTask({
        isActive: true,
        nguoi_phu_trach_id: row.nguoi_phu_trach_id,
        to_cong_tac_id: row.to_cong_tac_id,
      })
    : "DA_HUY";
  const patch: Record<string, unknown> = {
    trang_thai: trang_thai_moi,
    is_active: duyet,
    updated_at: new Date().toISOString(),
  };
  if (duyet) patch.nguoi_giao_viec_id = actorNhanSuId;

  const { error } = await supabase.from("qlcv_fact_cong_viec").update(patch).eq("id", id);
  if (error) throw new Error("Không thể thực hiện thao tác phê duyệt.");

  await supabase.from("qlcv_fact_cong_viec_hoat_dong").insert({
    id_cong_viec: id,
    loai_hoat_dong: "PHE_DUYET",
    nguoi_thuc_hien_id: actorNhanSuId,
    noi_dung: duyet ? "Đã phê duyệt đề xuất" : `Đã từ chối đề xuất. Lý do: ${ly_do || "Không có"}`,
    trang_thai: trang_thai_moi,
  });

  revalidatePath("/quan-ly-cong-viec");
}

export async function pheDuyetVaCapNhatDeXuat(id: string, payload: CongViecInput) {
  await verifyQlcvApproveCapability();
  const parsed = congViecSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Dữ liệu không hợp lệ: " + parsed.error.issues.map((i) => i.message).join(", "));
  }

  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();
  const p = parsed.data;
  assertQlcvHanHoanThanhNotPast(p.han_hoan_thanh);

  const trangThai = resolveQlcvTrangThaiMaForTask({
    isActive: true,
    nguoi_phu_trach_id: p.nguoi_phu_trach_id,
    to_cong_tac_id: p.to_cong_tac_id,
  });
  const dmFk = normalizeQlcvDmFields({
    loai_cong_viec: p.loai_cong_viec,
    trang_thai: trangThai,
  });

  const { error } = await supabase
    .from("qlcv_fact_cong_viec")
    .update({
      tieu_de: p.tieu_de,
      mo_ta: p.mo_ta ?? null,
      loai_cong_viec: dmFk.loai_cong_viec,
      muc_do_uu_tien: p.muc_do_uu_tien ?? "TRUNG_BINH",
      han_hoan_thanh: p.han_hoan_thanh ?? null,
      nguoi_phu_trach_id: p.nguoi_phu_trach_id ?? null,
      khoa_thuc_hien_id: p.khoa_thuc_hien_id ?? null,
      to_cong_tac_id: p.to_cong_tac_id ?? null,
      is_active: true,
      trang_thai: dmFk.trang_thai,
      nguoi_giao_viec_id: actorNhanSuId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await supabase.from("qlcv_fact_cong_viec_hoat_dong").insert({
    id_cong_viec: id,
    loai_hoat_dong: "PHE_DUYET",
    nguoi_thuc_hien_id: actorNhanSuId,
    noi_dung: "Phê duyệt đề xuất và giao nhiệm vụ",
    trang_thai: trangThai,
  });

  revalidatePath("/quan-ly-cong-viec");
}

export async function getPendingDeXuat() {
  await verifyQlcvApproveCapability();
  const supabase = createAdminSupabaseClient();
  const scope = await resolveQlcvListScope(supabase);

  let query = supabase
    .from("v_qlcv_cong_viec_full")
    .select(
      `
      *,
      nguoi_tao:mdm_nhan_su!nguoi_tao_id(ho_ten),
      nguoi_phu_trach:mdm_nhan_su!nguoi_phu_trach_id(ho_ten),
      to_cong_tac:mdm_dm_to_cong_tac!to_cong_tac_id(ten_to)
    `,
    )
    .eq("is_active", false)
    .order("created_at", { ascending: false });

  query = applyQlcvListScopeToQuery(query, scope);

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return ((data || []) as DeXuatRow[]).filter((r) => isDeXuatChoDuyet(r));
}

export async function getMyPendingDeXuat() {
  await verifyPermission("CONG_VIEC", "view");
  const actorNhanSuId = await getActorNhanSuId();
  if (!actorNhanSuId) return [];

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select("*")
    .eq("is_active", false)
    .eq("nguoi_tao_id", actorNhanSuId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).filter((r) => isDeXuatChoDuyet(r));
}
