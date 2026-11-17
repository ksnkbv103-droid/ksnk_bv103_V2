"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyAnyPermission } from "@/lib/server-permission";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { getErrorMessage, revalidateCssdInventorySurfaces } from "./cssd-action-common";
import { buildSetReconcileLedgerLines } from "@/modules/cssd-su-co/application/set-reconcile-ledger.application";
import { releaseSetReconcileDraftAction } from "@/modules/cssd-su-co/actions/set-reconcile-draft.actions";
import type { SetReconcileLineInput } from "@/lib/domain/cssd-set-reconcile";
import { CSSD_LOAI_PHYSICAL_SELECT, resolveLoaiAlias } from "@/lib/master-data/cssd-loai-dung-cu-map";

const NO_NHAN_SU_ERROR = "Tài khoản chưa gắn hồ sơ nhân sự, không thể ghi sổ CSSD.";

async function verifyCanManageLifecycle(): Promise<void> {
  // Chỉ quyền ghi; không fallback CSSD_KHO_DUNGCU:view.
  await verifyAnyPermission([
    { moduleKey: "CSSD_KHO_DUNGCU", action: "edit" },
    { moduleKey: "CSSD_KHO_DUNGCU", action: "create" },
    { moduleKey: "CSSD_KHO_DUNGCU", action: "import" },
    { moduleKey: "CSSD_WORKFLOW", action: "edit" },
  ]);
}

/** Tra cứu lịch sử: người chỉ có quyền xem vẫn đọc được (không ghi). */
async function verifyCanReadLifecycle(): Promise<void> {
  await verifyAnyPermission([
    { moduleKey: "CSSD_KHO_DUNGCU", action: "view" },
    { moduleKey: "CSSD_KHO_DUNGCU", action: "edit" },
    { moduleKey: "CSSD_KHO_DUNGCU", action: "create" },
    { moduleKey: "CSSD_KHO_DUNGCU", action: "import" },
    { moduleKey: "CSSD_WORKFLOW", action: "edit" },
  ]);
}

export type ApplyTransferInput = {
  boDungCuId: string;
  draftIncidentId?: string | null;
  maBo: string;
  tenBo: string;
  lines: SetReconcileLineInput[];
  note?: string;
};

/**
 * Luân chuyển dụng cụ (Kho ↔ Bộ hoặc Bộ ↔ Bộ) ĐỘC LẬP khỏi bảng sự cố (BIZ-03).
 * Trực tiếp cập nhật sổ kho cssd_fact_kho_giao_dich, không sinh dòng cssd_fact_su_co.
 */
export async function applyInstrumentTransferAction(payload: ApplyTransferInput): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    await verifyCanManageLifecycle();
    const supabase = createAdminSupabaseClient();
    const actorNhanSuId = await getActorNhanSuId();
    if (!actorNhanSuId) return { success: false, error: NO_NHAN_SU_ERROR };

    if (!payload.lines || payload.lines.length === 0) {
      return { success: false, error: "Chưa có danh sách dụng cụ luân chuyển." };
    }

    const ledgerLines = buildSetReconcileLedgerLines(
      {
        boDungCuId: payload.boDungCuId,
        maQr: payload.maBo,
        headerNote: payload.note || "Điều chuyển số lượng dụng cụ",
        lines: payload.lines,
        door: "move",
      },
      { includeEngraved: true },
    );

    if (ledgerLines.length === 0) {
      return { success: false, error: "Không có dòng luân chuyển hợp lệ cần xử lý." };
    }

    const { data: res, error } = await supabase.rpc("rpc_cssd_apply_instrument_lines", {
      p_lines: ledgerLines,
      p_su_co_id: null, // Không gắn vào bảng sự cố
      p_bo_dung_cu_id: payload.boDungCuId || null,
      p_touch_ngay_kiem_ke: false,
      p_attributes: null,
      p_nguoi_thuc_hien_id: actorNhanSuId || null,
    });

    if (error) throw error;
    if (res && typeof res === "object" && "success" in res && !(res as { success: boolean }).success) {
      throw new Error((res as { message?: string }).message || "Lỗi khi ghi sổ luân chuyển.");
    }

    if (payload.draftIncidentId) {
      await releaseSetReconcileDraftAction(payload.draftIncidentId).catch(() => {});
    }

    revalidateCssdInventorySurfaces();
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

