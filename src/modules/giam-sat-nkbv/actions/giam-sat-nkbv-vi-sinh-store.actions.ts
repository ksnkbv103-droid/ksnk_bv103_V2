"use server";

/**
 * Kho vi sinh toàn viện — CRUD + chuẩn hóa bệnh phẩm (không điều tra HAI).
 */

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyPermission } from "@/lib/server-permission";
import type { NkbvViSinhKetQua } from "../lib/nkbv-vi-sinh-template";
import type { NkbvMdroPhenotype } from "../lib/nkbv-mdro";
import {
  isNkbvSpecimenCode,
  type NkbvSpecimenCode,
} from "../lib/nkbv-specimen-canonical";
import { buildViSinhUniqueKey } from "../lib/nkbv-vi-sinh-unique-key";

export type NkbvViSinhStoreRow = {
  id: string;
  ma_xet_nghiem: string;
  ma_benh_an: string;
  ma_benh_nhan: string | null;
  ho_ten_benh_nhan: string | null;
  ngay_lay_mau: string | null;
  khoa_yeu_cau_id: string | null;
  khoa_chi_dinh_ten: string | null;
  loai_benh_pham: string | null;
  loai_benh_pham_chuan: string | null;
  tac_nhan: string | null;
  so_luong: string | null;
  ket_qua_phan_loai: string | null;
  is_mdro: boolean | null;
  mdro_phenotype: string | null;
  /** Đã phân tích / bỏ qua — từ metadata. */
  analysis_disposition: "DA_PHAN_TICH" | "BO_QUA" | "KHONG_DU_TC" | null;
};

const STORE_SELECT =
  "id, ma_xet_nghiem, ma_benh_an, ma_benh_nhan, ho_ten_benh_nhan, ngay_lay_mau, khoa_yeu_cau_id, loai_benh_pham, loai_benh_pham_chuan, tac_nhan, so_luong, ket_qua_phan_loai, is_mdro, mdro_phenotype, metadata";

function assertSpecimenCode(
  code: string | null | undefined,
): { ok: true; code: NkbvSpecimenCode | null } | { ok: false; error: string } {
  if (code == null || code === "") return { ok: true, code: null };
  const t = String(code).trim();
  if (!isNkbvSpecimenCode(t)) {
    return { ok: false, error: "Loại bệnh phẩm chuẩn không hợp lệ" };
  }
  return { ok: true, code: t };
}

/** XN đã dùng trên Hub BA: Index phiếu, đã PT, hoặc bỏ qua. */
async function isViSinhInUse(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  viSinhId: string,
): Promise<boolean> {
  const { data: indexed } = await supabase
    .from("nkbv_fact_su_kien")
    .select("id")
    .eq("is_active", true)
    .filter("verification_data->>index_vi_sinh_id", "eq", viSinhId)
    .limit(1);
  if (indexed && indexed.length > 0) return true;

  const { data: row } = await supabase
    .from("nkbv_fact_vi_sinh")
    .select("metadata")
    .eq("id", viSinhId)
    .maybeSingle();
  const meta = (row as { metadata?: Record<string, unknown> | null } | null)?.metadata;
  if (
    meta &&
    typeof meta === "object" &&
    (meta.analysis_disposition === "BO_QUA" ||
      meta.analysis_disposition === "DA_PHAN_TICH" ||
      meta.analysis_disposition === "KHONG_DU_TC")
  ) {
    return true;
  }
  return false;
}

export async function listNkbvViSinhStore(params?: {
  q?: string;
  limit?: number;
}) {
  await verifyPermission("GIAM_SAT_NKBV", "view");
  const supabase = await createServerSupabaseUserClient();
  const limit = Math.min(Math.max(params?.limit ?? 40, 1), 100);
  const q = String(params?.q || "").trim();

  let query = supabase
    .from("nkbv_fact_vi_sinh")
    .select(STORE_SELECT)
    .eq("is_active", true)
    .order("ngay_lay_mau", { ascending: false })
    .limit(limit);

  if (q) {
    query = query.or(
      `ma_xet_nghiem.ilike.%${q}%,ma_benh_an.ilike.%${q}%,tac_nhan.ilike.%${q}%,ho_ten_benh_nhan.ilike.%${q}%,loai_benh_pham.ilike.%${q}%`,
    );
  }

  const { data, error } = await query;
  if (error) return { success: false as const, error: error.message, data: [] as NkbvViSinhStoreRow[] };
  const rows: NkbvViSinhStoreRow[] = (data || []).map((raw) => {
    const r = raw as Record<string, unknown>;
    const meta =
      r.metadata && typeof r.metadata === "object"
        ? (r.metadata as Record<string, unknown>)
        : {};
    const disp = meta.analysis_disposition;
    return {
      id: String(r.id),
      ma_xet_nghiem: String(r.ma_xet_nghiem || ""),
      ma_benh_an: String(r.ma_benh_an || ""),
      ma_benh_nhan: r.ma_benh_nhan ? String(r.ma_benh_nhan) : null,
      ho_ten_benh_nhan: r.ho_ten_benh_nhan ? String(r.ho_ten_benh_nhan) : null,
      ngay_lay_mau: r.ngay_lay_mau ? String(r.ngay_lay_mau) : null,
      khoa_yeu_cau_id: r.khoa_yeu_cau_id ? String(r.khoa_yeu_cau_id) : null,
      khoa_chi_dinh_ten: null,
      loai_benh_pham: r.loai_benh_pham ? String(r.loai_benh_pham) : null,
      loai_benh_pham_chuan: r.loai_benh_pham_chuan ? String(r.loai_benh_pham_chuan) : null,
      tac_nhan: r.tac_nhan ? String(r.tac_nhan) : null,
      so_luong: r.so_luong != null ? String(r.so_luong) : null,
      ket_qua_phan_loai: r.ket_qua_phan_loai ? String(r.ket_qua_phan_loai) : null,
      is_mdro: r.is_mdro == null ? null : Boolean(r.is_mdro),
      mdro_phenotype: r.mdro_phenotype ? String(r.mdro_phenotype) : null,
      analysis_disposition:
        disp === "BO_QUA" ||
        disp === "DA_PHAN_TICH" ||
        disp === "KHONG_DU_TC"
          ? disp
          : null,
    };
  });
  return { success: true as const, data: rows };
}

