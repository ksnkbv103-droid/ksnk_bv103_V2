import type { SupabaseClient } from "@supabase/supabase-js";
import { buildQuyTrinhTramPatch } from "../lib/cssd-tram-persist";
import { insertCssdLifecycleEvent } from "../shared/application/cssd-lifecycle-events";
import { tableHasColumn } from "../shared/cssd-db-utils";
import { appendQuyTrinhException } from "../actions/cssd-action-common";

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
  /** Thông số máy (bắt buộc khi kết luận ĐẠT). */
  thongSoMay?: string;
  /** Chỉ thị tiếp xúc: DAT | KHONG_DAT */
  chiThiTiepXuc?: string;
  /** Chỉ thị đa thông số: DAT | KHONG_DAT */
  chiThiDaThongSo?: string;
  /** Test sinh học từng mẻ: NA | DAT | KHONG_DAT */
  testSinhHoc?: string;
  /** URL hoặc đường dẫn minh chứng (tùy tích hợp lưu trữ). */
  anhMinhChungMay?: string;
  anhMinhChungTiepXuc?: string;
  anhMinhChungDaThongSo?: string;
  anhMinhChungSinhHoc?: string;
  anhMinhChungBowieDick?: string;
};

function normTri(v: string | undefined): string {
  return String(v || "").trim().toUpperCase();
}

function validateMeTietKhuanPassPayload(p: PersistMeTietKhuanInput): string | null {
  if (!p.isPass) return null;
  if (!String(p.nguoiUnload || "").trim()) return "Thiếu người dỡ mẻ.";
  if (!String(p.nhietDo || "").trim()) return "Thiếu ghi nhận nhiệt độ / áp suất.";
  if (!String(p.thongSoMay || "").trim()) return "Thiếu thông số máy.";
  const ctx = normTri(p.chiThiTiepXuc);
  const cda = normTri(p.chiThiDaThongSo);
  if (ctx !== "DAT") return "Chỉ thị tiếp xúc phải ĐẠT để kết luận mẻ đạt.";
  if (cda !== "DAT") return "Chỉ thị đa thông số phải ĐẠT để kết luận mẻ đạt.";
  const bio = normTri(p.testSinhHoc) || normTri(p.testBI) || "NA";
  if (bio === "KHONG_DAT") return "Test sinh học không đạt — không thể kết luận mẻ đạt.";
  const chem = normTri(p.testCI) || "NA";
  if (chem === "KHONG_DAT") return "Chỉ thị hóa học (CI) không đạt — không thể kết luận mẻ đạt.";
  const bd = normTri(p.testBD) || "NA";
  if (bd === "KHONG_DAT") return "Bowie–Dick không đạt — không thể kết luận mẻ đạt.";
  return null;
}