export type ReceiveNewInstrumentsInput = {
  loaiDungCuId: string;
  soLuong: number;
  nguonCap?: string;
  soChungTu?: string;
  ghiChu?: string;
};

/**
 * Tiếp nhận nhập kho dụng cụ mới từ Phòng Trang bị / Vật tư y tế (BIZ-04.1).
 */
export async function receiveNewInstrumentsAction(payload: ReceiveNewInstrumentsInput): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    await verifyCanManageLifecycle();
    const supabase = createAdminSupabaseClient();
    const actorNhanSuId = await getActorNhanSuId();
    if (!actorNhanSuId) return { success: false, error: NO_NHAN_SU_ERROR };

    const loaiId = String(payload.loaiDungCuId || "").trim();
    if (!loaiId) return { success: false, error: "Vui lòng chọn loại dụng cụ." };

    const qty = Math.floor(Number(payload.soLuong) || 0);
    if (qty <= 0) return { success: false, error: "Số lượng nhập mới phải lớn hơn 0." };

    const ct = String(payload.soChungTu || "").trim();
    const nguon = String(payload.nguonCap || "").trim();
    const note = String(payload.ghiChu || "").trim();

    const segments: string[] = ["[NHẬP MỚI VẬT TƯ/TRANG BỊ]"];
    if (ct) segments.push(`Số CT: ${ct}`);
    if (nguon) segments.push(`Nguồn: ${nguon}`);
    if (note) segments.push(note);
    const ghiChu = segments.join(" · ");

    const { data: res, error } = await supabase.rpc("rpc_cssd_apply_instrument_ledger", {
      p_su_co_id: null,
      p_loai_dung_cu_id: loaiId,
      p_bo_dung_cu_id: null,
      p_quy_trinh_id: null,
      p_loai_giao_dich: "NHAP_KHO",
      p_so_luong_thay_doi: qty,
      p_ghi_chu: ghiChu,
      p_bo_dung_cu_id_den: null,
      p_nguoi_thuc_hien_id: actorNhanSuId || null,
    });

    if (error) throw error;
    if (res && typeof res === "object" && "success" in res && !(res as { success: boolean }).success) {
      throw new Error((res as { message?: string }).message || "Lỗi khi nhập kho.");
    }

    revalidateCssdInventorySurfaces();
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

export type DecommissionInstrumentsInput = {
  sourceKind: "KHO_LE" | "BO_DUNG_CU";
  loaiDungCuId: string;
  boDungCuId?: string | null;
  soLuong: number;
  lyDoLoaiBien:
    | "HAO_MON_CO_HOC"
    | "RI_SET_MOI_KIM_LOAI"
    | "HET_TUOI_THO_TIET_KHUAN"
    | "KHONG_CON_PHU_HOP_CHUYEN_MON"
    | "KHAC";
  soBienBan?: string;
  nguoiGiamDinh?: string;
  ghiChu?: string;
};

const LY_DO_LOAI_BIEN_LABELS: Record<DecommissionInstrumentsInput["lyDoLoaiBien"], string> = {
  HAO_MON_CO_HOC: "Hao mòn cơ học / Cùn mép sau chu kỳ sử dụng",
  RI_SET_MOI_KIM_LOAI: "Rỉ sét / Mỏi nứt kim loại do nhiệt ẩm",
  HET_TUOI_THO_TIET_KHUAN: "Hết tuổi thọ tiệt khuẩn theo quy chuẩn",
  KHONG_CON_PHU_HOP_CHUYEN_MON: "Thay đổi kỹ thuật ngoại khoa / Thay thế bộ",
  KHAC: "Lý do hao mòn kỹ thuật khác",
};

/**
 * Biên bản loại biên / thanh lý dụng cụ hao mòn kỹ thuật (BIZ-04.2).
 * Phân biệt rõ rệt với làm hỏng / mất do lỗi con người, không sinh dòng sự cố.
 */
