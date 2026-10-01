import type { SupabaseClient } from "@supabase/supabase-js";
import { buildQuyTrinhTramPatch } from "@/modules/cssd-erp/lib/cssd-tram-persist";
import { appendQuyTrinhException } from "@/modules/cssd-erp/shared/application/cssd-quy-trinh-exceptions";
import { tableHasColumn } from "@/modules/cssd-erp/shared/cssd-db-utils";
import { planCssdIncidentVoid, type VoidLedgerLine, type VoidPeer, type VoidRollbackEvent } from "../domain/cssd-incident-void";

export async function executeVoidIncidentReport(
  supabase: SupabaseClient,
  opts: {
    incidentId: string;
    actorNhanSuId: string | null;
    actorHoTen: string | null;
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
    .eq("is_active", true);
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
      .from("cssd_fact_quy_trinh")
      .select("metadata, lo_tiet_khuan_id")
      .eq("id", quyId)
      .maybeSingle();
    if (qtErr) return { ok: false, error: qtErr.message };
    const meta = (qt as { metadata?: { ngoai_le?: unknown }; lo_tiet_khuan_id?: string | null } | null)?.metadata;
    const list = Array.isArray(meta?.ngoai_le) ? meta.ngoai_le : [];
    events = list.filter((e): e is VoidRollbackEvent => Boolean(e) && typeof e === "object");
    currentLoId = String((qt as { lo_tiet_khuan_id?: string | null } | null)?.lo_tiet_khuan_id || "").trim() || null;
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
    voidedAt: new Date().toISOString(),
    actorName: opts.actorHoTen,
    actorNhanSuId: opts.actorNhanSuId,
  });
  if (!plan.ok) return plan;
  if (plan.already) return { ok: true, already: true };

  if (plan.khoDelta.length) {
    for (const delta of plan.khoDelta) {
      const { data: loai, error: loaiErr } = await supabase
        .from("cssd_dm_loai_dung_cu")
        .select("id, so_luong_kho_du_phong")
        .eq("id", delta.loaiDungCuId)
        .maybeSingle();
      if (loaiErr) return { ok: false, error: loaiErr.message };
      const cur = Number((loai as { so_luong_kho_du_phong?: number } | null)?.so_luong_kho_du_phong ?? 0);
      if (cur + delta.delta < 0) {
        return { ok: false, error: "Kho dự phòng không đủ để hoàn phiếu nhập kho." };
      }
    }
  }

  if (plan.deactivateLedgerIds.length) {
    const { error: offErr } = await supabase
      .from("cssd_fact_kho_giao_dich")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in("id", plan.deactivateLedgerIds);
    if (offErr) return { ok: false, error: offErr.message };
  }

  const appliedKho: { loaiDungCuId: string; delta: number }[] = [];
  const undoKho = async () => {
    for (const prev of appliedKho) {
      const { data: loai } = await supabase
        .from("cssd_dm_loai_dung_cu")
        .select("so_luong_kho_du_phong")
        .eq("id", prev.loaiDungCuId)
        .maybeSingle();
      const cur = Number((loai as { so_luong_kho_du_phong?: number } | null)?.so_luong_kho_du_phong ?? 0);
      await supabase
        .from("cssd_dm_loai_dung_cu")
        .update({ so_luong_kho_du_phong: cur - prev.delta, updated_at: new Date().toISOString() })
        .eq("id", prev.loaiDungCuId);
    }
    if (plan.deactivateLedgerIds.length) {
      await supabase.from("cssd_fact_kho_giao_dich").update({ is_active: true }).in("id", plan.deactivateLedgerIds);
    }
  };
  for (const delta of plan.khoDelta) {
    const { data: loai, error: loaiErr } = await supabase
      .from("cssd_dm_loai_dung_cu")
      .select("so_luong_kho_du_phong")
      .eq("id", delta.loaiDungCuId)
      .maybeSingle();
    if (loaiErr) {
      await undoKho();
      return { ok: false, error: loaiErr.message };
    }
    const cur = Number((loai as { so_luong_kho_du_phong?: number } | null)?.so_luong_kho_du_phong ?? 0);
    const next = cur + delta.delta;
    if (next < 0) {
      await undoKho();
      return { ok: false, error: "Kho dự phòng không đủ để hoàn phiếu nhập kho." };
    }
    const { error: khoErr } = await supabase
      .from("cssd_dm_loai_dung_cu")
      .update({ so_luong_kho_du_phong: next, updated_at: new Date().toISOString() })
      .eq("id", delta.loaiDungCuId);
    if (khoErr) {
      await undoKho();
      return { ok: false, error: khoErr.message };
    }
    appliedKho.push(delta);
  }

  if (plan.cycle && quyId) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (plan.cycle.restoreStation) {
      const tram = await buildQuyTrinhTramPatch(supabase, plan.cycle.restoreStation);
      Object.assign(patch, tram);
    }
    Object.assign(patch, plan.cycle.stamps);
    if (await tableHasColumn(supabase, "cssd_fact_quy_trinh", "is_red_alert")) {
      patch.is_red_alert = plan.cycle.isRedAlert;
    }
    if (plan.cycle.isDongBang != null && (await tableHasColumn(supabase, "cssd_fact_quy_trinh", "is_dong_bang"))) {
      patch.is_dong_bang = plan.cycle.isDongBang;
    }
    if (plan.cycle.restoreLoId) patch.lo_tiet_khuan_id = plan.cycle.restoreLoId;
    const { error: qErr } = await supabase.from("cssd_fact_quy_trinh").update(patch).eq("id", quyId);
    if (qErr) return { ok: false, error: qErr.message };
    await appendQuyTrinhException(
      supabase,
      quyId,
      {
        su_kien: "VO_HIEU_SU_CO",
        tu_tram: plan.cycle.restoreStation || undefined,
        ly_do: `Vô hiệu phiếu sự cố ${id.slice(0, 8)}.`,
        nguoi_thao_tac: opts.actorHoTen || "Nhân viên",
        chi_tiet: { su_co_id: id, is_red_alert: plan.cycle.isRedAlert },
      },
      { soft: true },
    );
  }

  const { error: updErr } = await supabase
    .from("cssd_fact_su_co")
    .update({
      is_active: false,
      is_red_alert: false,
      attributes: plan.attributes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("is_active", true);
  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true };
}
