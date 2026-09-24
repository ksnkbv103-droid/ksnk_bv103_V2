import type { SupabaseClient } from "@supabase/supabase-js";
import { appendQuyTrinhException } from "../actions/cssd-action-common";
import { derivePassQuyTrinhIds, type PassMemberRow } from "../lib/me-tiet-khuan-batch-integrity";
import { resolveCssdOperatorNhanSuId } from "../shared/application/cssd-operator-resolve";
import { executeIncidentReportAndRollback } from "@/modules/cssd-su-co/application/su-co-report.application";
import { revalidateCssdIncidentSurfaces } from "@/lib/cssd-server-common";

export type PersistMeTietKhuanInput = {
  activeMeId: string;
  maLo: string;
  /** Không dùng khi kết luận ĐẠT — server suy bộ trong mẻ. */
  quyTrinhIds?: string[];
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

type LinkedMember = PassMemberRow & {
  ma_qr_quy_trinh: string | null;
  tram_hien_tai_id: string | null;
};

async function loadLinkedBatchMembers(
  client: SupabaseClient,
  batchId: string,
): Promise<{ ok: true; rows: LinkedMember[] } | { ok: false; message: string }> {
  const { data, error } = await client
    .from("v_cssd_quy_trinh_full")
    .select("id, ma_qr_quy_trinh, ma_trang_thai_hien_tai, is_active, lo_tiet_khuan_id, tram_hien_tai_id")
    .eq("lo_tiet_khuan_id", batchId)
    .eq("is_active", true);
  if (error) return { ok: false, message: error.message };
  const rows = (data || []).map((row) => {
    const r = row as {
      id?: string;
      ma_qr_quy_trinh?: string | null;
      ma_trang_thai_hien_tai?: string | null;
      is_active?: boolean | null;
      lo_tiet_khuan_id?: string | null;
      tram_hien_tai_id?: string | null;
    };
    return {
      id: String(r.id || ""),
      ma_qr_quy_trinh: r.ma_qr_quy_trinh ?? null,
      ma_tram: r.ma_trang_thai_hien_tai ?? null,
      is_active: r.is_active === true,
      lo_tiet_khuan_id: r.lo_tiet_khuan_id ?? null,
      tram_hien_tai_id: r.tram_hien_tai_id ?? null,
    };
  });
  return { ok: true, rows };
}

function readRpcQuyTrinhIds(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const raw = (data as { quy_trinh_ids?: unknown }).quy_trinh_ids;
  if (!Array.isArray(raw)) return [];
  return raw.map((id) => String(id || "").trim()).filter(Boolean);
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

  const linked = await loadLinkedBatchMembers(client, p.activeMeId);
  if (!linked.ok) return { ok: false, message: linked.message };

  if (p.isPass) {
    const derived = derivePassQuyTrinhIds(linked.rows, p.activeMeId);
    if (!derived.ok) return { ok: false, message: derived.message };

    const operatorId = await resolveCssdOperatorNhanSuId(client, {
      authUserId: p.operatorAuthUserId,
      email: p.operatorEmail,
      hoTen: p.nguoiUnload,
    });
    const { data: rpcData, error: rpcErr } = await client.rpc("rpc_cssd_me_ket_luan_dat", {
      p_me_id: p.activeMeId,
      p_ghi_chu: ghiChu,
      p_qc_json: qcPayload,
      p_ket_qua_bi: normTri(p.testSinhHoc) === "DAT" || normTri(p.testBI) === "DAT",
      p_ket_qua_ci: normTri(p.testCI) === "DAT",
      p_nguoi_nhan_su_id: operatorId,
    });
    if (rpcErr) return { ok: false, message: rpcErr.message };

    const ids = readRpcQuyTrinhIds(rpcData);
    if (!ids.length) {
      return { ok: false, message: "Không có bộ đang ở trạm tiệt khuẩn trong mẻ — không kết luận ĐẠT." };
    }
    for (const id of ids) {
      await appendQuyTrinhException(client, id, {
        su_kien: "HOAN_ME_TIET_KHUAN_DAT",
        tu_tram: "TIET_KHUAN",
        den_tram: "CAP_PHAT",
        ly_do: `Lô: ${p.maLo} - ĐẠT QC`,
        nguoi_thao_tac: p.nguoiUnload,
      });
    }
    return { ok: true };
  }

  const qrRow = linked.rows[0]
    ? {
        id: linked.rows[0].id,
        ma_qr_quy_trinh: linked.rows[0].ma_qr_quy_trinh,
        tram_hien_tai_id: linked.rows[0].tram_hien_tai_id,
        lo_tiet_khuan_id: linked.rows[0].lo_tiet_khuan_id,
      }
    : null;

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

  const { data: loRows, error: loErr } = await client
    .from("cssd_fact_lo_tiet_khuan")
    .update({
      ket_qua_test: false,
      ghi_chu: ghiChu,
      ghi_chu_qc: ghiChu,
      tk_qc_json: qcPayload,
      thoi_gian_ket_thuc: now,
      ket_qua_bi: normTri(p.testSinhHoc) === "DAT" || normTri(p.testBI) === "DAT",
      ket_qua_ci: normTri(p.testCI) === "DAT",
      updated_at: now,
    })
    .eq("id", p.activeMeId)
    .is("ket_qua_test", null)
    .select("id");
  if (loErr) return { ok: false, message: loErr.message };
  if (!loRows?.length) return { ok: false, message: "Mẻ đã có kết quả QC — không ghi đè." };

  revalidateCssdIncidentSurfaces();
  for (const row of linked.rows) {
    await appendQuyTrinhException(client, row.id, {
      su_kien: "ME_TIET_KHUAN_KHONG_DAT",
      tu_tram: "TIET_KHUAN",
      den_tram: "DONG_GOI",
      ly_do: `Lô: ${p.maLo} — KHÔNG ĐẠT QC`,
      nguoi_thao_tac: p.nguoiUnload,
    });
  }
  return {
    ok: true,
    incidentIds: [saved.incident_id],
    createdCount: saved.deduped ? 0 : 1,
    skippedCount: saved.deduped ? 1 : 0,
    recalledCount: saved.recalledCount ?? 0,
    machineHeld: Boolean(saved.machineHeld),
  };
}