export async function decommissionInstrumentsAction(payload: DecommissionInstrumentsInput): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    await verifyCanManageLifecycle();
    const supabase = createAdminSupabaseClient();
    const actorNhanSuId = await getActorNhanSuId();
    if (!actorNhanSuId) return { success: false, error: NO_NHAN_SU_ERROR };

    const loaiId = String(payload.loaiDungCuId || "").trim();
    if (!loaiId) return { success: false, error: "Vui lòng chọn loại dụng cụ." };

    const qty = Math.floor(Number(payload.soLuong) || 0);
    if (qty <= 0) return { success: false, error: "Số lượng thanh lý/loại biên phải lớn hơn 0." };

    const lyDoText = LY_DO_LOAI_BIEN_LABELS[payload.lyDoLoaiBien] || "Hao mòn kỹ thuật";
    const bb = String(payload.soBienBan || "").trim();
    const gd = String(payload.nguoiGiamDinh || "").trim();
    const note = String(payload.ghiChu || "").trim();

    const segments: string[] = [
      payload.sourceKind === "KHO_LE"
        ? `[LOẠI BIÊN HAO MÒN - KHO LẺ] ${lyDoText}`
        : `[LOẠI BIÊN HAO MÒN - TRONG BỘ] ${lyDoText}`,
    ];
    if (bb) segments.push(`Số BB: ${bb}`);
    if (gd) segments.push(`Giám định: ${gd}`);
    if (note) segments.push(note);
    const ghiChu = segments.join(" · ");

    if (payload.sourceKind === "KHO_LE") {
      // Một RPC atomic: trừ tồn có điều kiện + ghi sổ giao dịch (không lost update, không âm tồn).
      const { data: res, error } = await supabase.rpc("rpc_cssd_decommission_kho_le", {
        p_loai_dung_cu_id: loaiId,
        p_so_luong: qty,
        p_ghi_chu: ghiChu,
        p_nguoi_thuc_hien_id: actorNhanSuId || null,
      });
      if (error) throw new Error(`Lỗi hệ thống: ${error.message}`);
      const r = res as { success?: boolean; message?: string } | null;
      if (!r?.success) {
        return { success: false, error: r?.message || "Không loại biên được khỏi kho lẻ." };
      }
    } else {
      const boId = String(payload.boDungCuId || "").trim();
      if (!boId) return { success: false, error: "Vui lòng chọn bộ dụng cụ nguồn." };

      const { data: res, error } = await supabase.rpc("rpc_cssd_apply_instrument_ledger", {
        p_su_co_id: null,
        p_loai_dung_cu_id: loaiId,
        p_bo_dung_cu_id: boId,
        p_quy_trinh_id: null,
        p_loai_giao_dich: "BAO_HONG",
        p_so_luong_thay_doi: -qty,
        p_ghi_chu: ghiChu,
        p_bo_dung_cu_id_den: null,
        p_nguoi_thuc_hien_id: actorNhanSuId || null,
      });

      if (error) throw error;
      if (res && typeof res === "object" && "success" in res && !(res as { success: boolean }).success) {
        throw new Error((res as { message?: string }).message || "Lỗi khi loại biên trong bộ.");
      }
    }

    revalidateCssdInventorySurfaces();
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

export type LifecycleHistoryItem = {
  id: string;
  loai_giao_dich: string;
  badge_label: string;
  badge_variant: "emerald" | "sky" | "indigo" | "amber" | "slate" | "rose" | "red";
  so_luong_thay_doi: number;
  ghi_chu: string | null;
  created_at: string;
  ten_loai: string;
  ma_loai: string;
  ten_bo: string | null;
  ma_bo: string | null;
};

/**
 * Tra cứu lịch sử biến động vòng đời dụng cụ (Nhập mới, Luân chuyển, Loại biên, Báo hỏng/mất).
 */
