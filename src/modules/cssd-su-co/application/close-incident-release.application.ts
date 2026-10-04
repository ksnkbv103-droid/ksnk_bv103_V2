import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertIncidentPhieuCanCloseRelease,
  buildIncidentCloseReleaseAttributePatch,
  canCloseSterilizationIncidentRelease,
} from "../domain/cssd-incident-status";

export async function executeCloseIncidentRelease(
  supabase: SupabaseClient,
  opts: {
    incidentId: string;
    lyDo: string;
    soBienBan: string;
    actorRoles: readonly string[];
    actorNhanSuId: string | null;
    actorAuthUserId: string | null;
    actorHoTen: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!canCloseSterilizationIncidentRelease(opts.actorRoles)) {
    return {
      ok: false,
      error: "Chỉ Trưởng CSSD / Hội đồng KSNK / Admin được đóng (giải phóng) sự cố tiệt khuẩn.",
    };
  }

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
  return { ok: true };
}
