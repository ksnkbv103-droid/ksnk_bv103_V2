import type { SupabaseClient } from "@supabase/supabase-js";
import { appendQuyTrinhException } from "@/modules/cssd-erp/shared/application/cssd-quy-trinh-exceptions";
import {
  assertIncidentPhieuCanCloseRelease,
  buildIncidentCloseReleaseAttributePatch,
  canCloseCssdIncidentRelease,
  INCIDENT_STATUS_CONFIRMED,
  INCIDENT_STATUS_OPEN,
  readIncidentPhieuStatus,
} from "../domain/cssd-incident-status";

export async function executeCloseIncidentRelease(
  supabase: SupabaseClient,
  opts: {
    incidentId: string;
    lyDo: string;
    soBienBan: string;
    actorRoles: readonly string[];
    hasClosePermission?: boolean;
    actorNhanSuId: string | null;
    actorAuthUserId: string | null;
    actorHoTen: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!canCloseCssdIncidentRelease({ roles: opts.actorRoles, hasClosePermission: opts.hasClosePermission })) {
    return {
      ok: false,
      error: "Cần quyền đóng sự cố (BAO_SU_CO.close) hoặc vai trò Trưởng CSSD / Hội đồng KSNK / Admin.",
    };
  }

  const id = String(opts.incidentId || "").trim();
  if (!id) return { ok: false, error: "Thiếu mã phiếu sự cố." };

  const { data, error } = await supabase
    .from("cssd_fact_su_co")
    .select("id, attributes, is_active, quy_trinh_id")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Không tìm thấy phiếu sự cố." };
  if (data.is_active === false) return { ok: false, error: "Phiếu sự cố đã bị vô hiệu." };

  const attrs = (data.attributes as Record<string, unknown>) || {};
  const gate = assertIncidentPhieuCanCloseRelease(attrs, {
    lyDo: opts.lyDo,
    soBienBan: opts.soBienBan,
  });
  if (!gate.ok) return gate;

  const closedAt = new Date().toISOString();
  const nextAttrs = buildIncidentCloseReleaseAttributePatch(attrs, {
    closedAt,
    lyDo: opts.lyDo,
    soBienBan: opts.soBienBan,
    closedById: opts.actorNhanSuId,
    closedByName: opts.actorHoTen,
    closedByAuthUserId: opts.actorAuthUserId,
  });

  const { error: updErr } = await supabase
    .from("cssd_fact_su_co")
    .update({ attributes: nextAttrs, updated_at: closedAt })
    .eq("id", id);
  if (updErr) return { ok: false, error: updErr.message };

  // SC-03: đóng phiếu cuối cùng gắn chu trình → gỡ đóng băng + cờ đỏ (CSSD-02).
  const cycleId = String((data as { quy_trinh_id?: string | null }).quy_trinh_id || "").trim();
  if (cycleId) {
    const { data: openPeers } = await supabase
      .from("cssd_fact_su_co")
      .select("id, attributes, is_active")
      .eq("quy_trinh_id", cycleId)
      .eq("is_active", true);
    const blocking = (openPeers || []).filter((r) => {
      if (String((r as { id?: string }).id) === id) return false;
      const st = readIncidentPhieuStatus(
        ((r as { attributes?: Record<string, unknown> }).attributes || {}) as Record<string, unknown>,
      );
      return st === INCIDENT_STATUS_OPEN || st === INCIDENT_STATUS_CONFIRMED;
    });
    if (blocking.length === 0) {
      const actorName = String(opts.actorHoTen || "").trim() || "CSSD";
      await supabase
        .from("cssd_fact_quy_trinh")
        .update({ is_dong_bang: false, is_red_alert: false, updated_at: closedAt })
        .eq("id", cycleId);
      await appendQuyTrinhException(
        supabase,
        cycleId,
        {
          su_kien: "MO_DONG_BANG",
          ly_do: "Đóng (giải phóng) phiếu sự cố cuối — gỡ khóa an toàn",
          nguoi_thao_tac: actorName,
        },
        { soft: true },
      );
    }
  }

  return { ok: true };
}