/** Ghi kết quả mẻ tiệt khuẩn + (nếu đạt) cập nhật quy_trình và nhật ký quét. */
export async function persistMeTietKhuanFinishWithClient(
  client: SupabaseClient,
  p: PersistMeTietKhuanInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: gateRow, error: gateErr } = await client
    .from("cssd_fact_lo_tiet_khuan")
    .select("tk_mo_form_qc_at, ket_qua_test, tk_qc_json")
    .eq("id", p.activeMeId)
    .maybeSingle();
  if (gateErr) return { ok: false, message: gateErr.message };
  if (!gateRow) return { ok: false, message: "Không tìm thấy mẻ tiệt khuẩn." };
  const g = gateRow as { tk_mo_form_qc_at?: string | null; ket_qua_test?: boolean | null; tk_qc_json?: unknown };
  if (!g.tk_mo_form_qc_at) {
    return { ok: false, message: "Chưa mở bước đánh giá QC — bấm «Kết thúc chu trình tiệt khuẩn» trước." };
  }
  if (g.ket_qua_test === true || g.ket_qua_test === false) {
    return { ok: false, message: "Mẻ đã có kết quả QC — không ghi đè." };
  }

  if (p.isPass) {
    const passErr = validateMeTietKhuanPassPayload(p);
    if (passErr) return { ok: false, message: passErr };
  } else if (!String(p.nguoiUnload || "").trim()) {
    return { ok: false, message: "Thiếu người dỡ mẻ." };
  }

  const prevJson = (g.tk_qc_json && typeof g.tk_qc_json === "object" ? g.tk_qc_json : {}) as Record<string, unknown>;
  const qcPayload = {
    ...prevJson,
    nguoiUnload: p.nguoiUnload,
    nhietDoApSuat: p.nhietDo,
    thongSoMay: p.thongSoMay ?? "",
    chiThiTiepXuc: p.chiThiTiepXuc ?? "",
    chiThiDaThongSo: p.chiThiDaThongSo ?? "",
    testSinhHoc: p.testSinhHoc ?? p.testBI ?? "NA",
    testCI: p.testCI,
    testBowieDick: p.testBD,
    anhMinhChung: {
      may: p.anhMinhChungMay ?? "",
      tiepXuc: p.anhMinhChungTiepXuc ?? "",
      daThongSo: p.anhMinhChungDaThongSo ?? "",
      sinhHoc: p.anhMinhChungSinhHoc ?? "",
      bowieDick: p.anhMinhChungBowieDick ?? "",
    },
    submittedAt: new Date().toISOString(),
  };

  const ghiChu = `Nhiệt/Áp: ${p.nhietDo} | Người dỡ: ${p.nguoiUnload} | TX:${p.chiThiTiepXuc || "—"} ĐTS:${p.chiThiDaThongSo || "—"} | BI:${p.testBI} CI:${p.testCI} BD:${p.testBD} | SH:${p.testSinhHoc || "NA"}`;
  const now = new Date().toISOString();
  const { error: loErr } = await client
    .from("cssd_fact_lo_tiet_khuan")
    .update({
      ket_qua_test: p.isPass,
      ghi_chu: ghiChu,
      ghi_chu_qc: ghiChu,
      tk_qc_json: qcPayload,
      thoi_gian_ket_thuc: now,
      ket_qua_bi: normTri(p.testSinhHoc) === "DAT" || normTri(p.testBI) === "DAT",
      ket_qua_ci: normTri(p.testCI) === "DAT",
      updated_at: now,
    })
    .eq("id", p.activeMeId);
  if (loErr) return { ok: false, message: loErr.message };

  if (p.isPass && p.quyTrinhIds.length > 0) {
    // 1. Lấy thông tin hạn dùng từ loại dụng cụ của từng bộ
    const { data: qtData } = await client
      .from("cssd_fact_quy_trinh")
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

      const capPatch = await buildQuyTrinhTramPatch(client, "CAP_PHAT");
      await client
        .from("cssd_fact_quy_trinh")
        .update({
          ...capPatch,
          ngay_het_han: expiry.toISOString(),
          han_su_dung: expiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    }

    for (const id of p.quyTrinhIds) {
      await appendQuyTrinhException(client, id, {
        su_kien: "HOAN_ME_TIET_KHUAN_DAT",
        tu_tram: "TIET_KHUAN",
        den_tram: "CAP_PHAT",
        ly_do: `Lô: ${p.maLo} - ĐẠT QC`,
        nguoi_thao_tac: p.nguoiUnload,
      });
    }

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
    const dongGoiPatch = await buildQuyTrinhTramPatch(client, "DONG_GOI");
    const failUpdate: Record<string, unknown> = {
      ...dongGoiPatch,
      lo_tiet_khuan_id: null,
      updated_at: new Date().toISOString(),
    };
    if (await tableHasColumn(client, "cssd_fact_quy_trinh", "is_dong_bang")) {
      failUpdate.is_dong_bang = true;
    }
    const { error: qtRoll } = await client.from("cssd_fact_quy_trinh").update(failUpdate).in("id", p.quyTrinhIds);
    if (qtRoll) return { ok: false, message: qtRoll.message };

    // Tự động tạo sự cố cho từng bộ dụng cụ khi mẻ không đạt
    const { data: qrsData } = await client
      .from("cssd_fact_quy_trinh")
      .select("id, ma_qr_quy_trinh")
      .in("id", p.quyTrinhIds);

    if (qrsData && qrsData.length > 0) {
      for (const qrRow of qrsData) {
        const attributes: Record<string, string> = {
          INCIDENT_GROUP: "PROCESS",
          INCIDENT_KIND: "PROCESS_STERILIZATION_FAIL",
          ROLLBACK_TARGET_STATION: "DONG_GOI",
          FAULT_OPERATOR: p.nguoiUnload || "Hệ thống tự động",
        };

        const suCoPayload: Record<string, unknown> = {
          ma_qr_quy_trinh: qrRow.ma_qr_quy_trinh,
          quy_trinh_id: qrRow.id,
          ma_tram_phat_hien: "TIET_KHUAN",
          incident_group: "PROCESS",
          incident_type_label: "Chất lượng tiệt khuẩn / mẻ không đạt",
          mo_ta: `Mẻ tiệt khuẩn ${p.maLo} không đạt QC. Chi tiết: ${ghiChu}. Người dỡ mẻ: ${p.nguoiUnload}`,
          is_red_alert: false,
          ma_tram_gay_loi: "TIET_KHUAN",
          attributes,
        };
        await client.from("cssd_fact_su_co").insert(suCoPayload);
      }
    }

    for (const id of p.quyTrinhIds) {
      await appendQuyTrinhException(client, id, {
        su_kien: "ME_TIET_KHUAN_KHONG_DAT",
        tu_tram: "TIET_KHUAN",
        den_tram: "DONG_GOI",
        ly_do: `Lô: ${p.maLo} — KHÔNG ĐẠT QC`,
        nguoi_thao_tac: p.nguoiUnload,
      });
    }

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
