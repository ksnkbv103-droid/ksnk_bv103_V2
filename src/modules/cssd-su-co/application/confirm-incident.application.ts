import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertIncidentPhieuCanConfirm,
  buildIncidentConfirmAttributePatch,
  INCIDENT_SELF_CONFIRM_FORBIDDEN,
} from "../domain/cssd-incident-status";

export async function executeConfirmIncidentReport(
  supabase: SupabaseClient,
  opts: {
    incidentId: string;
    actorNhanSuId: string | null;
    actorAuthUserId: string | null;
    actorHoTen: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = String(opts.incidentId || "").trim();
  if (!id) return { ok: false, error: "Thiếu mã phiếu sự cố." };

  const { data, error } = await supabase
    .from("cssd_fact_su_co")
    .select("id, attributes, is_active, nguoi_bao_id")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Không tìm thấy phiếu sự cố." };
  if (data.is_active === false) return { ok: false, error: "Phiếu sự cố đã bị vô hiệu." };

  const attrs = (data.attributes as Record<string, unknown>) || {};
  const gate = assertIncidentPhieuCanConfirm(attrs);
  if (!gate.ok) return gate;

  const reporterAuth = String(attrs.REPORTER_AUTH_USER_ID || "").trim();
  const reporterNs = String(
    (data as { nguoi_bao_id?: string | null }).nguoi_bao_id || attrs.NGUOI_PHAT_HIEN_ID || "",
  ).trim();
  const actorAuth = String(opts.actorAuthUserId || "").trim();
  const actorNs = String(opts.actorNhanSuId || "").trim();
  if ((reporterAuth && actorAuth && reporterAuth === actorAuth) || (reporterNs && actorNs && reporterNs === actorNs)) {
    return { ok: false, error: INCIDENT_SELF_CONFIRM_FORBIDDEN };
  }

  const confirmedAt = new Date().toISOString();
  const nextAttrs = buildIncidentConfirmAttributePatch(attrs, {
    confirmedAt,
    confirmedById: opts.actorNhanSuId,
    confirmedByName: opts.actorHoTen,
    confirmedByAuthUserId: opts.actorAuthUserId,
  });

  const { error: updErr } = await supabase
    .from("cssd_fact_su_co")
    .update({ attributes: nextAttrs, updated_at: confirmedAt })
    .eq("id", id);
  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true };
}
