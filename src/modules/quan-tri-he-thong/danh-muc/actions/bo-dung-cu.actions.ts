"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { resolveLoaiAlias, CSSD_LOAI_PHYSICAL_SELECT } from "@/lib/master-data/cssd-loai-dung-cu-map";
import { verifyPermission } from "@/lib/server-permission";
import { requireCssdCatalogMasterWrite } from "@/lib/master-data/require-cssd-catalog-master-write";
import { fetchActiveRegistryDmRows } from "@/lib/master-data/registry-select-fetch";
import { normalizeNullableFk } from "@/lib/master-data/fk-normalize";
import {
  softDeleteManyMasterRows,
  softDeleteMasterRow,
  toggleMasterStatus,
  upsertMasterRow,
} from "./master-crud-core";
import {
  buildCssdBoMa,
  cssdBoMaPrefixForKhoa,
  isCssdUnifiedBoMa,
  maxBoMaSequence,
  normalizeBoMa,
} from "@/lib/domain/cssd-bo-ma";
import { formatKhoaPickerLabel } from "@/lib/domain/khoa-display";

type BoDungCuRow = {
  id: string;
  loai_dung_cu_id?: string | null;
  khoa_su_dung_id?: string | null;
  [key: string]: unknown;
};

export async function getLoaiDungCuOptionsAction() {
  await verifyPermission("BO_DC", "view");
  const supabase = createAdminSupabaseClient();
  try {
    const rows = await fetchActiveRegistryDmRows(supabase, "LOAI_DUNG_CU");
    return {
      success: true as const,
      data: rows.map((r) => ({
        id: r.id,
        ten_danh_muc: r.ma ? `${r.ten} (${r.ma})` : r.ten,
      })),
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false as const, error: msg };
  }
}