export async function fetchInstrumentLifecycleHistoryAction(params?: {
  loaiGiaoDich?: string;
  loaiDungCuId?: string;
  boDungCuId?: string;
  limit?: number;
}): Promise<{ success: true; data: LifecycleHistoryItem[] } | { success: false; error: string }> {
  try {
    await verifyCanReadLifecycle();
    const supabase = createAdminSupabaseClient();
    const limit = Math.min(Math.max(10, params?.limit || 50), 200);

    let query = supabase
      .from("cssd_fact_kho_giao_dich")
      .select("id, loai_dung_cu_id, bo_dung_cu_id, loai_giao_dich, so_luong_thay_doi, ghi_chu, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (params?.loaiGiaoDich && params.loaiGiaoDich !== "ALL") {
      query = query.eq("loai_giao_dich", params.loaiGiaoDich);
    }
    if (params?.loaiDungCuId) {
      query = query.eq("loai_dung_cu_id", params.loaiDungCuId);
    }
    if (params?.boDungCuId) {
      query = query.eq("bo_dung_cu_id", params.boDungCuId);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const list = rows || [];
    const boIds = [...new Set(list.map((r) => String(r.bo_dung_cu_id || "").trim()).filter(Boolean))];
    const loaiIds = [...new Set(list.map((r) => String(r.loai_dung_cu_id || "").trim()).filter(Boolean))];

    const [boRes, loaiRes] = await Promise.all([
      boIds.length
        ? supabase.from("cssd_dm_bo_dung_cu").select("id, ma_bo, ten_bo").in("id", boIds)
        : Promise.resolve({ data: [] }),
      loaiIds.length
        ? supabase.from("cssd_dm_loai_dung_cu").select(`${CSSD_LOAI_PHYSICAL_SELECT}, specs`).in("id", loaiIds)
        : Promise.resolve({ data: [] }),
    ]);

    const boMap = new Map(
      (boRes.data || []).map((b: { id: string; ma_bo?: string | null; ten_bo?: string | null }) => [
        String(b.id),
        { ma_bo: String(b.ma_bo || ""), ten_bo: String(b.ten_bo || "") },
      ]),
    );

    const loaiMap = new Map(
      (loaiRes.data || []).map((l) => {
        const alias = resolveLoaiAlias(l as Parameters<typeof resolveLoaiAlias>[0]);
        return [String((l as { id: string }).id), alias] as const;
      }),
    );

    const items: LifecycleHistoryItem[] = list.map((r) => {
      const boId = String(r.bo_dung_cu_id || "").trim();
      const loaiId = String(r.loai_dung_cu_id || "").trim();
      const bo = boId ? boMap.get(boId) ?? null : null;
      const loai = loaiId ? loaiMap.get(loaiId) ?? null : null;

      const note = String(r.ghi_chu || "");
      let badge_label = "Biến động";
      let badge_variant: LifecycleHistoryItem["badge_variant"] = "slate";

      if (r.loai_giao_dich === "NHAP_KHO") {
        if (!boId) {
          badge_label = "Nhập mới từ VT/TB";
          badge_variant = "emerald";
        } else {
          badge_label = "Trả về kho lẻ";
          badge_variant = "sky";
        }
      } else if (r.loai_giao_dich === "BO_SUNG") {
        badge_label = "Bổ sung vào bộ";
        badge_variant = "indigo";
      } else if (r.loai_giao_dich === "DIEU_CHUYEN") {
        badge_label = "Điều chuyển bộ ↔ bộ";
        badge_variant = "amber";
      } else if (r.loai_giao_dich === "BAO_HONG") {
        if (note.includes("[LOẠI BIÊN")) {
          badge_label = "Loại biên hao mòn";
          badge_variant = "slate";
        } else {
          badge_label = "Báo hỏng sự cố";
          badge_variant = "rose";
        }
      } else if (r.loai_giao_dich === "BAO_MAT") {
        badge_label = "Báo mất sự cố";
        badge_variant = "red";
      }

      return {
        id: String(r.id),
        loai_giao_dich: String(r.loai_giao_dich),
        badge_label,
        badge_variant,
        so_luong_thay_doi: Number(r.so_luong_thay_doi) || 0,
        ghi_chu: r.ghi_chu ? String(r.ghi_chu) : null,
        created_at: String(r.created_at),
        ten_loai: loai?.ten_loai_dung_cu || "Chưa xác định",
        ma_loai: loai?.ma_loai_dung_cu || "—",
        ten_bo: bo?.ten_bo || null,
        ma_bo: bo?.ma_bo || null,
      };
    });

    return { success: true, data: items };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}
