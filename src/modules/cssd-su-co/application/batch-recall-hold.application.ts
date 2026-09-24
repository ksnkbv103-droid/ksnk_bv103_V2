import type { SupabaseClient } from "@supabase/supabase-js";

export type BatchRecallMode = "QC_FAIL" | "BI_DUONG";

export type BatchRecallListItem = {
  quyTrinhId: string;
  maBo: string;
  tenBo: string;
  maLo: string;
  loId: string;
  maCaMoId?: string;
  newQuyTrinhId?: string;
};

export type BatchRecallResult = {
  incidentId: string;
  incidentCreated: boolean;
  isRedAlert: boolean;
  machineHeld: boolean;
  machineId: string | null;
  recalled: BatchRecallListItem[];
  listedUsed: BatchRecallListItem[];
};

export type BatchRecallArgs = {
  loTietKhuanId: string;
  mode: BatchRecallMode;
  actorUserId?: string | null;
  nguoiNhanSuId?: string | null;
  typeId: string;
  typeTen: string;
  moTa: string;
  ghiChu?: string | null;
  qcJson?: Record<string, unknown> | null;
  ketQuaBi?: boolean | null;
  ketQuaCi?: boolean | null;
  nhietDo?: number | null;
  apSuat?: number | null;
  thoiGianChuKy?: number | null;
  chuongTrinh?: string | null;
  coImplant?: boolean | null;
  phuongPhap?: string | null;
  trangThaiBi?: string | null;
  reporterEmail?: string | null;
  maQr?: string | null;
  quyTrinhId?: string | null;
};

function readItems(raw: unknown): BatchRecallListItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = (item || {}) as Record<string, unknown>;
    const maCaMo = String(row.ma_ca_mo_id || "").trim();
    return {
      quyTrinhId: String(row.quy_trinh_id || ""),
      maBo: String(row.ma_bo || ""),
      tenBo: String(row.ten_bo || ""),
      maLo: String(row.ma_lo || ""),
      loId: String(row.lo_id || ""),
      ...(maCaMo ? { maCaMoId: maCaMo } : {}),
      ...(row.new_quy_trinh_id ? { newQuyTrinhId: String(row.new_quy_trinh_id) } : {}),
    };
  });
}

/** Một RPC: mẻ + bộ + sự cố. Không xóa `lo_tiet_khuan_id`, không đụng chu kỳ inactive. */
export async function applyBatchRecallAndHoldMachine(
  supabase: SupabaseClient,
  args: BatchRecallArgs,
): Promise<BatchRecallResult> {
  const loId = String(args.loTietKhuanId || "").trim();
  if (!loId) throw new Error("Thiếu mẻ tiệt khuẩn để thu hồi.");

  const { data, error } = await supabase.rpc("rpc_cssd_me_thu_hoi", {
    p_me_id: loId,
    p_mode: args.mode,
    p_actor_user_id: args.actorUserId || null,
    p_nguoi_nhan_su_id: args.nguoiNhanSuId || null,
    p_type_id: args.typeId,
    p_type_ten: args.typeTen,
    p_mo_ta: args.moTa,
    p_ghi_chu: args.ghiChu ?? null,
    p_qc_json: args.qcJson ?? null,
    p_ket_qua_bi: args.ketQuaBi ?? null,
    p_ket_qua_ci: args.ketQuaCi ?? null,
    p_nhiet_do: args.nhietDo ?? null,
    p_ap_suat: args.apSuat ?? null,
    p_thoi_gian_chu_ky: args.thoiGianChuKy ?? null,
    p_chuong_trinh: args.chuongTrinh ?? null,
    p_co_implant: args.coImplant ?? null,
    p_phuong_phap: args.phuongPhap ?? null,
    p_trang_thai_bi: args.trangThaiBi ?? null,
    p_reporter_email: args.reporterEmail ?? null,
    p_ma_qr: args.maQr ?? null,
    p_quy_trinh_id: args.quyTrinhId ?? null,
  });
  if (error) throw new Error(error.message);

  const body = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const incidentId = String(body.incident_id || "").trim();
  if (!incidentId) throw new Error("Không lưu được phiếu sự cố thu hồi mẻ.");
  return {
    incidentId,
    incidentCreated: body.incident_created === true,
    isRedAlert: body.is_red_alert === true,
    machineHeld: body.machine_held === true,
    machineId: body.machine_id ? String(body.machine_id) : null,
    recalled: readItems(body.recalled),
    listedUsed: readItems(body.listed_used),
  };
}