export async function getBoDungCuRowsAction() {
  await verifyPermission("BO_DC", "view");
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("v_cssd_bo_dung_cu_summary")
    .select("*")
    .order("is_active", { ascending: false })
    .order("ma_bo", { ascending: true });
  if (error) return { success: false, error: error.message };
  const rows = (data || []) as BoDungCuRow[];

  const loaiIds = Array.from(
    new Set(
      rows
        .map((r) => String(r.loai_dung_cu_id || "").trim())
        .filter(Boolean)
    )
  );
  const khoaIds = Array.from(
    new Set(
      rows
        .map((r) => String(r.khoa_su_dung_id || "").trim())
        .filter(Boolean)
    )
  );
  if (loaiIds.length === 0 && khoaIds.length === 0) return { success: true, data: rows };

  const [loaiResult, khoaResult] = await Promise.all([
    loaiIds.length
      ? supabase
          .from("cssd_dm_loai_dung_cu")
          .select(`${CSSD_LOAI_PHYSICAL_SELECT}, specs`)
          .in("id", loaiIds)
      : Promise.resolve({ data: [], error: null }),
    khoaIds.length
      ? supabase
          .from("mdm_dm_khoa_phong")
          .select("id, ten_khoa, ma_khoa")
          .in("id", khoaIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (loaiResult.error) return { success: false, error: loaiResult.error.message };
  if (khoaResult.error) return { success: false, error: khoaResult.error.message };

  const loaiMap = new Map(
    (loaiResult.data || []).map((x) => {
      const alias = resolveLoaiAlias(x as Parameters<typeof resolveLoaiAlias>[0]);
      return [
        (x as { id: string }).id,
        {
          id: (x as { id: string }).id,
          ten_danh_muc: alias.ten_loai_dung_cu,
          ma_danh_muc: alias.ma_loai_dung_cu || null,
        },
      ] as const;
    }),
  );
  const khoaMap = new Map((khoaResult.data || []).map((x) => [x.id, x] as const));
  const enriched = rows.map((r) => ({
    ...r,
    loai_dung_cu: r.loai_dung_cu_id ? loaiMap.get(r.loai_dung_cu_id) || null : null,
    khoa_su_dung: r.khoa_su_dung_id ? khoaMap.get(r.khoa_su_dung_id) || null : null,
  }));

  return { success: true, data: enriched };
}

export async function getKhoaPhongOptionsForBoAction() {
  await verifyPermission("BO_DC", "view");
  const supabase = createAdminSupabaseClient();
  try {
    const rows = await fetchActiveRegistryDmRows(supabase, "KHOA_PHONG");
    return {
      success: true as const,
      data: rows.map((r) => ({
        id: r.id,
        ten_khoa: formatKhoaPickerLabel({ ma: r.ma, ten_khoa: r.ten }),
      })),
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false as const, error: msg };
  }
}

async function suggestNextBoMaForKhoa(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  khoaId: string,
): Promise<{ ok: true; ma_bo: string } | { ok: false; error: string }> {
  const { data: khoa, error: khoaErr } = await supabase
    .from("mdm_dm_khoa_phong")
    .select("ma_khoa")
    .eq("id", khoaId)
    .maybeSingle();
  if (khoaErr) return { ok: false, error: khoaErr.message };
  const khoaMa = normalizeBoMa(String((khoa as { ma_khoa?: string } | null)?.ma_khoa || ""));
  if (!khoaMa) return { ok: false, error: "Khoa chưa có mã (ma_khoa) — cập nhật danh mục khoa trước." };

  const prefix = cssdBoMaPrefixForKhoa(khoaMa);
  const { data: rows, error: listErr } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .select("ma_bo")
    .ilike("ma_bo", `${prefix}%`);
  if (listErr) return { ok: false, error: listErr.message };

  const nextSeq = maxBoMaSequence((rows || []).map((r) => String(r.ma_bo || "")), khoaMa) + 1;
  return { ok: true, ma_bo: buildCssdBoMa(khoaMa, nextSeq) };
}

/** Gợi ý mã bộ tiếp theo theo khoa (form thêm bộ). */
export async function suggestNextBoMaAction(khoaSuDungId: string) {
  await verifyPermission("BO_DC", "create");
  await requireCssdCatalogMasterWrite();
  const supabase = createAdminSupabaseClient();
  const khoaId = String(khoaSuDungId || "").trim();
  if (!khoaId) return { success: false as const, error: "Chọn khoa sử dụng trước." };
  const next = await suggestNextBoMaForKhoa(supabase, khoaId);
  if (!next.ok) return { success: false as const, error: next.error };
  return { success: true as const, ma_bo: next.ma_bo };
}

export async function saveBoDungCuAction(input: Record<string, unknown>) {
  const id = String(input.id || "").trim();
  await verifyPermission("BO_DC", id ? "edit" : "create");
  await requireCssdCatalogMasterWrite();
  const supabase = createAdminSupabaseClient();
  let khoaSuDungNorm: string | null = null;
  try {
    khoaSuDungNorm = await normalizeNullableFk(supabase, "mdm_dm_khoa_phong", input.khoa_su_dung_id);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
  if (String(input.khoa_su_dung_id || "").trim() && !khoaSuDungNorm) {
    return {
      success: false,
      error:
        "Khoa sử dụng không hợp lệ: id không tồn tại trong mdm_dm_khoa_phong (chạy migration M3 nếu chưa có cột khoa_su_dung_id).",
    };
  }

  let maBo = normalizeBoMa(String(input.ma_bo || ""));
  if (!id) {
    if (!maBo) {
      if (!khoaSuDungNorm) {
        return {
          success: false,
          error: "Thêm bộ mới: chọn khoa sử dụng (tự sinh mã) hoặc nhập mã bộ dạng B01.SET.01.",
        };
      }
      const next = await suggestNextBoMaForKhoa(supabase, khoaSuDungNorm);
      if (!next.ok) return { success: false, error: next.error };
      maBo = next.ma_bo;
    } else if (!isCssdUnifiedBoMa(maBo)) {
      return {
        success: false,
        error: `Mã bộ "${maBo}" chưa đúng chuẩn. Dùng dạng KHOA.SET.NN (vd. B01.SET.01) hoặc để trống để tự sinh.`,
      };
    }
  } else if (!maBo) {
    return { success: false, error: "Thiếu mã bộ." };
  } else if (!isCssdUnifiedBoMa(maBo)) {
    return {
      success: false,
      error: `Mã bộ "${maBo}" chưa đúng chuẩn. Dùng dạng KHOA.SET.NN (vd. B01.SET.01) hoặc để trống để tự sinh.`,
    };
  }

  const payload = {
    ma_bo: maBo,
    ten_bo: String(input.ten_bo || "").trim(),
    loai_dung_cu_id: String(input.loai_dung_cu_id || "").trim() || null,
    khoa_su_dung_id: khoaSuDungNorm,
    quy_cach: String(input.quy_cach || "").trim() || null,
    ghi_chu: String(input.ghi_chu || "").trim() || null,
    trang_thai: String(input.trang_thai || "ACTIVE").trim(),
    ngay_kiem_ke_gan_nhat: input.ngay_kiem_ke_gan_nhat || null,
    phan_loai_bo: String(input.phan_loai_bo || "PHAU_THUAT"),
    co_ma_dinh_danh_rieng: input.co_ma_dinh_danh_rieng !== false,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };
  if (!payload.ma_bo || !payload.ten_bo) {
    return { success: false, error: "Thiếu mã bộ hoặc tên bộ." };
  }

  const res = await upsertMasterRow("cssd_dm_bo_dung_cu", id, payload);
  if (!res.success && String(res.error || "").includes("cssd_dm_bo_dung_cu_khoa_su_dung_id_fkey")) {
    return {
      success: false,
      error:
        `${res.error} — FK khoa_su_dung_id cần trỏ mdm_dm_khoa_phong; chạy migration 20260430007_mdm_dm_khoa_phong_profile_and_bo_dung_cu_usage.sql trên Supabase.`,
    };
  }
  if (!res.success) return res;
  return { success: true as const, ma_bo: maBo };
}

export async function getBoDungCuMaBoHealthAction() {
  await verifyPermission("BO_DC", "view");
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .select("id, ma_bo, ten_bo")
    .eq("is_active", true);
  if (error) return { success: false as const, error: error.message };

  const invalid = (data || []).filter((r) => !isCssdUnifiedBoMa(String(r.ma_bo || "")));
  return {
    success: true as const,
    totalActive: (data || []).length,
    invalidCount: invalid.length,
    samples: invalid.slice(0, 8).map((r) => ({
      id: String(r.id),
      ma_bo: String(r.ma_bo || ""),
      ten_bo: String(r.ten_bo || ""),
    })),
  };
}

export async function toggleBoDungCuStatusAction(id: string, currentStatus: boolean) {
  await verifyPermission("BO_DC", "edit");
  await requireCssdCatalogMasterWrite();
  return toggleMasterStatus("cssd_dm_bo_dung_cu", id, currentStatus);
}

export async function softDeleteBoDungCuAction(id: string) {
  await verifyPermission("BO_DC", "delete");
  await requireCssdCatalogMasterWrite();
  return softDeleteMasterRow("cssd_dm_bo_dung_cu", id);
}

export async function softDeleteManyBoDungCuAction(ids: string[]) {
  await verifyPermission("BO_DC", "delete");
  await requireCssdCatalogMasterWrite();
  return softDeleteManyMasterRows("cssd_dm_bo_dung_cu", ids);
}

async function getBoAllocationListAction(boDungCuId: string) {
  await verifyPermission("BO_DC", "view");
  const bid = String(boDungCuId || "").trim();
  if (!bid) return { success: false as const, error: "Thiếu id bộ dụng cụ." };
  
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("cssd_dm_bo_phan_bo")
    .select("id, khoa_phong_id, so_luong_co_so, so_luong_hien_tai, is_active, khoa:mdm_dm_khoa_phong!khoa_phong_id(id, ten_khoa, ma_khoa)")
    .eq("bo_dung_cu_id", bid)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) return { success: false as const, error: error.message };
  const rows = (data || []).map((r) => {
    const khoa = (r as { khoa?: { ten_khoa?: string; ma_khoa?: string } | null }).khoa;
    return {
      id: String(r.id || ""),
      khoa_phong_id: String(r.khoa_phong_id || ""),
      so_luong_co_so: Number(r.so_luong_co_so || 0) || 0,
      so_luong_hien_tai: Number(r.so_luong_hien_tai || 0) || 0,
      khoa_phong: khoa
        ? { ten_khoa: String(khoa.ten_khoa || ""), ma_khoa: String(khoa.ma_khoa || "") }
        : undefined,
    };
  });
  return { success: true as const, data: rows };
}

export async function getBoDungCuAllocationsAction(boDungCuId: string) {
  return getBoAllocationListAction(boDungCuId);
}

export async function allocateProceduralSetAction(params: {
  boDungCuId: string;
  khoaPhongId: string;
  quantity: number;
}) {
  await verifyPermission("BO_DC", "edit");
  const supabase = createAdminSupabaseClient();
  const bid = String(params.boDungCuId || "").trim();
  const kid = String(params.khoaPhongId || "").trim();
  const qty = Number(params.quantity || 0);

  // Check if allocation already exists
  const { data: existing, error: fetchErr } = await supabase
    .from("cssd_dm_bo_phan_bo")
    .select("id, so_luong_co_so, so_luong_hien_tai")
    .eq("bo_dung_cu_id", bid)
    .eq("khoa_phong_id", kid)
    .eq("is_active", true)
    .maybeSingle();

  if (fetchErr) return { success: false as const, error: fetchErr.message };

  if (existing) {
    const diff = qty - Number(existing.so_luong_co_so || 0);
    const { error: updErr } = await supabase
      .from("cssd_dm_bo_phan_bo")
      .update({
        so_luong_co_so: qty,
        so_luong_hien_tai: Number(existing.so_luong_hien_tai || 0) + diff,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (updErr) return { success: false as const, error: updErr.message };
  } else {
    const { error: insErr } = await supabase
      .from("cssd_dm_bo_phan_bo")
      .insert({
        bo_dung_cu_id: bid,
        khoa_phong_id: kid,
        so_luong_co_so: qty,
        so_luong_hien_tai: qty,
        updated_at: new Date().toISOString(),
      });
    if (insErr) return { success: false as const, error: insErr.message };
  }

  return { success: true as const };
}
