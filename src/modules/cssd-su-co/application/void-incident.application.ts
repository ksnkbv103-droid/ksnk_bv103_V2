import type { SupabaseClient } from "@supabase/supabase-js";
import { buildQuyTrinhTramPatch } from "@/modules/cssd-erp/lib/cssd-tram-persist";
import { tableHasColumn } from "@/modules/cssd-erp/shared/cssd-db-utils";
import { planCssdIncidentVoid, type VoidLedgerLine, type VoidPeer, type VoidRollbackEvent } from "../domain/cssd-incident-void";

export async function executeVoidIncidentReport(
  supabase: SupabaseClient,
  opts: {
    incidentId: string;
    actorNhanSuId: string | null;
    actorHoTen: string | null;
    voidReasonCode?: string | null;
    voidReasonNote?: string | null;
    allowVoidConfirmed?: boolean;
  },
): Promise<{ ok: true; already?: boolean } | { ok: false; error: string }> {
  const id = String(opts.incidentId || "").trim();
  if (!id) return { ok: false, error: "Thiếu mã phiếu sự cố." };

  const { data, error } = await supabase
    .from("cssd_fact_su_co")
    .select("id, is_active, attributes, mo_ta, ma_tram_phat_hien, quy_trinh_id")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Không tìm thấy phiếu sự cố." };

  const row = data as {
    id: string;
    is_active?: boolean | null;
    attributes?: Record<string, unknown> | null;
    mo_ta?: string | null;
    ma_tram_phat_hien?: string | null;
    quy_trinh_id?: string | null;
  };
  if (row.is_active === false) return { ok: true, already: true };
  const quyId = String(row.quy_trinh_id || "").trim();

  const { count: stockCount, error: stockErr } = await supabase
    .from("cssd_fact_kho_hoa_chat_giao_dich")
    .select("id", { count: "exact", head: true })
    .eq("su_co_id", id)
    .eq("is_active", true)
    .neq("trang_thai", "TU_CHOI");
  if (stockErr) return { ok: false, error: stockErr.message };
  if ((stockCount || 0) > 0) {
    return { ok: false, error: "Đã ghi xuất kho hóa chất theo phiếu này. Hủy phiếu kho trước." };
  }

  const { data: ledgerRows, error: ledErr } = await supabase
    .from("cssd_fact_kho_giao_dich")
    .select("id, loai_giao_dich, so_luong_thay_doi, loai_dung_cu_id, is_active")
    .eq("su_co_id", id);
  if (ledErr) return { ok: false, error: ledErr.message };
  const ledger: VoidLedgerLine[] = (ledgerRows || []).map((g) => {
    const line = g as {
      id?: string;
      loai_giao_dich?: string;
      so_luong_thay_doi?: number;
      loai_dung_cu_id?: string;
      is_active?: boolean;
    };
    return {
      id: String(line.id || ""),
      loaiGiaoDich: String(line.loai_giao_dich || ""),
      soLuongThayDoi: Number(line.so_luong_thay_doi) || 0,
      loaiDungCuId: String(line.loai_dung_cu_id || ""),
      isActive: line.is_active !== false,
    };
  });

  let peers: VoidPeer[] = [];
  let events: VoidRollbackEvent[] = [];
  let currentLoId: string | null = null;
  let currentStation: string | null = null;
  if (quyId) {
    const { data: peerRows, error: peerErr } = await supabase
      .from("cssd_fact_su_co")
      .select("id, is_active, is_red_alert, quy_trinh_id, attributes, ma_tram_phat_hien")
      .eq("quy_trinh_id", quyId)
      .eq("is_active", true)
      .neq("id", id);
    if (peerErr) return { ok: false, error: peerErr.message };
    peers = (peerRows || []) as VoidPeer[];
    const { data: qt, error: qtErr } = await supabase
      .from("v_cssd_quy_trinh_full")
      .select("lo_tiet_khuan_id, ma_trang_thai_hien_tai")
      .eq("id", quyId)
      .maybeSingle();
    if (qtErr) return { ok: false, error: qtErr.message };
    // `metadata` nằm ở bảng gốc, view v_cssd_quy_trinh_full không có cột này.
    const { data: qtMeta, error: qtMetaErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("metadata")
      .eq("id", quyId)
      .maybeSingle();
    if (qtMetaErr) return { ok: false, error: qtMetaErr.message };
    const meta = (qtMeta as { metadata?: { ngoai_le?: unknown } } | null)?.metadata;
    const list = Array.isArray(meta?.ngoai_le) ? meta.ngoai_le : [];
    events = list.filter((e): e is VoidRollbackEvent => Boolean(e) && typeof e === "object");
    currentLoId = String((qt as { lo_tiet_khuan_id?: string | null } | null)?.lo_tiet_khuan_id || "").trim() || null;
    currentStation =
      String((qt as { ma_trang_thai_hien_tai?: string | null } | null)?.ma_trang_thai_hien_tai || "").trim() ||
      null;
  }

  const plan = planCssdIncidentVoid({
    ticket: {
      id: String(row.id),
      isActive: true,
      attributes: row.attributes || {},
      moTa: String(row.mo_ta || ""),
      detectionStation: String(row.ma_tram_phat_hien || ""),
      quyTrinhId: quyId || null,
    },
    peers,
    ledger,
    rollbackEvents: events,
    currentLoId,
    currentStation,
    voidedAt: new Date().toISOString(),
    actorName: opts.actorHoTen,
    actorNhanSuId: opts.actorNhanSuId,
    voidReasonCode: opts.voidReasonCode,
    voidReasonNote: opts.voidReasonNote,
    allowVoidConfirmed: opts.allowVoidConfirmed,
  });
  if (!plan.ok) return plan;
  if (plan.already) return { ok: true, already: true };

  let quyTrinhPatch: Record<string, unknown> | null = null;
  let event: Record<string, unknown> | null = null;
  if (plan.cycle && quyId) {
    const patch: Record<string, unknown> = {};
    if (plan.cycle.restoreStation) {
      Object.assign(patch, await buildQuyTrinhTramPatch(supabase, plan.cycle.restoreStation));
    }
    Object.assign(patch, plan.cycle.stamps);
    if (await tableHasColumn(supabase, "cssd_fact_quy_trinh", "is_red_alert")) {
      patch.is_red_alert = plan.cycle.isRedAlert;
    }
    if (plan.cycle.isDongBang != null && (await tableHasColumn(supabase, "cssd_fact_quy_trinh", "is_dong_bang"))) {
      patch.is_dong_bang = plan.cycle.isDongBang;
    }
    if (plan.cycle.restoreLoId) patch.lo_tiet_khuan_id = plan.cycle.restoreLoId;
    quyTrinhPatch = patch;
    event = {
      su_kien: "VO_HIEU_SU_CO",
      thoi_gian: new Date().toISOString(),
      nguoi_thao_tac: opts.actorHoTen || "Nhân viên",
      ly_do: `Vô hiệu phiếu sự cố ${id.slice(0, 8)}.`,
      chi_tiet: { su_co_id: id, is_red_alert: plan.cycle.isRedAlert },
      ...(plan.cycle.restoreStation ? { tu_tram: plan.cycle.restoreStation } : {}),
    };
  }

  // Một transaction: tắt sổ + hoàn kho dự phòng + chu trình + đóng phiếu (khóa dòng, không để âm kho).
  const { data: rpcData, error: rpcErr } = await supabase.rpc("rpc_cssd_apply_incident_void", {
    p_su_co_id: id,
    p_attributes: plan.attributes,
    p_deactivate_ledger_ids: plan.deactivateLedgerIds,
    p_kho_delta: plan.khoDelta,
    p_quy_trinh_id: plan.cycle && quyId ? quyId : null,
    p_quy_trinh_patch: quyTrinhPatch,
    p_event: event,
  });
  if (rpcErr) return { ok: false, error: rpcErr.message };
  if ((rpcData as { already?: boolean } | null)?.already) return { ok: true, already: true };
  return { ok: true };
}