export async function createNkbvViSinhStoreRecord(input: {
  ma_xet_nghiem: string;
  ma_benh_an: string;
  ma_benh_nhan?: string | null;
  ho_ten_benh_nhan?: string | null;
  ngay_lay_mau: string;
  ngay_vao_vien?: string | null;
  khoa_yeu_cau_id: string;
  loai_benh_pham: string;
  loai_benh_pham_chuan?: string | null;
  tac_nhan: string;
  so_luong?: string | null;
  ket_qua: NkbvViSinhKetQua;
  is_mdro?: boolean;
  mdro_phenotype?: NkbvMdroPhenotype | null;
}) {
  await verifyPermission("GIAM_SAT_NKBV", "edit");
  const maXn = String(input.ma_xet_nghiem || "").trim();
  const maBa = String(input.ma_benh_an || "").trim();
  const khoaId = String(input.khoa_yeu_cau_id || "").trim();
  if (!maXn) return { success: false as const, error: "Thiếu mã xét nghiệm" };
  if (!maBa) return { success: false as const, error: "Thiếu mã bệnh án" };
  if (!khoaId) return { success: false as const, error: "Thiếu khoa chỉ định" };
  if (!input.ngay_lay_mau) return { success: false as const, error: "Thiếu ngày lấy mẫu" };
  if (!String(input.loai_benh_pham || "").trim()) {
    return { success: false as const, error: "Thiếu loại bệnh phẩm (LIS / nhập tay)" };
  }

  const chuan = assertSpecimenCode(input.loai_benh_pham_chuan);
  if (!chuan.ok) return { success: false as const, error: chuan.error };

  const is_mdro = Boolean(input.is_mdro);
  if (is_mdro && !input.mdro_phenotype) {
    return { success: false as const, error: "Đa kháng cần chọn phenotype" };
  }

  const supabase = createAdminSupabaseClient();
  const { data: dup } = await supabase
    .from("nkbv_fact_vi_sinh")
    .select("id")
    .eq("ma_xet_nghiem", maXn)
    .eq("is_active", true)
    .maybeSingle();
  if (dup?.id) return { success: false as const, error: `Mã XN ${maXn} đã có trong kho` };

  const unique_key = buildViSinhUniqueKey({ ma_xet_nghiem: maXn });
  const { data, error } = await supabase
    .from("nkbv_fact_vi_sinh")
    .insert({
      ma_xet_nghiem: maXn,
      ma_benh_an: maBa,
      ma_benh_nhan: input.ma_benh_nhan ? String(input.ma_benh_nhan).trim() : maBa,
      ho_ten_benh_nhan: input.ho_ten_benh_nhan ? String(input.ho_ten_benh_nhan).trim() : null,
      ngay_lay_mau: new Date(input.ngay_lay_mau).toISOString(),
      ngay_vao_vien: input.ngay_vao_vien
        ? new Date(input.ngay_vao_vien).toISOString()
        : new Date(input.ngay_lay_mau).toISOString(),
      khoa_yeu_cau_id: khoaId,
      loai_benh_pham: String(input.loai_benh_pham).trim(),
      loai_benh_pham_chuan: chuan.code,
      tac_nhan: String(input.tac_nhan || "").trim() || "—",
      so_luong: input.so_luong ? String(input.so_luong).trim() : null,
      ket_qua_phan_loai: input.ket_qua,
      ket_qua_duong_tinh: input.ket_qua === "DUONG_TINH",
      is_mdro,
      mdro_phenotype: is_mdro ? input.mdro_phenotype || null : null,
      mdro_source: is_mdro ? "MANUAL" : null,
      is_active: true,
      metadata: { unique_key, source: "MANUAL_STORE" },
    })
    .select("id")
    .single();

  if (error) return { success: false as const, error: error.message };
  revalidatePath("/giam-sat-nkbv");
  return { success: true as const, data };
}

