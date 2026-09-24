import type { SupabaseClient } from "@supabase/supabase-js";
import { appendQuyTrinhException } from "../actions/cssd-action-common";
import { derivePassQuyTrinhIds, type PassMemberRow } from "../lib/me-tiet-khuan-batch-integrity";
import { evaluateMeQcRelease, type MeQcOutcome } from "../lib/me-tiet-khuan-qc";
import { getSterilizerMethod, type SterilizerMethod } from "./me-tiet-khuan-machine-kind";
import { resolveCssdOperatorNhanSuId } from "../shared/application/cssd-operator-resolve";
import { executeIncidentReportAndRollback } from "@/modules/cssd-su-co/application/su-co-report.application";
import { revalidateCssdIncidentSurfaces } from "@/lib/cssd-server-common";

export type PersistMeTietKhuanInput = {
  activeMeId: string;
  maLo: string;
  quyTrinhIds?: string[];
  isPass: boolean;
  nguoiUnload: string;
  operatorAuthUserId?: string | null;
  operatorEmail?: string | null;
  chuongTrinh?: string;
  nhietDo?: string;
  apSuat?: string;
  thoiGianChuKy?: string;
  thongSoVatLy: string;
  ciNgoaiGoi: string;
  ciPcd: string;
  trangThaiBi: string;
  anhMinhChung?: string;
};

type LinkedMember = PassMemberRow & {
  ma_qr_quy_trinh: string | null;
  tram_hien_tai_id: string | null;
  bo_dung_cu_id: string | null;
};

