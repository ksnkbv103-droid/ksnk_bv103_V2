import type { SupabaseClient } from "@supabase/supabase-js";
import { buildQuyTrinhTramPatch } from "../lib/cssd-tram-persist";
import { appendQuyTrinhException } from "../actions/cssd-action-common";
import { resolveCssdOperatorNhanSuId } from "../shared/application/cssd-operator-resolve";
import { executeIncidentReportAndRollback } from "@/modules/cssd-su-co/application/su-co-report.application";
import { revalidateCssdIncidentSurfaces } from "@/lib/cssd-server-common";

export type PersistMeTietKhuanInput = {
  activeMeId: string;
  maLo: string;
  quyTrinhIds: string[];
  isPass: boolean;
  nguoiUnload: string;
  /** Phiên đăng nhập — ghi nguoi_tiet_khuan_id / nguoi_cap_phat_id chuẩn fact. */
  operatorAuthUserId?: string | null;
  operatorEmail?: string | null;
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
): Promise<
  | {
      ok: true;
      incidentIds?: string[];
      createdCount?: number;
      skippedCount?: number;
      recalledCount?: number;
      machineHeld?: boolean;
    }
  | { ok: false; message: string }
> {
  const { data: gateRow, error: gateErr } = await client
    .from("cssd_fact_lo_tiet_khuan")
    .select("tk_mo_form_qc_at, ket_qua_test, tk_qc_json")
    .eq("id", p.activeMeId)
    .maybeSingle();
  if (gateErr) return { ok: false, message: gateErr.message };
  if (!gateRow) return { ok: false, message: "Không tìm thấy mẻ tiệt khuẩn." };
  const g = gateRow as { tk_mo_form_qc_at?: string | null; ket_qua_test?: boolean | null; tk_qc_json?: unknown };
  if (!g.tk_mo_form_qc_at) {
    return { ok: false, message: "Chưa mở bước đánh giá QC — bấm «Xong máy — mở đánh giá QC» trước." };
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

  let failIncidents: {
    incidentIds: string[];
    createdCount: number;
    skippedCount: number;
    recalledCount: number;
    machineHeld: boolean;
  } | null = null;
  if (!p.isPass) {
    let qrRow: {
      id: string;
      ma_qr_quy_trinh?: string | null;
      tram_hien_tai_id?: string | null;
      lo_tiet_khuan_id?: string | null;
    } | null = null;
    if (p.quyTrinhIds.length > 0) {
      const { data: qrsData, error: qrReadErr } = await client
        .from("cssd_fact_quy_trinh")
        .select("id, ma_qr_quy_trinh, tram_hien_tai_id, lo_tiet_khuan_id")
        .in("id", p.quyTrinhIds);
      if (qrReadErr) return { ok: false, message: qrReadErr.message };
      qrRow = (qrsData || [])[0] ?? null;
    }

    const bioFail = normTri(p.testSinhHoc) === "KHONG_DAT" || normTri(p.testBI) === "KHONG_DAT";
    const saved = await executeIncidentReportAndRollback(
      client,
      {
        maQR: String(qrRow?.ma_qr_quy_trinh || "").trim() || undefined,
        station: "TIET_KHUAN",
        incidentGroup: "PROCESS",
        typeId: bioFail ? "PROCESS_BI_POSITIVE" : "PROCESS_STERILIZATION_FAIL",
        typeTen: bioFail
          ? "Chỉ thị sinh học (BI) dương tính"
          : "Chất lượng tiệt khuẩn / mẻ không đạt",
        causeClass: "SC_QUY_TRINH",
        faultStation: "TIET_KHUAN",
        faultOperator: p.nguoiUnload || "Hệ thống tự động",
        desc: `Mẻ tiệt khuẩn ${p.maLo} không đạt QC. Chi tiết: ${ghiChu}. Người dỡ mẻ: ${p.nguoiUnload}`,
        reporterEmail: p.operatorEmail,
        reporterAuthUserId: p.operatorAuthUserId,
        processPayload: {
          loTietKhuanId: p.activeMeId,
          maLo: p.maLo,
          quyTrinhId: qrRow?.id,
        },
      },
      qrRow,
    );
    failIncidents = {
      incidentIds: [saved.incident_id],
      createdCount: saved.deduped ? 0 : 1,
      skippedCount: saved.deduped ? 1 : 0,
      recalledCount: saved.recalledCount ?? 0,
      machineHeld: Boolean(saved.machineHeld),
    };
  }

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
      .from("cssd_dm_bo_dung_cu")
      .select("id, loai_dung_cu_id")
      .in("id", boIds);
    
    const loaiIds = (boData || []).map(b => b.loai_dung_cu_id).filter(Boolean);
    const { data: loaiData } = await client
      .from("cssd_dm_loai_dung_cu")
      .select("id, so_ngay_han_dung")
      .in("id", loaiIds);

    const loaiMap = new Map((loaiData || []).map(l => [l.id, l.so_ngay_han_dung]));
    const boToLoaiMap = new Map((boData || []).map(b => [b.id, b.loai_dung_cu_id]));

    const operatorId = await resolveCssdOperatorNhanSuId(client, {
      authUserId: p.operatorAuthUserId,
      email: p.operatorEmail,
      hoTen: p.nguoiUnload,
    });

    // 2. Cập nhật từng quy trình với hạn dùng riêng biệt
    for (const id of p.quyTrinhIds) {
      const boId = qtData?.find(q => q.id === id)?.bo_dung_cu_id;
      const loaiId = boId ? boToLoaiMap.get(boId) : null;
      const days = (loaiId ? loaiMap.get(loaiId) : null) ?? 30; // Mặc định 30 ngày
      
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + Number(days));

      const capPatch = await buildQuyTrinhTramPatch(client, "CAP_PHAT");
      const nowPass = new Date().toISOString();
      const qtPatch: Record<string, unknown> = {
        ...capPatch,
        thoi_gian_tiet_khuan: nowPass,
        thoi_gian_cap_phat: nowPass,
        ngay_het_han: expiry.toISOString(),
        han_su_dung: expiry.toISOString(),
        // QT.22: mẻ ĐẠT → gói sạch kho vô khuẩn (tránh CAP_PHAT fail im lặng khi tinh_trang null).
        tinh_trang: "BINH_THUONG",
        updated_at: nowPass,
      };
      if (operatorId) {
        qtPatch.nguoi_tiet_khuan_id = operatorId;
        qtPatch.nguoi_cap_phat_id = operatorId;
      }
      await client.from("cssd_fact_quy_trinh").update(qtPatch).eq("id", id);
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

  }

  if (failIncidents) {
    revalidateCssdIncidentSurfaces();
    for (const id of p.quyTrinhIds) {
      await appendQuyTrinhException(client, id, {
        su_kien: "ME_TIET_KHUAN_KHONG_DAT",
        tu_tram: "TIET_KHUAN",
        den_tram: "DONG_GOI",
        ly_do: `Lô: ${p.maLo} — KHÔNG ĐẠT QC`,
        nguoi_thao_tac: p.nguoiUnload,
      });
    }
    return {
      ok: true,
      incidentIds: failIncidents.incidentIds,
      createdCount: failIncidents.createdCount,
      skippedCount: failIncidents.skippedCount,
      recalledCount: failIncidents.recalledCount,
      machineHeld: failIncidents.machineHeld,
    };
  }

  return { ok: true };
}
