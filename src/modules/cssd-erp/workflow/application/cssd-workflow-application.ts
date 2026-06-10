import type { SupabaseClient } from "@supabase/supabase-js";
import type { Station } from "../../types/cssd.types";
import { buildQuyTrinhTramPatch } from "../../lib/cssd-tram-persist";
import { previousWorkflowStation, validateStationAdvance } from "../domain/cssd-state-engine";
import { insertCssdLifecycleEvent } from "../../shared/application/cssd-lifecycle-events";
import { assertLedgerDuChoCapPhat, syncThanhPhanTuTemplate } from "./cssd-asset-ledger";
import { assertMergeGateForCapPhat } from "./cssd-merge-gate";
import { fetchActiveQuyTrinhByScanCode } from "../../shared/application/cssd-workflow-resolve";

export type WorkflowQuyTrinhInput = {
  id: string;
  ma_qr_quy_trinh?: string | null;
  ma_trang_thai_hien_tai?: string | null;
  bo_dung_cu_id?: string | null;
  is_dong_bang?: boolean | null;
};

export async function fetchLatestActiveWorkflowByQr(
  supabase: SupabaseClient,
  maQR: string,
): Promise<WorkflowQuyTrinhInput | null> {
  const data = await fetchActiveQuyTrinhByScanCode(supabase, maQR);
  return (data as WorkflowQuyTrinhInput | null) ?? null;
}


export async function executeWorkflowStationScan(
  supabase: SupabaseClient,
  opts: {
    maQR: string;
    station: Station;
    quyTrinh: WorkflowQuyTrinhInput;
    hasDongBangColumn: boolean;
    /** Hiển thị trên nhật ký (email NV nếu có). */
    operatorLabel?: string;
    extraPayload?: Record<string, any>;
  },
): Promise<{ tenBoDungCu: string }> {
  const qr = String(opts.maQR || "").trim().toUpperCase();
  const operator = String(opts.operatorLabel || "").trim() || "CSSD";
  const targetStation = opts.station;

  const quyTrinh =
    opts.quyTrinh?.id
      ? opts.quyTrinh
      : (await fetchLatestActiveWorkflowByQr(supabase, qr)) ?? opts.quyTrinh;

  const currentStatus = String(quyTrinh.ma_trang_thai_hien_tai || "").trim();
  if (currentStatus) {
    const advance = validateStationAdvance({
      currentStatus: currentStatus as Station,
      targetStation,
    });
    if (!advance.ok) throw new Error(advance.message);
  }

  // BOM runtime sync tại trạm Đóng gói (P0 QLDCPT)
  if (targetStation === "DONG_GOI" && quyTrinh.id) {
    const boId = String(quyTrinh.bo_dung_cu_id || "").trim();
    if (boId) {
      const sync = await syncThanhPhanTuTemplate(supabase, quyTrinh.id, boId);
      if (!sync.ok) throw new Error(sync.message);
    }
  }

  // 1. Kiểm tra an toàn trước khi quét (Safety Lock cho Cấp phát)
  if (targetStation === "CAP_PHAT" && quyTrinh.id) {
    const mergeGate = await assertMergeGateForCapPhat(supabase, quyTrinh);
    if (!mergeGate.ok) throw new Error(mergeGate.message);
  }

  if (targetStation === "CAP_PHAT") {
    const qtRow = await fetchActiveQuyTrinhByScanCode(supabase, qr);
    const qt = qtRow as { id?: string; lo_tiet_khuan_id?: string | null; is_dong_bang?: boolean | null } | null;

    if (qt?.id) {
      if (qt.is_dong_bang) {
        throw new Error("Bộ dụng cụ này đang bị KHÓA AN TOÀN do sự cố cấu phần hoặc quy trình.");
      }
      if (!qt.lo_tiet_khuan_id) {
        throw new Error("Bộ dụng cụ này CHƯA VÀO MẺ TIỆT KHUẨN. Không thể cấp phát.");
      }
      
      const { data: me } = await supabase
        .from("cssd_fact_lo_tiet_khuan")
        .select("ma_lo_tiet_khuan, ket_qua_test")
        .eq("id", qt.lo_tiet_khuan_id)
        .maybeSingle();
      
      if (!me || me.ket_qua_test === null) {
        throw new Error(`Mẻ tiệt khuẩn ${me?.ma_lo_tiet_khuan || "liên quan"} CHƯA CÓ KẾT QUẢ NỘI KIỂM. Vui lòng xác nhận kết quả mẻ trước.`);
      }
      if (me.ket_qua_test === false) {
        throw new Error(`Mẻ tiệt khuẩn ${me.ma_lo_tiet_khuan} KHÔNG ĐẠT chuẩn. Bộ dụng cụ này phải được tái xử lý.`);
      }

      const ledger = await assertLedgerDuChoCapPhat(supabase, qt.id);
      if (!ledger.ok) throw new Error(ledger.message);
      if ("warning" in ledger && ledger.warning) {
        await insertCssdLifecycleEvent(supabase, {
          quy_trinh_id: qt.id,
          ma_su_kien: "CAP_PHAT_BOM_GAP_WARNING",
          ma_tram: "CAP_PHAT",
          ghi_chu: ledger.warning,
          payload: { soft_gate: true },
        });
      }
    }
  }

  // 2. Gọi RPC duy nhất để xử lý logic, phân quyền và ghi log tại Database
  const { data, error } = await supabase.rpc("rpc_scan_workflow_station", {
    p_ma_qr: qr,
    p_target_station: targetStation,
    p_operator_label: operator,
  });

  if (error) throw new Error(`Lỗi hệ thống: ${error.message}`);
  
  const result = data as { success: boolean; message?: string };
  if (!result.success) {
    throw new Error(result.message || "Không thể thực hiện quét trạm.");
  }

  // 3. Xử lý extraPayload (Ví dụ: Truy vết ca mổ tại trạm Cấp phát)
  if (targetStation === "CAP_PHAT" && opts.extraPayload?.ma_ca_mo_id && quyTrinh.id) {
    await supabase
      .from("cssd_fact_quy_trinh")
      .update({
        metadata: {
          ma_ca_mo_id: String(opts.extraPayload.ma_ca_mo_id),
        },
      })
      .eq("id", quyTrinh.id);
  }

  return { tenBoDungCu: qr };
}

