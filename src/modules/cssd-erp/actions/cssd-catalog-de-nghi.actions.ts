"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { revalidateCssdInventorySurfaces } from "@/lib/cssd-server-common";
import {
  buildBatchPayload,
  parseCssdCatalogDeNghiKind,
  validateDeNghiPayload,
  type CssdCatalogDeNghiItem,
  type CssdCatalogDeNghiKind,
  type CssdCatalogDeNghiRow,
  type CssdCatalogDeNghiStatus,
} from "@/lib/domain/cssd-catalog-de-nghi";

async function requireCatalogRead() {
  try {
    await verifyPermission("BO_DC", "view");
  } catch {
    try {
      await verifyPermission("DC_LE", "view");
    } catch {
      await verifyPermission("LOAI_DC", "view");
    }
  }
}

async function requireCatalogPropose() {
  try {
    await verifyPermission("BO_DC", "edit");
  } catch {
    try {
      await verifyPermission("DC_LE", "edit");
    } catch {
      await verifyPermission("LOAI_DC", "edit");
    }
  }
}

async function currentNhanSuId(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
): Promise<string | null> {
  try {
    const uc = await createServerSupabaseUserClient();
    const u = await uc.auth.getUser();
    const authId = u.data.user?.id || "";
    if (!authId) return null;
    const { data } = await supabase
      .from("mdm_nhan_su")
      .select("id")
      .eq("auth_user_id", authId)
      .maybeSingle();
    return data?.id ? String(data.id) : null;
  } catch {
    return null;
  }
}

function mapRow(r: Record<string, unknown>): CssdCatalogDeNghiRow {
  return {
    id: String(r.id),
    targetKind: String(r.target_kind) as CssdCatalogDeNghiKind,
    targetId: r.target_id ? String(r.target_id) : null,
    targetMa: String(r.target_ma || ""),
    targetTen: String(r.target_ten || ""),
    payloadBefore: (r.payload_before as Record<string, unknown>) || {},
    payloadAfter: (r.payload_after as Record<string, unknown>) || {},
    note: String(r.note || ""),
    status: String(r.status) as CssdCatalogDeNghiStatus,
    nguoiDeNghiId: r.nguoi_de_nghi_id ? String(r.nguoi_de_nghi_id) : null,
    approvedById: r.approved_by_id ? String(r.approved_by_id) : null,
    approvedAt: r.approved_at ? String(r.approved_at) : null,
    rejectReason: String(r.reject_reason || ""),
    createdAt: r.created_at ? String(r.created_at) : "",
  };
}

export async function createCatalogDeNghiAction(input: {
  targetKind: string;
  targetId?: string | null;
  targetMa?: string | null;
  targetTen?: string | null;
  payloadBefore?: Record<string, unknown>;
  payloadAfter: Record<string, unknown>;
  note?: string | null;
}) {
  try {
    await requireCatalogPropose();
    const kind = parseCssdCatalogDeNghiKind(input.targetKind);
    if (!kind) return { success: false as const, error: "Loại đề nghị không hợp lệ." };
    const err = validateDeNghiPayload(kind, input.payloadAfter || {});
    if (err) return { success: false as const, error: err };

    const supabase = createAdminSupabaseClient();
    const nguoiId = await currentNhanSuId(supabase);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("cssd_catalog_de_nghi")
      .insert({
        target_kind: kind,
        target_id: String(input.targetId || "").trim() || null,
        target_ma: String(input.targetMa || "").trim() || null,
        target_ten: String(input.targetTen || "").trim() || null,
        payload_before: input.payloadBefore || {},
        payload_after: input.payloadAfter || {},
        note: String(input.note || "").trim() || null,
        status: "PENDING",
        nguoi_de_nghi_id: nguoiId,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    revalidateCssdInventorySurfaces();
    return { success: true as const, id: String(data.id) };
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Không tạo được phiếu đề nghị.",
    };
  }
}

/** Một phiếu lô: nhiều dòng LOAI/BO/BOM. */
export async function createCatalogDeNghiBatchAction(input: {
  items: CssdCatalogDeNghiItem[];
  note?: string | null;
}) {
  try {
    await requireCatalogPropose();
    const built = buildBatchPayload(input.items || []);
    const err = validateDeNghiPayload(built.targetKind, built.payloadAfter);
    if (err) return { success: false as const, error: err };
    return createCatalogDeNghiAction({
      targetKind: built.targetKind,
      targetMa: built.targetMa,
      targetTen: built.targetTen,
      payloadBefore: built.payloadBefore,
      payloadAfter: built.payloadAfter,
      note: input.note,
    });
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Không tạo được phiếu lô.",
    };
  }
}

