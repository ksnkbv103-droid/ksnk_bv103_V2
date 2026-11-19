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

type ParsedSuCo = {
  id: string;
  mo_ta: string | null;
  incident_type_label: string | null;
  dm_hoa_chat_id: string | null;
  ma_from_label: string | null;
  ma_lo: string | null;
  created_at: string;
};
type DanhMucCache = {
  byId: Map<string, { ma: string; ten: string }>;
  byMa: Map<string, { id: string; ma: string; ten: string }>;
};
type DmRow = { id?: string; ma_hoa_chat?: string; ten_hoa_chat?: string };

function parseSuCo(r: Record<string, unknown>): ParsedSuCo {
  const attrs = (r.attributes || {}) as Record<string, unknown>;
  const dmId = resolveDmHoaChatIdFromIncidentAttrs(attrs);
  const machineLabel = String(attrs.MACHINE_ID ?? attrs.machine_id ?? "").trim();
  return {
    id: String(r.id),
    mo_ta: r.mo_ta != null ? String(r.mo_ta) : null,
    incident_type_label: r.incident_type_label != null ? String(r.incident_type_label) : readIncidentTypeLabel(attrs),
    dm_hoa_chat_id: dmId,
    ma_from_label: dmId ? null : parseMaHoaChatFromMachineLabel(machineLabel),
    ma_lo: resolveMaLoFromIncidentAttrs(attrs),
    created_at: String(r.created_at || ""),
  };
}

/** Nạp danh mục hóa chất còn thiếu trong cache cho các sự cố; trả thông báo lỗi nếu truy vấn lỗi. */
async function napDanhMucHoaChat(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  parsed: ParsedSuCo[],
  dm: DanhMucCache,
): Promise<string | null> {
  const ids = [...new Set(parsed.map((r) => r.dm_hoa_chat_id).filter((x): x is string => !!x && !dm.byId.has(x)))];
  const mas = [...new Set(parsed.map((r) => r.ma_from_label).filter((x): x is string => !!x && !dm.byMa.has(x)))];
  if (ids.length) {
    const { data, error } = await supabase.from("cssd_dm_hoa_chat").select("id, ma_hoa_chat, ten_hoa_chat").in("id", ids);
    if (error) return error.message;
    for (const d of (data || []) as DmRow[]) {
      dm.byId.set(String(d.id), { ma: String(d.ma_hoa_chat || ""), ten: String(d.ten_hoa_chat || "") });
    }
  }
  if (mas.length) {
    const { data, error } = await supabase
      .from("cssd_dm_hoa_chat")
      .select("id, ma_hoa_chat, ten_hoa_chat")
      .in("ma_hoa_chat", mas);
    if (error) return error.message;
    for (const d of (data || []) as DmRow[]) {
      const ma = String(d.ma_hoa_chat || "");
      dm.byMa.set(ma, { id: String(d.id), ma, ten: String(d.ten_hoa_chat || "") });
    }
  }
  return null;
}

function toSuCoChemicalRow(r: ParsedSuCo, dm: DanhMucCache): SuCoChemicalRow {
  let dmId = r.dm_hoa_chat_id;
  let ma = "";
  let ten = "";
  if (dmId) {
    ma = dm.byId.get(dmId)?.ma ?? "";
    ten = dm.byId.get(dmId)?.ten ?? "";
  } else if (r.ma_from_label) {
    const hit = dm.byMa.get(r.ma_from_label);
    dmId = hit?.id ?? null;
    ma = hit?.ma ?? r.ma_from_label;
    ten = hit?.ten ?? "";
  }
  const { id, mo_ta, incident_type_label, ma_lo, created_at } = r;
  return { id, mo_ta, incident_type_label, dm_hoa_chat_id: dmId, ma_hoa_chat: ma || null, ten_hoa_chat: ten || null, ma_lo, created_at };
}

/** Sự cố CHEMICAL chưa có phiếu kho liên kết — gợi ý ghi xuất. */
export async function listSuCoChemicalChuaGhiKhoAction(): Promise<
  { success: true; data: SuCoChemicalRow[] } | { success: false; error: string }
> {
  try {
    await verifyPermission("KSNK_KHO_HOACHAT", "view");
    const supabase = createAdminSupabaseClient();

    // CSSD-031/035: quét theo trang từ sự cố mới nhất; loại sự cố đã có phiếu kho VÀ sự cố không xác định
    // được hóa chất TRƯỚC khi đếm đủ 40; dừng khi đủ, hết dữ liệu, hoặc chạm trần SU_CO_TRANG_TOI_DA trang.
    const data: SuCoChemicalRow[] = [];
    const dm: DanhMucCache = { byId: new Map(), byMa: new Map() };
    for (let page = 0; page < SU_CO_TRANG_TOI_DA && data.length < SU_CO_CHUA_GHI_TOI_DA; page++) {
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
        .select("id, su_co_id")
        .in("su_co_id", batch.map((r) => String(r.id || "")))
        .eq("is_active", true)
        // HC-C: phiếu xuất bị từ chối không còn liên kết — sự cố hiện lại để lập phiếu mới.
        .neq("trang_thai", "TU_CHOI");
      // Lỗi tra liên kết phải báo lỗi, không coi mọi sự cố là «chưa ghi» (dễ lập phiếu xuất trùng).
      if (linkedErr) return { success: false, error: mapFkError(linkedErr.message) };
      // CSSD-037: phiếu gốc đã đảo xong (có phiếu ngược DA_DUYET còn hiệu lực; CHO_DUYET thì chưa) không còn tính là
      // «đã có phiếu» — cùng vị từ với rpc_cssd_kho_hoa_chat_ghi_giao_dich, để sự cố hiện lại và lập được phiếu xuất mới.
      const daDao = new Set<string>();
      const phieuIds = (linkedRows || []).map((g) => String((g as { id?: string }).id || "")).filter(Boolean);
      if (phieuIds.length) {
        const { data: nguocRows, error: nguocErr } = await supabase
          .from("cssd_fact_kho_hoa_chat_giao_dich")
          .select("phieu_goc_id")
          .in("phieu_goc_id", phieuIds)
          .eq("is_active", true)
          .eq("trang_thai", "DA_DUYET");
        if (nguocErr) return { success: false, error: mapFkError(nguocErr.message) };
        for (const n of nguocRows || []) {
          const gid = (n as { phieu_goc_id?: string }).phieu_goc_id;
          if (gid) daDao.add(String(gid));
        }
      }
      const linked = new Set<string>();
      for (const g of linkedRows || []) {
        const { id, su_co_id: sid } = g as { id?: string; su_co_id?: string };
        if (sid && !daDao.has(String(id))) linked.add(String(sid));
      }
      const parsed = batch.filter((r) => !linked.has(String(r.id || ""))).map(parseSuCo);
      const dmErr = await napDanhMucHoaChat(supabase, parsed, dm);
      if (dmErr) return { success: false, error: mapFkError(dmErr) };
      for (const r of parsed) {
        const row = toSuCoChemicalRow(r, dm);
        // Nút «Ghi xuất» cần dm_hoa_chat_id — sự cố không xác định được hóa chất không đếm vào 40.
        if (row.dm_hoa_chat_id) data.push(row);
      }
      if (batch.length < SU_CO_TRANG) break;
    }

    return { success: true, data: data.slice(0, SU_CO_CHUA_GHI_TOI_DA) };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}
