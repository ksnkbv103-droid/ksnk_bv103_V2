/**
 * SC-01 pha 2: quét nhận lại bộ đang chờ thu hồi tại Tiếp nhận.
 * Chạy ở app (không phụ thuộc apply migration scan RPC) — bỏ qua is_dong_bang.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildHoldReturnedAttributePatch,
  isChoThuVeCycle,
  readThuHoiMeta,
  THU_HOI_STATUS_DA_THU_VE,
} from "../domain/cssd-batch-recall-hold";

export async function tryReceiveChoThuVeAtTiepNhan(
  supabase: SupabaseClient,
  opts: {
    quyTrinh: Record<string, unknown>;
    operatorLabel: string;
    operatorNhanSuId?: string | null;
  },
): Promise<{ handled: false } | { handled: true; newQuyTrinhId: string; incidentId: string | null }> {
  const q = opts.quyTrinh;
  const metadata = q.metadata;
  if (!isChoThuVeCycle(metadata)) return { handled: false };

  const thuHoi = readThuHoiMeta(metadata);
  const oldId = String(q.id || "").trim();
  if (!oldId) return { handled: false };

  const { data: tram, error: tramErr } = await supabase
    .from("cssd_dm_tram")
    .select("id")
    .eq("ma_tram", "TIEP_NHAN")
    .eq("is_active", true)
    .maybeSingle();
  if (tramErr) throw new Error(tramErr.message);
  const tiepNhanId = String((tram as { id?: string } | null)?.id || "").trim();
  if (!tiepNhanId) throw new Error("Không tìm thấy trạm Tiếp nhận.");

  const now = new Date().toISOString();
  const { data: inserted, error: insErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .insert({
      ma_qr_quy_trinh: q.ma_qr_quy_trinh,
      ma_qr_bo_vinh_vien: q.ma_qr_bo_vinh_vien,
      bo_dung_cu_id: q.bo_dung_cu_id,
      tram_hien_tai_id: tiepNhanId,
      suds_count: Number(q.suds_count || 0) + 1,
      tinh_trang: "BINH_THUONG",
      is_dong_bang: false,
      is_active: true,
      ma_vai_tro_bo: String(q.ma_vai_tro_bo || "DON").trim() || "DON",
      quy_trinh_cha_id: q.quy_trinh_cha_id ?? null,
      thoi_gian_tiep_nhan: now,
      nguoi_tiep_nhan_id: opts.operatorNhanSuId || null,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .maybeSingle();
  if (insErr) throw new Error(insErr.message);
  const newId = String((inserted as { id?: string } | null)?.id || "").trim();
  if (!newId) throw new Error("Không tạo được chu trình thu hồi về Tiếp nhận.");

  const nextMeta = {
    ...(typeof metadata === "object" && metadata ? (metadata as Record<string, unknown>) : {}),
    thu_hoi: {
      ...(thuHoi || {}),
      trang_thai: THU_HOI_STATUS_DA_THU_VE,
      new_quy_trinh_id: newId,
      nguoi_nhan_cssd: opts.operatorLabel,
      thoi_gian_nhan_lai: now,
    },
  };

  const { error: oldErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .update({
      is_active: false,
      is_dong_bang: true,
      updated_at: now,
      metadata: nextMeta,
    })
    .eq("id", oldId)
    .eq("is_active", true);
  if (oldErr) throw new Error(oldErr.message);

  const incidentId = String(thuHoi?.suCoId || "").trim() || null;
  if (incidentId) {
    await patchIncidentHoldReturned(supabase, {
      incidentId,
      oldQuyTrinhId: oldId,
      newQuyTrinhId: newId,
      operatorLabel: opts.operatorLabel,
    });
  }

  return { handled: true, newQuyTrinhId: newId, incidentId };
}

async function patchIncidentHoldReturned(
  supabase: SupabaseClient,
  opts: {
    incidentId: string;
    oldQuyTrinhId: string;
    newQuyTrinhId: string;
    operatorLabel: string;
  },
): Promise<void> {
  const { data, error } = await supabase
    .from("cssd_fact_su_co")
    .select("id, attributes, mo_ta")
    .eq("id", opts.incidentId)
    .maybeSingle();
  if (error || !data) return;

  const attrs = ((data as { attributes?: Record<string, unknown> }).attributes || {}) as Record<
    string,
    unknown
  >;
  const { nextAttrs, pendingLeft, issued } = buildHoldReturnedAttributePatch(attrs, {
    oldQuyTrinhId: opts.oldQuyTrinhId,
    newQuyTrinhId: opts.newQuyTrinhId,
    operatorLabel: opts.operatorLabel,
  });

  const note = `Đã thu về ${Math.min(issued, Number(nextAttrs.RECALL_RETURNED_COUNT))} / ${issued} gói đã xuất (còn chờ ${pendingLeft}).`;
  const moTa = String((data as { mo_ta?: string }).mo_ta || "");
  await supabase
    .from("cssd_fact_su_co")
    .update({
      attributes: nextAttrs,
      mo_ta: moTa.includes("Đã thu về") ? moTa : `${moTa}\n${note}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.incidentId);
}
