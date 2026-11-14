"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import {
  parseMaHoaChatFromMachineLabel,
  resolveDmHoaChatIdFromIncidentAttrs,
  resolveMaLoFromIncidentAttrs,
} from "@/lib/domain/cssd-hoa-chat-su-co-resolve";
import { readIncidentTypeLabel } from "@/modules/cssd-su-co/domain/cssd-incident-attributes";
import { verifyPermission } from "@/lib/server-permission";
import { getErrorMessage, mapFkError } from "./cssd-action-common";

export type SuCoChemicalRow = {
  id: string;
  mo_ta: string | null;
  incident_type_label: string | null;
  dm_hoa_chat_id: string | null;
  ma_hoa_chat: string | null;
  ten_hoa_chat: string | null;
  ma_lo: string | null;
  created_at: string;
};

/** Tối đa số sự cố «chưa ghi kho» hiển thị. */
const SU_CO_CHUA_GHI_TOI_DA = 40;
/** Mỗi lần quét 50 sự cố CHEMICAL (mệnh đề IN gọn). */
const SU_CO_TRANG = 50;
/** Trần quét 20 trang = 1000 sự cố mới nhất, để không quét vô hạn khi hầu hết đã ghi kho. */
const SU_CO_TRANG_TOI_DA = 20;

/** Sự cố CHEMICAL chưa có phiếu kho liên kết — gợi ý ghi xuất. */
export async function listSuCoChemicalChuaGhiKhoAction(): Promise<
  { success: true; data: SuCoChemicalRow[] } | { success: false; error: string }
> {
  try {
    await verifyPermission("KSNK_KHO_HOACHAT", "view");
    const supabase = createAdminSupabaseClient();

    // CSSD-031: loại sự cố đã có phiếu kho TRƯỚC khi cắt 40 — quét theo trang từ sự cố mới nhất,
    // dừng khi đủ 40 sự cố chưa ghi, hết dữ liệu, hoặc chạm trần SU_CO_TRANG_TOI_DA trang.
    const pendingRows: Record<string, unknown>[] = [];
    for (let page = 0; page < SU_CO_TRANG_TOI_DA && pendingRows.length < SU_CO_CHUA_GHI_TOI_DA; page++) {
      const from = page * SU_CO_TRANG;
      const { data: rows, error } = await supabase
        .from("cssd_fact_su_co")
        .select("id, mo_ta, attributes, incident_type_label, created_at")
        .eq("is_active", true)
        .eq("incident_group", "CHEMICAL")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from + SU_CO_TRANG - 1);
      if (error) return { success: false, error: mapFkError(error.message) };
      const batch = (rows || []) as Record<string, unknown>[];
      if (!batch.length) break;

      const { data: linkedRows, error: linkedErr } = await supabase
        .from("cssd_fact_kho_hoa_chat_giao_dich")
        .select("su_co_id")
        .in("su_co_id", batch.map((r) => String(r.id || "")))
        .eq("is_active", true)
        // HC-C: phiếu xuất bị từ chối không còn liên kết — sự cố hiện lại để lập phiếu mới.
        .neq("trang_thai", "TU_CHOI");
      // Lỗi tra liên kết phải báo lỗi, không coi mọi sự cố là «chưa ghi» (dễ lập phiếu xuất trùng).
      if (linkedErr) return { success: false, error: mapFkError(linkedErr.message) };
      const linked = new Set<string>();
      for (const g of linkedRows || []) {
        const sid = (g as { su_co_id?: string }).su_co_id;
        if (sid) linked.add(String(sid));
      }
      for (const r of batch) if (!linked.has(String(r.id || ""))) pendingRows.push(r);
      if (batch.length < SU_CO_TRANG) break;
    }

    const pending = pendingRows.slice(0, SU_CO_CHUA_GHI_TOI_DA);
    const dmIds = new Set<string>();
    const maCodes = new Set<string>();
    const parsed = pending.map((r: Record<string, unknown>) => {
      const attrs = (r.attributes || {}) as Record<string, unknown>;
      const dmId = resolveDmHoaChatIdFromIncidentAttrs(attrs);
      const maLo = resolveMaLoFromIncidentAttrs(attrs);
      const machineLabel = String(attrs.MACHINE_ID ?? attrs.machine_id ?? "").trim();
      const maFromLabel = dmId ? null : parseMaHoaChatFromMachineLabel(machineLabel);
      if (dmId) dmIds.add(dmId);
      if (maFromLabel) maCodes.add(maFromLabel);
      return {
        id: String(r.id),
        mo_ta: r.mo_ta != null ? String(r.mo_ta) : null,
        incident_type_label:
          r.incident_type_label != null
            ? String(r.incident_type_label)
            : readIncidentTypeLabel(attrs),
        dm_hoa_chat_id: dmId,
        ma_from_label: maFromLabel,
        ma_lo: maLo,
        created_at: String(r.created_at || ""),
      };
    });

    const dmById = new Map<string, { ma: string; ten: string }>();
    if (dmIds.size) {
      const { data: dms } = await supabase
        .from("cssd_dm_hoa_chat")
        .select("id, ma_hoa_chat, ten_hoa_chat")
        .in("id", [...dmIds]);
      for (const d of dms || []) {
        dmById.set(String((d as { id?: string }).id), {
          ma: String((d as { ma_hoa_chat?: string }).ma_hoa_chat || ""),
          ten: String((d as { ten_hoa_chat?: string }).ten_hoa_chat || ""),
        });
      }
    }

    const dmByMa = new Map<string, { id: string; ma: string; ten: string }>();
    if (maCodes.size) {
      const { data: dms } = await supabase
        .from("cssd_dm_hoa_chat")
        .select("id, ma_hoa_chat, ten_hoa_chat")
        .in("ma_hoa_chat", [...maCodes]);
      for (const d of dms || []) {
        const ma = String((d as { ma_hoa_chat?: string }).ma_hoa_chat || "");
        dmByMa.set(ma, {
          id: String((d as { id?: string }).id),
          ma,
          ten: String((d as { ten_hoa_chat?: string }).ten_hoa_chat || ""),
        });
      }
    }

    const data: SuCoChemicalRow[] = parsed
      .map((r) => {
        let dmId = r.dm_hoa_chat_id;
        let ma = "";
        let ten = "";
        if (dmId) {
          const dm = dmById.get(dmId);
          ma = dm?.ma ?? "";
          ten = dm?.ten ?? "";
        } else if (r.ma_from_label) {
          const dm = dmByMa.get(r.ma_from_label);
          if (dm) {
            dmId = dm.id;
            ma = dm.ma;
            ten = dm.ten;
          } else {
            ma = r.ma_from_label;
          }
        }
        return {
          id: r.id,
          mo_ta: r.mo_ta,
          incident_type_label: r.incident_type_label,
          dm_hoa_chat_id: dmId,
          ma_hoa_chat: ma || null,
          ten_hoa_chat: ten || null,
          ma_lo: r.ma_lo,
          created_at: r.created_at,
        };
      })
      .filter((r) => r.dm_hoa_chat_id);

    return { success: true, data };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}
