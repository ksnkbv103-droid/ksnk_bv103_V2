import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { insertCssdLifecycleEvent } from "../shared/application/cssd-lifecycle-events";
import { tableHasColumn } from "../shared/cssd-db-utils";

export type PersistMeTietKhuanInput = {
  activeMeId: string;
  maLo: string;
  quyTrinhIds: string[];
  isPass: boolean;
  nguoiUnload: string;
  nhietDo: string;
  testBI: string;
  testCI: string;
  testBD: string;
};

/** Ghi kết quả mẻ tiệt khuẩn + (nếu đạt) cập nhật quy_trình và nhật ký quét. */
export async function persistMeTietKhuanFinishWithClient(
  client: SupabaseClient,
  p: PersistMeTietKhuanInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ghiChu = `Nhiệt/Áp: ${p.nhietDo} | Người dỡ: ${p.nguoiUnload} | BI:${p.testBI} CI:${p.testCI} BD:${p.testBD}`;
  const { error: loErr } = await client
    .from("fact_lo_tiet_khuan")
    .update({
      ket_qua_test: p.isPass,
      ghi_chu: ghiChu,
      updated_at: new Date().toISOString(),
    })
    .eq("id", p.activeMeId);
  if (loErr) return { ok: false, message: loErr.message };

  if (p.isPass && p.quyTrinhIds.length > 0) {
    // 1. Lấy thông tin hạn dùng từ loại dụng cụ của từng bộ
    const { data: qtData } = await client
      .from("fact_quy_trinh")
      .select("id, bo_dung_cu_id")
      .in("id", p.quyTrinhIds);
    
    const boIds = (qtData || []).map(q => q.bo_dung_cu_id).filter(Boolean);
    const { data: boData } = await client
      .from("dm_bo_dung_cu")
      .select("id, loai_dung_cu_id")
      .in("id", boIds);
    
    const loaiIds = (boData || []).map(b => b.loai_dung_cu_id).filter(Boolean);
    const { data: loaiData } = await client
      .from("dm_loai_dung_cu")
      .select("id, so_ngay_han_dung")
      .in("id", loaiIds);

    const loaiMap = new Map((loaiData || []).map(l => [l.id, l.so_ngay_han_dung]));
    const boToLoaiMap = new Map((boData || []).map(b => [b.id, b.loai_dung_cu_id]));

    // 2. Cập nhật từng quy trình với hạn dùng riêng biệt
    for (const id of p.quyTrinhIds) {
      const boId = qtData?.find(q => q.id === id)?.bo_dung_cu_id;
      const loaiId = boId ? boToLoaiMap.get(boId) : null;
      const days = (loaiId ? loaiMap.get(loaiId) : null) ?? 30; // Mặc định 30 ngày
      
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + Number(days));

      await client
        .from("fact_quy_trinh")
        .update({ 
          ma_trang_thai_hien_tai: "CAP_PHAT", 
          trang_thai: "DA_TIET_KHUAN",
          ngay_het_han: expiry.toISOString()
        })
        .eq("id", id);
    }

    const rows = p.quyTrinhIds.map((id) => ({
      quy_trinh_id: id,
      ma_hanh_dong: "HOAN_ME_TIET_KHUAN_DAT",
      ma_tram: "TIET_KHUAN",
      ghi_chu: `Lô: ${p.maLo} - ĐẠT QC (Hạn dùng: +${30} ngày)`, // Ghi chú sơ bộ, thực tế tính theo từng bộ
      nguoi_thuc_hien: p.nguoiUnload,
    }));
    const { error: nkErr } = await client.from("fact_nhat_ky_quet").insert(rows);
    if (nkErr) return { ok: false, message: nkErr.message };

    for (const id of p.quyTrinhIds) {
      const lc = await insertCssdLifecycleEvent(client, {
        quy_trinh_id: id,
        ma_su_kien: "ME_TIET_KHUAN_DAT",
        ma_tram: "TIET_KHUAN",
        ghi_chu: `Lô ${p.maLo} đạt QC`,
        payload: { ma_lo: p.maLo, nguoi_unload: p.nguoiUnload },
      });
      if (!lc.ok && !/fact_cssd_lifecycle_event|does not exist/i.test(lc.message)) return { ok: false, message: lc.message };
    }
  }

  /** Không đạt sinh học/hóa học — domino batch: đưa bộ về ĐÓNG GÓI, gỡ khỏi mẻ, cấm cấp phát. */
  if (!p.isPass && p.quyTrinhIds.length > 0) {
    const failUpdate: Record<string, unknown> = {
      ma_trang_thai_hien_tai: "DONG_GOI",
      lo_tiet_khuan_id: null,
      updated_at: new Date().toISOString(),
    };
    if (await tableHasColumn(client, "fact_quy_trinh", "is_dong_bang")) {
      failUpdate.is_dong_bang = true;
    }
    const { error: qtRoll } = await client.from("fact_quy_trinh").update(failUpdate).in("id", p.quyTrinhIds);
    if (qtRoll) return { ok: false, message: qtRoll.message };

    const failRows = p.quyTrinhIds.map((id) => ({
      quy_trinh_id: id,
      ma_hanh_dong: "ME_TIET_KHUAN_KHONG_DAT",
      ma_tram: "TIET_KHUAN",
      ghi_chu: `Lô: ${p.maLo} — KHÔNG ĐẠT QC. ${ghiChu}`,
      nguoi_thuc_hien: p.nguoiUnload,
    }));
    const { error: nkFail } = await client.from("fact_nhat_ky_quet").insert(failRows);
    if (nkFail) return { ok: false, message: nkFail.message };

    for (const id of p.quyTrinhIds) {
      const lc = await insertCssdLifecycleEvent(client, {
        quy_trinh_id: id,
        ma_su_kien: "ME_TIET_KHUAN_KHONG_DAT_DOMINO",
        ma_tram: "TIET_KHUAN",
        ghi_chu: `Lô ${p.maLo}: không đạt — rollback về DONG_GOI`,
        payload: { ma_lo: p.maLo },
      });
      if (!lc.ok && !/fact_cssd_lifecycle_event|does not exist/i.test(lc.message)) return { ok: false, message: lc.message };
    }
  }

  return { ok: true };
}

export async function persistMeTietKhuanFinish(
  p: PersistMeTietKhuanInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  return persistMeTietKhuanFinishWithClient(supabase, p);
}