/** Trả bộ lui đúng 1 trạm (ngoại lệ vận hành có kiểm soát — không áp TK/CP). */
export async function executeRejectToPreviousStation(
  supabase: SupabaseClient,
  opts: {
    maQR: string;
    quyTrinh: WorkflowQuyTrinhInput;
    hasDongBangColumn: boolean;
    lyDo: string;
    operatorLabel?: string;
  },
): Promise<{ from: Station; to: Station }> {
  const qr = String(opts.maQR || "").trim().toUpperCase();
  const q = opts.quyTrinh;
  const operator = String(opts.operatorLabel || "").trim() || "CSSD";
  const currentStatus = String(q.ma_trang_thai_hien_tai || "").trim() as Station;

  if (opts.hasDongBangColumn && q.is_dong_bang === true) {
    throw new Error("Đang khóa an toàn — không trả lui thủ công.");
  }
  if (currentStatus === "TIET_KHUAN" || currentStatus === "CAP_PHAT") {
    throw new Error(
      "Không trả lui thủ công từ Tiệt khuẩn hoặc Cấp phát — dùng phiếu mẻ và báo sự cố theo quy định.",
    );
  }
  const prev = previousWorkflowStation(currentStatus);
  if (!prev) throw new Error("Không thể trả lui từ trạm Tiếp nhận.");

  const lyDo = String(opts.lyDo || "").trim();
  if (!lyDo) throw new Error("Vui lòng nhập lý do trả lui.");

  const tramPatch = await buildQuyTrinhTramPatch(supabase, prev);
  const { error: upErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .update({
      ...tramPatch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", q.id);
  if (upErr) throw new Error(upErr.message);

  const lc = await insertCssdLifecycleEvent(supabase, {
    quy_trinh_id: q.id,
    ma_su_kien: "TRA_LUI_VOLUNTARY_ONE_STEP",
    ma_tram: currentStatus,
    ghi_chu: `Trả lui ${currentStatus} → ${prev}`,
    payload: {
      ma_qr_quy_trinh: qr,
      tu: currentStatus,
      den: prev,
      ly_do: lyDo,
      nguoi_thao_tac: operator,
    },
  });
  if (!lc.ok && !/fact_cssd_lifecycle_event|does not exist/i.test(lc.message)) throw new Error(lc.message);


  return { from: currentStatus, to: prev };
}