export async function listCatalogDeNghiAction(args?: {
  status?: CssdCatalogDeNghiStatus | "ALL";
  limit?: number;
}) {
  try {
    await requireCatalogRead();
    const supabase = createAdminSupabaseClient();
    const limit = Math.min(Math.max(Number(args?.limit) || 80, 1), 200);
    let q = supabase
      .from("cssd_catalog_de_nghi")
      .select(
        "id, target_kind, target_id, target_ma, target_ten, payload_before, payload_after, note, status, nguoi_de_nghi_id, approved_by_id, approved_at, reject_reason, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (args?.status && args.status !== "ALL") q = q.eq("status", args.status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { success: true as const, data: (data || []).map((r) => mapRow(r as Record<string, unknown>)) };
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Không tải phiếu đề nghị.",
      data: [] as CssdCatalogDeNghiRow[],
    };
  }
}

/** Prefill đủ trường master cho dialog đề nghị. */
export async function loadCatalogDeNghiPrefillAction(input: {
  kind: "LOAI" | "BO" | "BOM";
  targetId?: string | null;
  targetMa?: string | null;
}) {
  try {
    await requireCatalogRead();
    const supabase = createAdminSupabaseClient();
    const kind = input.kind;
    const id = String(input.targetId || "").trim();
    const ma = String(input.targetMa || "").trim();

    if (kind === "LOAI") {
      let q = supabase
        .from("cssd_dm_loai_dung_cu")
        .select(
          "id, ma_loai, ten_loai, mo_ta, specs, is_chiu_nhiet, phuong_phap_tiet_khuan_chi_dinh, phan_loai_spaulding, phan_loai, so_luong_kho_du_phong, is_active",
        )
        .limit(1);
      if (id) q = q.eq("id", id);
      else if (ma) q = q.ilike("ma_loai", ma);
      else return { success: false as const, error: "Thiếu id/mã loại." };
      const { data, error } = await q.maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return { success: false as const, error: "Không thấy loại." };
      const specs =
        data.specs && typeof data.specs === "object" && !Array.isArray(data.specs)
          ? (data.specs as Record<string, unknown>)
          : {};
      return {
        success: true as const,
        kind: "LOAI" as const,
        targetId: String(data.id),
        targetMa: String(data.ma_loai || ""),
        targetTen: String(data.ten_loai || ""),
        fields: {
          ma_loai: data.ma_loai,
          ten_loai: data.ten_loai,
          mo_ta: data.mo_ta,
          hinh_dang: specs.hinh_dang ?? "",
          kich_thuoc: specs.kich_thuoc ?? "",
          cong_dung: specs.cong_dung ?? "",
          is_chiu_nhiet: data.is_chiu_nhiet !== false,
          phuong_phap_tiet_khuan_chi_dinh: data.phuong_phap_tiet_khuan_chi_dinh || "STEAM_134",
          phan_loai_spaulding: data.phan_loai_spaulding || "CRITICAL",
          phan_loai: data.phan_loai || "PHAU_THUAT",
          is_active: data.is_active !== false,
        },
        khoHienTai: Number(data.so_luong_kho_du_phong || 0),
      };
    }

    if (kind === "BO") {
      let q = supabase
        .from("cssd_dm_bo_dung_cu")
        .select(
          "id, ma_bo, ten_bo, loai_dung_cu_id, khoa_su_dung_id, quy_cach, ghi_chu, trang_thai, phan_loai_bo, co_ma_dinh_danh_rieng, is_active",
        )
        .limit(1);
      if (id) q = q.eq("id", id);
      else if (ma) q = q.ilike("ma_bo", ma);
      else return { success: false as const, error: "Thiếu id/mã bộ." };
      const { data, error } = await q.maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return { success: false as const, error: "Không thấy bộ." };
      return {
        success: true as const,
        kind: "BO" as const,
        targetId: String(data.id),
        targetMa: String(data.ma_bo || ""),
        targetTen: String(data.ten_bo || ""),
        fields: {
          ma_bo: data.ma_bo,
          ten_bo: data.ten_bo,
          loai_dung_cu_id: data.loai_dung_cu_id,
          khoa_su_dung_id: data.khoa_su_dung_id,
          quy_cach: data.quy_cach,
          ghi_chu: data.ghi_chu,
          trang_thai: data.trang_thai || "ACTIVE",
          phan_loai_bo: data.phan_loai_bo || "PHAU_THUAT",
          co_ma_dinh_danh_rieng: data.co_ma_dinh_danh_rieng !== false,
          is_active: data.is_active !== false,
        },
      };
    }

    // BOM
    const boId = id;
    if (!boId) return { success: false as const, error: "Thiếu id bộ cho thành phần." };
    const { data: header, error: hErr } = await supabase
      .from("cssd_dm_bo_dung_cu")
      .select("id, ma_bo, ten_bo")
      .eq("id", boId)
      .maybeSingle();
    if (hErr) throw new Error(hErr.message);
    if (!header) return { success: false as const, error: "Không thấy bộ." };
    const { data: lines, error: lErr } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .select(
        "id, loai_dung_cu_id, ten_dung_cu_le, ten_chi_tiet, so_luong, max_suds_count, trong_luong, ghi_chu, is_active",
      )
      .eq("bo_dung_cu_id", boId)
      .eq("is_active", true);
    if (lErr) throw new Error(lErr.message);
    const loaiIds = Array.from(
      new Set((lines || []).map((r) => String(r.loai_dung_cu_id || "")).filter(Boolean)),
    );
    const loaiMap = new Map<string, { ma_loai?: string; ten_loai?: string }>();
    if (loaiIds.length) {
      const { data: loais } = await supabase
        .from("cssd_dm_loai_dung_cu")
        .select("id, ma_loai, ten_loai")
        .in("id", loaiIds);
      for (const l of loais || []) loaiMap.set(String(l.id), l);
    }
    return {
      success: true as const,
      kind: "BOM" as const,
      targetId: String(header.id),
      targetMa: String(header.ma_bo || ""),
      targetTen: String(header.ten_bo || ""),
      fields: {
        lines: (lines || []).map((r) => {
          const loaiRow = loaiMap.get(String(r.loai_dung_cu_id || ""));
          return {
            chiTietId: r.id,
            loaiDungCuId: r.loai_dung_cu_id,
            maLoai: loaiRow?.ma_loai || "",
            tenDungCuLe: r.ten_dung_cu_le || r.ten_chi_tiet || loaiRow?.ten_loai || "",
            soLuong: Number(r.so_luong || 0),
            maxSudsCount: r.max_suds_count,
            trongLuong: r.trong_luong,
            ghiChu: r.ghi_chu,
          };
        }),
      },
    };
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Không tải prefill.",
    };
  }
}

