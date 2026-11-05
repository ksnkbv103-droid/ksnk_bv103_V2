/**
 * Cầu nối giám sát dịch tễ học vết mổ (NKBV) khi thu hồi mẻ CSSD có bộ đã dùng trên lâm sàng.
 * Soft-fail — không chặn thu hồi CSSD nếu có lỗi.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BatchRecallListItem } from "./batch-recall-hold.application";

/** Trích dẫn giá trị cho cú pháp filter PostgREST (`.or()`): bọc "..." và escape \ và ". */
export function quotePostgrestValue(v: string): string {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export async function tagNkbvEpidemiologicalAlertForRecalledBatches(
  supabase: SupabaseClient,
  opts: {
    incidentId: string;
    loTietKhuanId: string;
    maLo?: string | null;
    listedUsed: readonly BatchRecallListItem[];
  },
): Promise<{ flaggedCount: number; error?: string }> {
  if (!opts.listedUsed.length) return { flaggedCount: 0 };

  try {
    const quyTrinhIds = opts.listedUsed.map((x) => x.quyTrinhId).filter(Boolean);
    const caMoIds = opts.listedUsed.map((x) => x.maCaMoId).filter(Boolean) as string[];

    let query = supabase
      .from("nkbv_fact_su_kien")
      .select("id, clinical_notes, quy_trinh_id, lo_tiet_khuan_id, ma_ca, updated_at")
      .eq("is_active", true);

    const orClauses: string[] = [`lo_tiet_khuan_id.eq.${opts.loTietKhuanId}`];
    if (quyTrinhIds.length > 0) {
      orClauses.push(`quy_trinh_id.in.(${quyTrinhIds.map((q) => quotePostgrestValue(String(q))).join(",")})`);
    }
    // Khớp CHÍNH XÁC mã ca (không ilike %…%), giá trị được quote/escape để input có , ( ) không phá filter.
    const cleanCas = [...new Set(caMoIds.map((c) => c.trim()).filter(Boolean))];
    if (cleanCas.length > 0) {
      orClauses.push(`ma_ca.in.(${cleanCas.map(quotePostgrestValue).join(",")})`);
    }

    query = query.or(orClauses.join(","));

    const { data: matchedCases, error: searchErr } = await query;
    if (searchErr) {
      console.warn({
        module: "cssd-su-co",
        action: "tagNkbvEpidemiologicalAlertForRecalledBatches",
        warn: searchErr.message,
      });
      return { flaggedCount: 0, error: searchErr.message };
    }

    if (!matchedCases || matchedCases.length === 0) {
      return { flaggedCount: 0 };
    }

    let flaggedCount = 0;
    const nowIso = new Date().toISOString();

    for (const c of matchedCases) {
      const prevNotes = (c.clinical_notes && typeof c.clinical_notes === "object" ? c.clinical_notes : {}) as Record<
        string,
        unknown
      >;
      const existingAlert = prevNotes.cssd_recall_alert;
      if (existingAlert && typeof existingAlert === "object") {
        continue;
      }

      const updatedNotes = {
        ...prevNotes,
        cssd_recall_alert: {
          incident_id: opts.incidentId,
          lo_tiet_khuan_id: opts.loTietKhuanId,
          ma_lo: opts.maLo || null,
          flagged_at: nowIso,
          alert: "Bộ dụng cụ phẫu thuật thuộc mẻ tiệt khuẩn bị thu hồi / BI dương tính",
        },
      };

      // Cập nhật có điều kiện (optimistic lock theo updated_at) để không ghi đè bản vừa được sửa song song.
      const { data: updated, error: updErr } = await supabase
        .from("nkbv_fact_su_kien")
        .update({
          clinical_notes: updatedNotes,
          lo_tiet_khuan_id: opts.loTietKhuanId,
          updated_at: nowIso,
        })
        .eq("id", c.id)
        .eq("updated_at", c.updated_at)
        .select("id");

      if (updErr) {
        console.warn({
          module: "cssd-su-co",
          action: "tagNkbvEpidemiologicalAlertForRecalledBatches",
          warn: updErr.message,
          caseId: c.id,
        });
        continue;
      }
      if (updated && updated.length > 0) {
        flaggedCount++;
      }
    }

    return { flaggedCount };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error({
      module: "cssd-su-co",
      action: "tagNkbvEpidemiologicalAlertForRecalledBatches",
      error: msg,
    });
    return { flaggedCount: 0, error: msg };
  }
}
