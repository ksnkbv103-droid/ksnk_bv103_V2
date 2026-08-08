"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { getErrorMessage, mapFkError } from "./cssd-action-common";
import type { SuCoEquipmentRow } from "./cssd-bao-tri.types";
import { readIncidentTypeLabel } from "@/modules/cssd-su-co/domain/cssd-incident-attributes";
import { verifyCssdMaintenanceView } from "@/lib/cssd-server-gates";

/** Sự cố nhóm EQUIPMENT gần đây — để mở phiếu sửa chữa. */
export async function listSuCoEquipmentGanDayAction(): Promise<
  { success: true; data: SuCoEquipmentRow[] } | { success: false; error: string }
> {
  try {
    await verifyCssdMaintenanceView();
    const supabase = createAdminSupabaseClient();
    const { data: rows, error } = await supabase
      .from("cssd_fact_su_co")
      .select("id, mo_ta, attributes, incident_type_label, created_at")
      .eq("is_active", true)
      .eq("incident_group", "EQUIPMENT")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) return { success: false, error: mapFkError(error.message) };

    const machineIds = new Set<string>();
    const parsed = (rows || []).map((r: Record<string, unknown>) => {
      const attrs = (r.attributes || {}) as Record<string, unknown>;
      const thietBiId = String(attrs.MACHINE_ID || attrs.machine_id || "").trim() || null;
      if (thietBiId) machineIds.add(thietBiId);
      return {
        id: String(r.id),
        mo_ta: r.mo_ta != null ? String(r.mo_ta) : null,
        incident_type_label:
          r.incident_type_label != null
            ? String(r.incident_type_label)
            : readIncidentTypeLabel(attrs),
        thiet_bi_id: thietBiId,
        created_at: String(r.created_at || ""),
      };
    });

    const tbMap = new Map<string, { ma: string; ten: string }>();
    if (machineIds.size) {
      const { data: tbs } = await supabase
        .from("cssd_dm_thiet_bi")
        .select("id, ma_thiet_bi, ten_thiet_bi")
        .in("id", [...machineIds]);
      for (const tb of tbs || []) {
        tbMap.set(String((tb as { id?: string }).id), {
          ma: String((tb as { ma_thiet_bi?: string }).ma_thiet_bi || ""),
          ten: String((tb as { ten_thiet_bi?: string }).ten_thiet_bi || ""),
        });
      }
    }

    const data: SuCoEquipmentRow[] = parsed.map((r) => {
      const tb = r.thiet_bi_id ? tbMap.get(r.thiet_bi_id) : undefined;
      return {
        ...r,
        ma_thiet_bi: tb?.ma ?? null,
        ten_thiet_bi: tb?.ten ?? null,
      };
    });
    return { success: true, data };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}