/** Gợi ý mã bộ theo khoa — NV đề nghị (không cần ADMIN master write). */
export async function suggestNextBoMaForDeNghiAction(khoaSuDungId: string) {
  try {
    await requireCatalogPropose();
    const { buildCssdBoMa, cssdBoMaPrefixForKhoa, maxBoMaSequence, normalizeBoMa } = await import(
      "@/lib/domain/cssd-bo-ma"
    );
    const supabase = createAdminSupabaseClient();
    const khoaId = String(khoaSuDungId || "").trim();
    if (!khoaId) return { success: false as const, error: "Chọn khoa sử dụng trước." };
    const { data: khoa, error: khoaErr } = await supabase
      .from("mdm_dm_khoa_phong")
      .select("ma_khoa")
      .eq("id", khoaId)
      .maybeSingle();
    if (khoaErr) throw new Error(khoaErr.message);
    const khoaMa = normalizeBoMa(String((khoa as { ma_khoa?: string } | null)?.ma_khoa || ""));
    if (!khoaMa) return { success: false as const, error: "Khoa chưa có mã (ma_khoa)." };
    const prefix = cssdBoMaPrefixForKhoa(khoaMa);
    const { data: rows, error: listErr } = await supabase
      .from("cssd_dm_bo_dung_cu")
      .select("ma_bo")
      .ilike("ma_bo", `${prefix}%`);
    if (listErr) throw new Error(listErr.message);
    const nextSeq = maxBoMaSequence((rows || []).map((r) => String(r.ma_bo || "")), khoaMa) + 1;
    return { success: true as const, ma_bo: buildCssdBoMa(khoaMa, nextSeq) };
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Không gợi ý được mã bộ.",
    };
  }
}

/** Gợi ý mã chi tiết tiếp theo trong bộ (DC-xxx lũy tiến theo bộ). */
export async function suggestNextChiTietMaForDeNghiAction(boDungCuId: string) {
  try {
    await requireCatalogPropose();
    const supabase = createAdminSupabaseClient();
    const boId = String(boDungCuId || "").trim();
    if (!boId) return { success: false as const, error: "Thiếu bộ." };
    const { data: bo } = await supabase
      .from("cssd_dm_bo_dung_cu")
      .select("ma_bo")
      .eq("id", boId)
      .maybeSingle();
    const maBo = String(bo?.ma_bo || "").trim().toUpperCase() || "BO";
    const { data: rows } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .select("ma_chi_tiet")
      .eq("bo_dung_cu_id", boId);
    let max = 0;
    const prefix = `${maBo}.DC.`;
    for (const r of rows || []) {
      const m = String(r.ma_chi_tiet || "").toUpperCase();
      if (m.startsWith(prefix)) {
        const n = parseInt(m.slice(prefix.length), 10);
        if (Number.isFinite(n)) max = Math.max(max, n);
      }
    }
    const next = max + 1;
    return {
      success: true as const,
      ma_chi_tiet: `${prefix}${String(next).padStart(2, "0")}`,
    };
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Không gợi ý được mã chi tiết.",
    };
  }
}

export async function listKhoaOptionsForDeNghiAction() {
  try {
    await requireCatalogRead();
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("mdm_dm_khoa_phong")
      .select("id, ma_khoa, ten_khoa")
      .eq("is_active", true)
      .order("ma_khoa")
      .limit(300);
    if (error) throw new Error(error.message);
    return {
      success: true as const,
      data: (data || []).map((r) => ({
        id: String(r.id),
        label: `${r.ma_khoa || "?"} — ${r.ten_khoa || ""}`,
        ma_khoa: String(r.ma_khoa || ""),
      })),
    };
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Không tải khoa.",
      data: [] as Array<{ id: string; label: string; ma_khoa: string }>,
    };
  }
}
