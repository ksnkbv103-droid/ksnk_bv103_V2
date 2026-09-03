import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertIncidentPhieuCanConfirm,
  buildIncidentConfirmAttributePatch,
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
    .select("id, attributes, is_active")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Không tìm thấy phiếu sự cố." };
  if (data.is_active === false) return { ok: false, error: "Phiếu sự cố đã bị vô hiệu." };

  const attrs = (data.attributes as Record<string, unknown>) || {};
  const gate = assertIncidentPhieuCanConfirm(attrs);
  if (!gate.ok) return gate;

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