async function loadLinkedBatchMembers(
  client: SupabaseClient,
  batchId: string,
): Promise<{ ok: true; rows: LinkedMember[] } | { ok: false; message: string }> {
  const { data, error } = await client
    .from("v_cssd_quy_trinh_full")
    .select("id, ma_qr_quy_trinh, ma_trang_thai_hien_tai, is_active, lo_tiet_khuan_id, tram_hien_tai_id, bo_dung_cu_id")
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
      bo_dung_cu_id?: string | null;
    };
    return {
      id: String(r.id || ""),
      ma_qr_quy_trinh: r.ma_qr_quy_trinh ?? null,
      ma_tram: r.ma_trang_thai_hien_tai ?? null,
      is_active: r.is_active === true,
      lo_tiet_khuan_id: r.lo_tiet_khuan_id ?? null,
      tram_hien_tai_id: r.tram_hien_tai_id ?? null,
      bo_dung_cu_id: r.bo_dung_cu_id ? String(r.bo_dung_cu_id) : null,
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

async function batchHasImplant(client: SupabaseClient, boIds: string[]): Promise<boolean> {
  if (!boIds.length) return false;
  const { data, error } = await client.from("cssd_dm_bo_dung_cu").select("id, is_implant").in("id", boIds);
  if (error) throw new Error(error.message);
  return (data || []).some((row) => (row as { is_implant?: boolean | null }).is_implant === true);
}

function qcJson(args: {
  p: PersistMeTietKhuanInput;
  method: SterilizerMethod | null;
  coImplant: boolean;
  biBatBuoc: boolean;
  actorUserId: string;
  nhietDo: number | null;
  apSuat: number | null;
  thoiGianChuKy: number | null;
  prev: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    ...args.prev,
    thong_so_vat_ly: args.p.thongSoVatLy,
    ci_ngoai_goi: args.p.ciNgoaiGoi,
    ci_pcd: args.p.ciPcd,
    trang_thai_bi: args.p.trangThaiBi.trim().toUpperCase(),
    bi_bat_buoc: args.biBatBuoc ? "true" : "false",
    co_implant: args.coImplant ? "true" : "false",
    phuong_phap: args.method || "",
    chuong_trinh: String(args.p.chuongTrinh || "").trim().slice(0, 80),
    actor_user_id: args.actorUserId,
    nguoiUnload: args.p.nguoiUnload,
    anhMinhChung: String(args.p.anhMinhChung || "").trim(),
    ...(args.nhietDo != null ? { nhiet_do: args.nhietDo } : {}),
    ...(args.apSuat != null ? { ap_suat: args.apSuat } : {}),
    ...(args.thoiGianChuKy != null ? { thoi_gian_chu_ky: args.thoiGianChuKy } : {}),
    submittedAt: new Date().toISOString(),
  };
}

/** Ghi kết quả mẻ. Nhả không ghi mốc cấp phát. BI bắt buộc chưa có → CHO_BI, bộ ở lại tiệt khuẩn. */
export async function persistMeTietKhuanFinishWithClient(
  client: SupabaseClient,
  p: PersistMeTietKhuanInput,
): Promise<
  | {
      ok: true;
      outcome: MeQcOutcome;
      incidentIds?: string[];
      createdCount?: number;
      skippedCount?: number;
      recalledCount?: number;
      machineHeld?: boolean;
    }
  | { ok: false; message: string }
> {
  const actorUserId = String(p.operatorAuthUserId || "").trim();
  if (!actorUserId) return { ok: false, message: "Không xác định được người thực hiện." };

  const { data: gateRow, error: gateErr } = await client
    .from("cssd_fact_lo_tiet_khuan")
    .select("tk_mo_form_qc_at, ket_qua_test, tk_qc_json, phuong_phap, trang_thai_me, thiet_bi_id, thiet_bi:cssd_dm_thiet_bi(loai_may:cssd_dm_loai_may(ma_loai_may))")
    .eq("id", p.activeMeId)
    .maybeSingle();
  if (gateErr) return { ok: false, message: gateErr.message };
  if (!gateRow) return { ok: false, message: "Không tìm thấy mẻ tiệt khuẩn." };
  const g = gateRow as {
    tk_mo_form_qc_at?: string | null;
    ket_qua_test?: boolean | null;
    tk_qc_json?: unknown;
    phuong_phap?: string | null;
    trang_thai_me?: string | null;
    thiet_bi?: unknown;
  };
  if (!g.tk_mo_form_qc_at) {
    return { ok: false, message: "Chưa mở bước đánh giá QC — bấm «Xong máy — mở đánh giá QC» trước." };
  }
  if (g.ket_qua_test === true || g.ket_qua_test === false || g.trang_thai_me === "CHO_BI" || g.trang_thai_me === "HOAN_THANH") {
    return { ok: false, message: "Mẻ đã có kết quả QC — không ghi đè." };
  }

  const linked = await loadLinkedBatchMembers(client, p.activeMeId);
  if (!linked.ok) return { ok: false, message: linked.message };

  let coImplant = false;
  try {
    coImplant = await batchHasImplant(
      client,
      [...new Set(linked.rows.map((row) => row.bo_dung_cu_id || "").filter(Boolean))],
    );
  } catch (e: unknown) {
    return { ok: false, message: e instanceof Error ? e.message : "Không kiểm tra được cờ implant." };
  }

  const method = getSterilizerMethod({ phuong_phap: g.phuong_phap }) || getSterilizerMethod(g.thiet_bi);
  const evaluated = evaluateMeQcRelease({
    thongSoVatLy: p.thongSoVatLy,
    ciNgoaiGoi: p.ciNgoaiGoi,
    ciPcd: p.ciPcd,
    trangThaiBi: p.trangThaiBi,
    method: method || null,
    coImplant,
    nhietDo: p.nhietDo,
    apSuat: p.apSuat,
    thoiGianChuKy: p.thoiGianChuKy,
  });
  if (!evaluated.ok) return evaluated;

  const decision = evaluated.decision;
  if (!p.isPass && decision.outcome === "HOAN_THANH") {
    return { ok: false, message: "Chưa có mục Không đạt — không kết luận mẻ không đạt." };
  }
  if (!p.isPass && decision.outcome === "CHO_BI") {
    return { ok: false, message: "QC đạt và BI chưa có — mẻ chuyển chờ BI, không kết luận không đạt." };
  }

  const prevJson = (g.tk_qc_json && typeof g.tk_qc_json === "object" ? g.tk_qc_json : {}) as Record<string, unknown>;
  const payload = qcJson({
    p,
    method: method || null,
    coImplant,
    biBatBuoc: decision.biBatBuoc,
    actorUserId,
    nhietDo: decision.nhietDo,
    apSuat: decision.apSuat,
    thoiGianChuKy: decision.thoiGianChuKy,
    prev: prevJson,
  });
  const ghiChu = `Chương trình: ${payload.chuong_trinh || "—"} | VL:${p.thongSoVatLy} CI ngoài:${p.ciNgoaiGoi} CI PCD:${p.ciPcd} BI:${p.trangThaiBi} | Người dỡ: ${p.nguoiUnload}`;
  const now = new Date().toISOString();
  const operatorId = await resolveCssdOperatorNhanSuId(client, {
    authUserId: actorUserId,
    email: p.operatorEmail,
    hoTen: p.nguoiUnload,
  });

  if (decision.outcome === "HOAN_THANH") {
    const derived = derivePassQuyTrinhIds(linked.rows, p.activeMeId);
    if (!derived.ok) return { ok: false, message: derived.message };
    const { data: rpcData, error: rpcErr } = await client.rpc("rpc_cssd_me_ket_luan_dat", {
      p_me_id: p.activeMeId,
      p_ghi_chu: ghiChu,
      p_qc_json: payload,
      p_ket_qua_bi: decision.ketQuaBi,
      p_ket_qua_ci: decision.ketQuaCi,
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
        ly_do: `Lô: ${p.maLo} - ĐẠT QC, chờ cấp phát`,
        nguoi_thao_tac: p.nguoiUnload,
      });
    }
    return { ok: true, outcome: "HOAN_THANH" };
  }

  if (decision.outcome === "CHO_BI") {
    const { error: rpcErr } = await client.rpc("rpc_cssd_me_ghi_cho_bi", {
      p_me_id: p.activeMeId,
      p_ghi_chu: ghiChu,
      p_qc_json: payload,
      p_ket_qua_ci: decision.ketQuaCi,
      p_nguoi_nhan_su_id: operatorId,
    });
    if (rpcErr) return { ok: false, message: rpcErr.message };
    return { ok: true, outcome: "CHO_BI" };
  }

  const qrRow = linked.rows[0]
    ? {
        id: linked.rows[0].id,
        ma_qr_quy_trinh: linked.rows[0].ma_qr_quy_trinh,
        tram_hien_tai_id: linked.rows[0].tram_hien_tai_id,
        lo_tiet_khuan_id: linked.rows[0].lo_tiet_khuan_id,
      }
    : null;
  const saved = await executeIncidentReportAndRollback(
    client,
    {
      maQR: String(qrRow?.ma_qr_quy_trinh || "").trim() || undefined,
      station: "TIET_KHUAN",
      incidentGroup: "PROCESS",
      typeId: decision.bioFail ? "PROCESS_BI_POSITIVE" : "PROCESS_STERILIZATION_FAIL",
      typeTen: decision.bioFail ? "Chỉ thị sinh học (BI) dương tính" : "Chất lượng tiệt khuẩn / mẻ không đạt",
      causeClass: "SC_QUY_TRINH",
      faultStation: "TIET_KHUAN",
      faultOperator: p.nguoiUnload || "Hệ thống tự động",
      desc: `Mẻ tiệt khuẩn ${p.maLo} không đạt QC. Chi tiết: ${ghiChu}. Người dỡ mẻ: ${p.nguoiUnload}`,
      reporterEmail: p.operatorEmail,
      reporterAuthUserId: actorUserId,
      processPayload: { loTietKhuanId: p.activeMeId, maLo: p.maLo, quyTrinhId: qrRow?.id },
    },
    qrRow,
  );

  const { data: loRows, error: loErr } = await client
    .from("cssd_fact_lo_tiet_khuan")
    .update({
      ket_qua_test: false,
      ghi_chu: ghiChu,
      ghi_chu_qc: ghiChu,
      tk_qc_json: payload,
      thoi_gian_ket_thuc: now,
      ket_qua_bi: decision.ketQuaBi,
      ket_qua_ci: decision.ketQuaCi,
      nhiet_do: decision.nhietDo,
      ap_suat: decision.apSuat,
      thoi_gian_chu_ky: decision.thoiGianChuKy,
      chuong_trinh: String(p.chuongTrinh || "").trim().slice(0, 80) || null,
      co_implant: coImplant,
      trang_thai_bi: String(p.trangThaiBi || "").trim().toUpperCase() || null,
      trang_thai_me: "QC_KHONG_DAT",
      nguoi_ket_thuc_id: actorUserId,
      phuong_phap: method || null,
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
    outcome: "QC_KHONG_DAT",
    incidentIds: [saved.incident_id],
    createdCount: saved.deduped ? 0 : 1,
    skippedCount: saved.deduped ? 1 : 0,
    recalledCount: saved.recalledCount ?? 0,
    machineHeld: Boolean(saved.machineHeld),
  };
}

/** Mẻ CHO_BI: âm → nhả kho vô khuẩn; dương → sự cố BI dương, không nhả. */
export async function persistMeBiResultWithClient(
  client: SupabaseClient,
  args: {
    batchId: string;
    ketQua: "AM" | "DUONG";
    operatorAuthUserId: string;
    operatorEmail?: string | null;
    nguoiLabel: string;
  },
): Promise<
  | {
      ok: true;
      outcome: "HOAN_THANH" | "QC_KHONG_DAT";
      incidentIds?: string[];
      createdCount?: number;
      skippedCount?: number;
      recalledCount?: number;
      machineHeld?: boolean;
    }
  | { ok: false; message: string }
> {
  const actorUserId = String(args.operatorAuthUserId || "").trim();
  if (!actorUserId) return { ok: false, message: "Không xác định được người thực hiện." };
  const { data: me, error } = await client
    .from("cssd_fact_lo_tiet_khuan")
    .select("id, ma_lo_tiet_khuan, trang_thai_me, ket_qua_test")
    .eq("id", args.batchId)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!me) return { ok: false, message: "Không tìm thấy mẻ." };
  const row = me as { ma_lo_tiet_khuan?: string | null; trang_thai_me?: string | null; ket_qua_test?: boolean | null };
  if (row.trang_thai_me !== "CHO_BI" || row.ket_qua_test != null) {
    return { ok: false, message: "Chỉ nhập BI cho mẻ đang chờ kết quả BI." };
  }

  const operatorId = await resolveCssdOperatorNhanSuId(client, {
    authUserId: actorUserId,
    email: args.operatorEmail,
    hoTen: args.nguoiLabel,
  });

  if (args.ketQua === "AM") {
    const { error: rpcErr } = await client.rpc("rpc_cssd_me_nhap_bi_am", {
      p_me_id: args.batchId,
      p_actor_user_id: actorUserId,
      p_nguoi_nhan_su_id: operatorId,
    });
    if (rpcErr) return { ok: false, message: rpcErr.message };
    return { ok: true, outcome: "HOAN_THANH" };
  }

  const linked = await loadLinkedBatchMembers(client, args.batchId);
  if (!linked.ok) return { ok: false, message: linked.message };
  const qrRow = linked.rows[0]
    ? {
        id: linked.rows[0].id,
        ma_qr_quy_trinh: linked.rows[0].ma_qr_quy_trinh,
        tram_hien_tai_id: linked.rows[0].tram_hien_tai_id,
        lo_tiet_khuan_id: linked.rows[0].lo_tiet_khuan_id,
      }
    : null;
  const maLo = String(row.ma_lo_tiet_khuan || "");
  const saved = await executeIncidentReportAndRollback(
    client,
    {
      maQR: String(qrRow?.ma_qr_quy_trinh || "").trim() || undefined,
      station: "TIET_KHUAN",
      incidentGroup: "PROCESS",
      typeId: "PROCESS_BI_POSITIVE",
      typeTen: "Chỉ thị sinh học (BI) dương tính",
      causeClass: "SC_QUY_TRINH",
      faultStation: "TIET_KHUAN",
      faultOperator: args.nguoiLabel || "Hệ thống tự động",
      desc: `Mẻ ${maLo} BI dương sau thời gian ủ.`,
      reporterEmail: args.operatorEmail,
      reporterAuthUserId: actorUserId,
      processPayload: { loTietKhuanId: args.batchId, maLo, quyTrinhId: qrRow?.id },
    },
    qrRow,
  );
  const now = new Date().toISOString();
  const { error: upErr } = await client
    .from("cssd_fact_lo_tiet_khuan")
    .update({
      ket_qua_test: false,
      ket_qua_bi: false,
      trang_thai_bi: "DUONG",
      trang_thai_me: "QC_KHONG_DAT",
      updated_at: now,
    })
    .eq("id", args.batchId)
    .eq("trang_thai_me", "CHO_BI")
    .is("ket_qua_test", null);
  if (upErr) return { ok: false, message: upErr.message };
  revalidateCssdIncidentSurfaces();
  return {
    ok: true,
    outcome: "QC_KHONG_DAT",
    incidentIds: [saved.incident_id],
    createdCount: saved.deduped ? 0 : 1,
    skippedCount: saved.deduped ? 1 : 0,
    recalledCount: saved.recalledCount ?? 0,
    machineHeld: Boolean(saved.machineHeld),
  };
}
