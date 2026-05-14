"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { verifyPermission } from "@/lib/server-permission";
import { QLCV_FACT_CONG_VIEC_INSERT_LOAI_PHAM_VI } from "../lib/qlcv-fact-cong-viec-insert-scope";
import { congViecSchema, type CongViecInput } from "@/lib/validations/quan-ly-cong-viec.validations";

interface CreateDeXuatInput {
  tieu_de: string;
  mo_ta?: string;
  han_hoan_thanh?: string;
  loai_cong_viec?: "DINH_KY" | "DOT_XUAT" | "KHAN_CAP";
  muc_do_uu_tien?: "CAO" | "TRUNG_BINH" | "THAP";
}

/**
 * Gửi đề xuất công việc mới (chỉ nội bộ Khoa)
 */
export async function createDeXuat(input: CreateDeXuatInput) {
  await verifyPermission("CONG_VIEC", "create");
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();
  if (!actorNhanSuId) {
    throw new Error("Tài khoản cần gắn hồ sơ nhân sự (mdm_nhan_su) mới gửi được đề xuất.");
  }

  const tieuDe = String(input.tieu_de ?? "").trim();
  if (!tieuDe) {
    throw new Error("Nhập tiêu đề đề xuất.");
  }
  const moTaRaw = input.mo_ta != null ? String(input.mo_ta).trim() : "";
  const hanRaw = input.han_hoan_thanh != null ? String(input.han_hoan_thanh).trim() : "";

  const { data, error } = await supabase
    .from("fact_cong_viec")
    .insert({
      ...QLCV_FACT_CONG_VIEC_INSERT_LOAI_PHAM_VI,
      tieu_de: tieuDe,
      mo_ta: moTaRaw === "" ? null : moTaRaw,
      loai_cong_viec: input.loai_cong_viec || "DOT_XUAT",
      muc_do_uu_tien: input.muc_do_uu_tien || "TRUNG_BINH",
      han_hoan_thanh: hanRaw === "" ? null : hanRaw,
      trang_thai: "DE_XUAT_CHO_DUYET",
      phan_tram_hoan_thanh: 0,
      is_active: false,
      nguoi_tao_id: actorNhanSuId,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Lỗi gửi đề xuất:", error);
    throw new Error("Không thể gửi đề xuất công việc: " + error.message);
  }

  await supabase.from("fact_cong_viec_hoat_dong").insert({
    id_cong_viec: data.id,
    loai_hoat_dong: "DE_XUAT",
    nguoi_thuc_hien_id: actorNhanSuId,
    noi_dung: "Gửi đề xuất công việc mới",
  });

  revalidatePath("/quan-ly-cong-viec");
  return data;
}

/**
 * Phê duyệt / từ chối đề xuất (chỉ trạng thái — không cập nhật form).
 */
export async function pheDuyetDeXuat(id: string, duyet: boolean, ly_do?: string) {
  await verifyPermission("CONG_VIEC", "edit");
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();

  const { data: row, error: fetchErr } = await supabase
    .from("fact_cong_viec")
    .select("nguoi_phu_trach_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !row) {
    throw new Error("Không tìm thấy đề xuất.");
  }

  const trang_thai_moi = duyet ? "CHUA_BAT_DAU" : "DA_HUY";

  const patch: Record<string, unknown> = {
    trang_thai: trang_thai_moi,
    is_active: duyet,
    updated_at: new Date().toISOString(),
  };
  if (duyet) {
    patch.nguoi_giao_viec_id = actorNhanSuId;
  }

  const { error } = await supabase.from("fact_cong_viec").update(patch).eq("id", id);

  if (error) {
    console.error("Lỗi phê duyệt:", error);
    throw new Error("Không thể thực hiện thao tác phê duyệt.");
  }

  await supabase.from("fact_cong_viec_hoat_dong").insert({
    id_cong_viec: id,
    loai_hoat_dong: "PHE_DUYET",
    nguoi_thuc_hien_id: actorNhanSuId,
    noi_dung: duyet ? "Đã phê duyệt đề xuất" : `Đã từ chối đề xuất. Lý do: ${ly_do || "Không có"}`,
    trang_thai: trang_thai_moi,
  });

  revalidatePath("/quan-ly-cong-viec");
}

/**
 * Sau khi lãnh đạo chỉnh sửa form đề xuất: lưu nội dung + kích hoạt + giao (cổng phê duyệt + giao).
 */
export async function pheDuyetVaCapNhatDeXuat(id: string, payload: CongViecInput) {
  await verifyPermission("CONG_VIEC", "edit");
  const parsed = congViecSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Dữ liệu không hợp lệ: " + parsed.error.issues.map((i) => i.message).join(", "));
  }

  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();
  const p = parsed.data;

  const trangThai = "CHUA_BAT_DAU";

  const { error } = await supabase
    .from("fact_cong_viec")
    .update({
      tieu_de: p.tieu_de,
      mo_ta: p.mo_ta ?? null,
      loai_cong_viec: p.loai_cong_viec,
      muc_do_uu_tien: p.muc_do_uu_tien ?? "TRUNG_BINH",
      han_hoan_thanh: p.han_hoan_thanh ?? null,
      nguoi_phu_trach_id: p.nguoi_phu_trach_id ?? null,
      khoa_thuc_hien_id: p.khoa_thuc_hien_id ?? null,
      to_cong_tac_id: p.to_cong_tac_id ?? null,
      is_active: true,
      trang_thai: trangThai,
      nguoi_giao_viec_id: actorNhanSuId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await supabase.from("fact_cong_viec_hoat_dong").insert({
    id_cong_viec: id,
    loai_hoat_dong: "PHE_DUYET",
    nguoi_thuc_hien_id: actorNhanSuId,
    noi_dung: "Phê duyệt đề xuất và giao nhiệm vụ",
    trang_thai: trangThai,
  });

  revalidatePath("/quan-ly-cong-viec");
}

/**
 * Danh sách đề xuất chờ phê duyệt
 */
export async function getPendingDeXuat() {
  await verifyPermission("CONG_VIEC", "edit");
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("fact_cong_viec")
    .select(
      `
      *,
      nguoi_tao:mdm_nhan_su!nguoi_tao_id(ho_ten),
      nguoi_phu_trach:mdm_nhan_su!nguoi_phu_trach_id(ho_ten),
      to_cong_tac:dm_to_cong_tac!to_cong_tac_id(ten_to)
    `
    )
    .eq("is_active", false)
    .neq("trang_thai", "DA_HUY")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Lỗi tải đề xuất:", error);
    throw new Error("Không thể tải danh sách đề xuất");
  }

  return (data || []).map((item: any) => ({
    ...item,
    nguoi_tao_ten: item.nguoi_tao?.ho_ten || "Chưa xác định",
    nguoi_phu_trach_ten: item.nguoi_phu_trach?.ho_ten ?? undefined,
    to_cong_tac_ten: item.to_cong_tac?.ten_to ?? undefined,
  }));
}
