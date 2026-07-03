"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { Station } from "../types/cssd.types";
import { verifyPermission } from "@/lib/server-permission";
import { resolveCssdTramId } from "../lib/cssd-tram-persist";
import { parseBatchQcJson } from "../lib/cssd-print-format";
import { getErrorMessage, STEPS } from "./cssd-action-common";
import { isCssdUnifiedBoMa, normalizeBoMa } from "@/lib/domain/cssd-bo-ma";

export async function getWaitingListByStation(station: Station) {
  const supabase = createAdminSupabaseClient();
  await verifyPermission("CSSD_WORKFLOW", "view");
  /** Trạm TK không có «chờ quét» tại trang 6 bước — vào mẻ chỉ trên /cssd-erp/batch. */
  if (station === "TIEP_NHAN") {
    // Chờ tiếp nhận: bộ danh mục chưa có quy trình active CÓ trạm (shell tram=null vẫn chờ quét).
    const { data: activeFacts } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("bo_dung_cu_id")
      .eq("is_active", true)
      .not("tram_hien_tai_id", "is", null);
    const activeBoIds = new Set((activeFacts || []).map((f) => String(f.bo_dung_cu_id)));
    
    const { data: dmBos } = await supabase.from("cssd_dm_bo_dung_cu").select("id, ma_bo, ten_bo, updated_at").eq("is_active", true);
    const availableBos = (dmBos || [])
      .filter((b) => !activeBoIds.has(String(b.id)))
      .filter((b) => isCssdUnifiedBoMa(b.ma_bo));

    return availableBos.map((b) => ({
      id: String(b.id),
      ma_vach_qr: normalizeBoMa(b.ma_bo),
      updated_at: b.updated_at || new Date().toISOString(),
      ten_bo: String(b.ten_bo || b.ma_bo || "Bộ dụng cụ"),
      bo_dung_cu_id: String(b.id),
      nguoi_tram_truoc: null,
      sdt_tram_truoc: null,
      thoi_gian_tram_truoc: null,
      tram_truoc: null,
    }));
  }

  /** Mapping trạm hiện tại → cột người xử lý & thời gian của trạm TRƯỚC đó */
  const PREV_STATION_COLS: Record<string, { nguoiCol: string; thoiGianCol: string; tramLabel: string }> = {
    LAM_SACH:  { nguoiCol: "nguoi_tiep_nhan_id",  thoiGianCol: "thoi_gian_tiep_nhan",  tramLabel: "TIEP_NHAN" },
    QC:        { nguoiCol: "nguoi_lam_sach_id",    thoiGianCol: "thoi_gian_lam_sach",    tramLabel: "LAM_SACH" },
    DONG_GOI:  { nguoiCol: "nguoi_kiem_tra_id",    thoiGianCol: "thoi_gian_qc",          tramLabel: "QC" },
    CAP_PHAT:  { nguoiCol: "nguoi_tiet_khuan_id", thoiGianCol: "thoi_gian_tiet_khuan", tramLabel: "TIET_KHUAN" },
  };

  /** Sau mẻ TK đạt QC, bộ đã ở trạm Cấp phát — chờ quét cấp phát (chưa gán ca mổ). */
  if (station === "CAP_PHAT") {
    const capTramId = await resolveCssdTramId(supabase, "CAP_PHAT");
    if (!capTramId) return [];

    const prevCols = PREV_STATION_COLS.CAP_PHAT;
    const { data, error } = await supabase
      .from("v_cssd_quy_trinh_full")
      .select(
        "id, ma_qr_quy_trinh, updated_at, bo_dung_cu_id, ten_bo, nguoi_tiet_khuan_id, thoi_gian_tiet_khuan, ma_ca_mo_id, lo_tiet_khuan_id",
      )
      .eq("tram_hien_tai_id", capTramId)
      .eq("is_active", true)
      .is("ma_ca_mo_id", null)
      .not("lo_tiet_khuan_id", "is", null)
      .order("updated_at", { ascending: true });
    if (error) throw new Error(error.message);

    const raw = (data || []) as Array<Record<string, unknown>>;
    const loIds = [...new Set(raw.map((x) => String(x.lo_tiet_khuan_id || "").trim()).filter(Boolean))];
    const passedLoIds = new Set<string>();
    const batchUnloadMap = new Map<string, string>();
    if (loIds.length) {
      const { data: los } = await supabase
        .from("cssd_fact_lo_tiet_khuan")
        .select("id, ket_qua_test, tk_qc_json")
        .in("id", loIds);
      for (const lo of los || []) {
        const lid = String((lo as { id: string }).id);
        if ((lo as { ket_qua_test?: boolean | null }).ket_qua_test === true) passedLoIds.add(lid);
        const unload = parseBatchQcJson((lo as { tk_qc_json?: unknown }).tk_qc_json).nguoiUnload;
        if (unload) batchUnloadMap.set(lid, unload);
      }
    }

    const filtered = raw.filter((x) => passedLoIds.has(String(x.lo_tiet_khuan_id || "").trim()));
    const nguoiIds = [
      ...new Set(filtered.map((x) => String(x[prevCols.nguoiCol] || "").trim()).filter(Boolean)),
    ];
    let nguoiMap = new Map<string, { ho_ten: string; sdt: string | null }>();
    if (nguoiIds.length) {
      const { data: nhanSus } = await supabase
        .from("mdm_nhan_su")
        .select("id, ho_ten, so_dien_thoai")
        .in("id", nguoiIds);
      nguoiMap = new Map(
        (nhanSus || []).map((ns: { id: string; ho_ten?: string | null; so_dien_thoai?: string | null }) => [
          String(ns.id),
          { ho_ten: String(ns.ho_ten || "Nhân viên KSNK"), sdt: ns.so_dien_thoai || null },
        ]),
      );
    }

    return filtered.map((x) => {
      const nguoiId = String(x[prevCols.nguoiCol] || "").trim();
      const nguoiInfo = nguoiId ? nguoiMap.get(nguoiId) : undefined;
      return {
        id: String(x.id),
        ma_vach_qr: String(x.ma_qr_quy_trinh || ""),
        updated_at: String(x.updated_at || ""),
        ten_bo: x.ten_bo ? String(x.ten_bo) : null,
        bo_dung_cu_id: x.bo_dung_cu_id ? String(x.bo_dung_cu_id) : null,
        nguoi_tram_truoc:
          nguoiInfo?.ho_ten ||
          batchUnloadMap.get(String(x.lo_tiet_khuan_id || "").trim()) ||
          null,
        sdt_tram_truoc: nguoiInfo?.sdt || null,
        thoi_gian_tram_truoc: (x[prevCols.thoiGianCol] as string | null) || null,
        tram_truoc: prevCols.tramLabel,
      };
    });
  }

  if (station === "TIET_KHUAN") return [];

  const idx = STEPS.indexOf(station);
  const prevStation = idx === 0 ? "CAP_PHAT" : STEPS[idx - 1];
  const prevTramId = await resolveCssdTramId(supabase, prevStation);
  if (!prevTramId) return [];

  const prevCols = PREV_STATION_COLS[station];
  // Select thêm cột người trạm trước + thời gian trạm trước
  const selectCols = prevCols
    ? `id, ma_qr_quy_trinh, updated_at, bo_dung_cu_id, ${prevCols.nguoiCol}, ${prevCols.thoiGianCol}`
    : "id, ma_qr_quy_trinh, updated_at, bo_dung_cu_id";

  const { data, error } = await supabase
    .from("cssd_fact_quy_trinh")
    .select(selectCols)
    .eq("tram_hien_tai_id", prevTramId)
    .eq("is_active", true)
    .order("updated_at", { ascending: true });
  if (error) throw new Error(error.message);

  const raw = (data || []) as Array<Record<string, any>>;

  // Resolve tên bộ dụng cụ
  const boIds = [...new Set(raw.map((x) => String(x.bo_dung_cu_id || "").trim()).filter(Boolean))];
  let boMap = new Map<string, string>();
  if (boIds.length) {
    const { data: bos } = await supabase.from("cssd_dm_bo_dung_cu").select("id, ten_bo").in("id", boIds);
    boMap = new Map((bos || []).map((b: { id: string; ten_bo?: string | null }) => [String(b.id), String(b.ten_bo || "")]));
  }

  // Resolve tên + SĐT người xử lý trạm trước
  let nguoiMap = new Map<string, { ho_ten: string; sdt: string | null }>();
  if (prevCols) {
    const nguoiIds = [...new Set(raw.map((x) => String(x[prevCols.nguoiCol] || "").trim()).filter(Boolean))];
    if (nguoiIds.length) {
      const { data: nhanSus } = await supabase
        .from("mdm_nhan_su")
        .select("id, ho_ten, so_dien_thoai")
        .in("id", nguoiIds);
      nguoiMap = new Map(
        (nhanSus || []).map((ns: { id: string; ho_ten?: string | null; so_dien_thoai?: string | null }) => [
          String(ns.id),
          { ho_ten: String(ns.ho_ten || "Nhân viên KSNK"), sdt: ns.so_dien_thoai || null },
        ]),
      );
    }
  }

  return raw.map((x) => {
    const nguoiId = prevCols ? String(x[prevCols.nguoiCol] || "").trim() : "";
    const nguoiInfo = nguoiId ? nguoiMap.get(nguoiId) : undefined;
    const thoiGianTramTruoc = prevCols ? (x[prevCols.thoiGianCol] as string | null) : null;

    return {
      id: x.id,
      ma_vach_qr: x.ma_qr_quy_trinh || "",
      updated_at: x.updated_at || "",
      ten_bo: x.bo_dung_cu_id ? boMap.get(String(x.bo_dung_cu_id)) || null : null,
      bo_dung_cu_id: x.bo_dung_cu_id ? String(x.bo_dung_cu_id) : null,
      nguoi_tram_truoc: nguoiInfo?.ho_ten || null,
      sdt_tram_truoc: nguoiInfo?.sdt || null,
      thoi_gian_tram_truoc: thoiGianTramTruoc || null,
      tram_truoc: prevCols?.tramLabel || null,
    };
  });
}