export async function updateNkbvViSinhStoreRecord(
  id: string,
  patch: {
    loai_benh_pham?: string;
    loai_benh_pham_chuan?: string | null;
    khoa_yeu_cau_id?: string;
    tac_nhan?: string;
    so_luong?: string | null;
    ket_qua?: NkbvViSinhKetQua;
    is_mdro?: boolean;
    mdro_phenotype?: NkbvMdroPhenotype | null;
    ma_benh_an?: string;
    ngay_lay_mau?: string;
  },
) {
  await verifyPermission("GIAM_SAT_NKBV", "edit");
  const rowId = String(id || "").trim();
  if (!rowId) return { success: false as const, error: "Thiếu id xét nghiệm" };

  if (patch.is_mdro && !patch.mdro_phenotype) {
    return { success: false as const, error: "Đa kháng cần chọn phenotype" };
  }
  if (patch.khoa_yeu_cau_id !== undefined && !String(patch.khoa_yeu_cau_id || "").trim()) {
    return { success: false as const, error: "Thiếu khoa chỉ định" };
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.khoa_yeu_cau_id !== undefined) {
    update.khoa_yeu_cau_id = String(patch.khoa_yeu_cau_id).trim();
  }
  if (patch.loai_benh_pham !== undefined) {
    update.loai_benh_pham = String(patch.loai_benh_pham).trim();
  }
  if (patch.loai_benh_pham_chuan !== undefined) {
    const chuan = assertSpecimenCode(patch.loai_benh_pham_chuan);
    if (!chuan.ok) return { success: false as const, error: chuan.error };
    update.loai_benh_pham_chuan = chuan.code;
  }
  if (patch.tac_nhan !== undefined) update.tac_nhan = String(patch.tac_nhan).trim() || "—";
  if (patch.so_luong !== undefined) update.so_luong = patch.so_luong ? String(patch.so_luong).trim() : null;
  if (patch.ket_qua !== undefined) {
    update.ket_qua_phan_loai = patch.ket_qua;
    update.ket_qua_duong_tinh = patch.ket_qua === "DUONG_TINH";
  }
  if (patch.is_mdro !== undefined) {
    update.is_mdro = Boolean(patch.is_mdro);
    update.mdro_phenotype = patch.is_mdro ? patch.mdro_phenotype || null : null;
    update.mdro_source = patch.is_mdro ? "MANUAL" : null;
  } else if (patch.mdro_phenotype !== undefined) {
    update.mdro_phenotype = patch.mdro_phenotype;
  }
  if (patch.ma_benh_an !== undefined) update.ma_benh_an = String(patch.ma_benh_an).trim();
  if (patch.ngay_lay_mau !== undefined) {
    update.ngay_lay_mau = new Date(patch.ngay_lay_mau).toISOString();
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("nkbv_fact_vi_sinh")
    .update(update)
    .eq("id", rowId)
    .select("id")
    .single();
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/giam-sat-nkbv");
  return { success: true as const, data };
}

/** Bật/tắt MDRO nhanh trên danh sách (phenotype mặc định OTHER_MDRO khi bật). */
export async function quickToggleNkbvViSinhMdro(input: {
  id: string;
  is_mdro: boolean;
  mdro_phenotype?: NkbvMdroPhenotype | null;
}) {
  await verifyPermission("GIAM_SAT_NKBV", "edit");
  const rowId = String(input.id || "").trim();
  if (!rowId) return { success: false as const, error: "Thiếu id xét nghiệm" };

  const is_mdro = Boolean(input.is_mdro);
  const phenotype: NkbvMdroPhenotype | null = is_mdro
    ? input.mdro_phenotype || "OTHER_MDRO"
    : null;

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("nkbv_fact_vi_sinh")
    .update({
      is_mdro,
      mdro_phenotype: phenotype,
      mdro_source: is_mdro ? "MANUAL" : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rowId);
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/giam-sat-nkbv");
  return { success: true as const };
}

/** Xóa cứng — chặn nếu đã dùng trên phân tích BA. */
export async function deleteNkbvViSinhStoreRecordHard(id: string) {
  await verifyPermission("GIAM_SAT_NKBV", "edit");
  const rowId = String(id || "").trim();
  if (!rowId) return { success: false as const, error: "Thiếu id xét nghiệm" };

  const supabase = createAdminSupabaseClient();
  if (await isViSinhInUse(supabase, rowId)) {
    return {
      success: false as const,
      error: "Không xóa được: xét nghiệm đã dùng trên Hub bệnh án (Index phiếu hoặc đã bỏ qua phân tích).",
    };
  }

  const { error } = await supabase.from("nkbv_fact_vi_sinh").delete().eq("id", rowId);
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/giam-sat-nkbv");
  return { success: true as const };
}