/** Giới hạn mỗi lần đọc để tránh tải toàn bộ bảng luồng vào request (AGENTS §5b). */
const MAX_CSSD_IMPORT_EXPORT_ROWS = 8000;

export async function getCSSDImportExportData() {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("CSSD_KHO_DUNGCU", "view");
    const { data, error } = await supabase
      .from("v_cssd_quy_trinh_full")
      .select("id, ma_qr_quy_trinh, ma_trang_thai_hien_tai, is_red_alert, tinh_trang, han_su_dung, lo_tiet_khuan_id, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(MAX_CSSD_IMPORT_EXPORT_ROWS);
    if (error) throw error;
    const mapped = (data || []).map(
      (x: {
        id: string;
        ma_qr_quy_trinh?: string | null;
        ma_trang_thai_hien_tai?: string | null;
        is_red_alert?: boolean | null;
        tinh_trang?: string | null;
        han_su_dung?: string | null;
        lo_tiet_khuan_id?: string | null;
        is_active?: boolean | null;
        created_at?: string | null;
        updated_at?: string | null;
      }) => ({
        id: x.id,
        ma_vach_qr: x.ma_qr_quy_trinh || "",
        trang_thai_hien_tai: x.ma_trang_thai_hien_tai || null,
        is_red_alert: x.is_red_alert === true,
        tinh_trang: x.tinh_trang || null,
        han_su_dung: x.han_su_dung || null,
        lo_tiet_khuan_id: x.lo_tiet_khuan_id || null,
        is_active: x.is_active !== false,
        created_at: x.created_at || null,
        updated_at: x.updated_at || null,
      }),
    );
    return { success: true, data: mapped };
  } catch (error: unknown) { return { success: false, error: getErrorMessage(error) }; }
}
