import type { SupabaseClient } from "@supabase/supabase-js";
import type { Station } from "../../types/cssd.types";
import { previousWorkflowStation, validateStationAdvance } from "../domain/cssd-state-engine";
import { insertCssdLifecycleEvent } from "../../shared/application/cssd-lifecycle-events";
import { assertLedgerDuChoCapPhat } from "./cssd-asset-ledger";
import { assertMergeGateForCapPhat } from "./cssd-merge-gate";
import { fetchActiveQuyTrinhByScanCode } from "../../shared/application/cssd-workflow-resolve";
import { assertPackIssuable } from "@/lib/domain/cssd-pack-issuance";
import { rejectParentBoScan } from "@/lib/domain/cssd-heat-split";
import { loadPackBatchReleaseGate } from "../../helpers/pack-batch-release-gate";
import {
  assertLamSachLotSoftGate,
  pickLamSachLotFromPayload,
} from "@/lib/domain/cssd-lam-sach-lot-gate";
import { tableHasColumn } from "../../shared/cssd-db-utils";

export type WorkflowQuyTrinhInput = {
  id: string;
  ma_qr_quy_trinh?: string | null;
  ma_trang_thai_hien_tai?: string | null;
  thoi_gian_tiep_nhan?: string | null;
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
): Promise<{
  tenBoDungCu: string;
  ledgerWarning?: string;
  quyTrinhId: string | null;
  maCycleQr: string | null;
  khoaNhanId: string | null;
}> {
  const qr = String(opts.maQR || "").trim().toUpperCase();
  const operator = String(opts.operatorLabel || "").trim() || "CSSD";
  const targetStation = opts.station;
  let ledgerWarning: string | undefined;

  const quyTrinh =
    opts.quyTrinh?.id
      ? opts.quyTrinh
      : (await fetchLatestActiveWorkflowByQr(supabase, qr)) ?? opts.quyTrinh;

  if (opts.hasDongBangColumn && quyTrinh.is_dong_bang === true) {
    throw new Error("Bộ dụng cụ này đang bị KHÓA AN TOÀN do sự cố cấu phần hoặc quy trình.");
  }

  const currentStatus = String(quyTrinh.ma_trang_thai_hien_tai || "").trim() as Station | "";
  const tiepNhanPending =
    currentStatus === "TIEP_NHAN" &&
    targetStation === "TIEP_NHAN" &&
    !String(quyTrinh.thoi_gian_tiep_nhan || "").trim();
  const advance = validateStationAdvance({
    currentStatus,
    targetStation,
    tiepNhanPending,
  });
  if (!advance.ok) throw new Error(advance.message);

  // CSSD-04: bộ mẹ (có thành phần / MAIN) không quét qua trạm.
  {
    const boId = String(quyTrinh.bo_dung_cu_id || "").trim();
    let hasChildComponents = false;
    if (boId && (await tableHasColumn(supabase, "cssd_dm_bo_dung_cu", "parent_bo_id"))) {
      const { count, error: childErr } = await supabase
        .from("cssd_dm_bo_dung_cu")
        .select("id", { count: "exact", head: true })
        .eq("parent_bo_id", boId)
        .eq("is_active", true);
      if (!childErr && (count ?? 0) > 0) hasChildComponents = true;
    }
    let maVaiTroBo = "";
    let hasActiveSub = false;
    if (quyTrinh.id && (await tableHasColumn(supabase, "cssd_fact_quy_trinh", "ma_vai_tro_bo"))) {
      const roleRow = await supabase
        .from("cssd_fact_quy_trinh")
        .select("ma_vai_tro_bo")
        .eq("id", quyTrinh.id)
        .maybeSingle();
      maVaiTroBo = String((roleRow.data as { ma_vai_tro_bo?: string } | null)?.ma_vai_tro_bo || "");
      if (await tableHasColumn(supabase, "cssd_fact_quy_trinh", "quy_trinh_cha_id")) {
        const { count: subCount } = await supabase
          .from("cssd_fact_quy_trinh")
          .select("id", { count: "exact", head: true })
          .eq("quy_trinh_cha_id", quyTrinh.id)
          .eq("ma_vai_tro_bo", "SUB")
          .eq("is_active", true);
        hasActiveSub = (subCount ?? 0) > 0;
      }
    }
    const parentBlock = rejectParentBoScan({ hasChildComponents, maVaiTroBo, hasActiveSub });
    if (parentBlock) throw new Error(parentBlock);
  }

  // 0b. LAM_SACH (QT.18) — soft-warn lot enzyme / washer (không hard-block)
  // Plasma–cellulose: cổng danh mục + nạp mẻ (không hỏi trên Đóng gói).
  if (targetStation === "LAM_SACH") {
    const lotGate = assertLamSachLotSoftGate(pickLamSachLotFromPayload(opts.extraPayload));
    if ("warning" in lotGate && lotGate.warning) {
      ledgerWarning = ledgerWarning
        ? `${ledgerWarning} | ${lotGate.warning}`
        : lotGate.warning;
      if (quyTrinh.id) {
        await insertCssdLifecycleEvent(supabase, {
          quy_trinh_id: quyTrinh.id,
          ma_su_kien: "LAM_SACH_LOT_SOFT_WARNING",
          ma_tram: "LAM_SACH",
          ghi_chu: lotGate.warning,
          payload: { soft_gate: true, ...pickLamSachLotFromPayload(opts.extraPayload) },
        });
      }
    }
  }

  // 1. Kiểm tra an toàn trước khi quét (Safety Lock cho Cấp phát)
  if (targetStation === "CAP_PHAT" && quyTrinh.id) {
    const mergeGate = await assertMergeGateForCapPhat(supabase, quyTrinh);
    if (!mergeGate.ok) throw new Error(mergeGate.message);
  }

  if (targetStation === "CAP_PHAT") {
    const qtRow = await fetchActiveQuyTrinhByScanCode(supabase, qr);
    const qt = qtRow as {
      id?: string;
      lo_tiet_khuan_id?: string | null;
      is_dong_bang?: boolean | null;
      han_su_dung?: string | null;
      ngay_het_han?: string | null;
      tinh_trang?: string | null;
      is_red_alert?: boolean | null;
    } | null;

    if (qt?.id) {
      if (qt.is_dong_bang) {
        throw new Error("Bộ dụng cụ này đang bị KHÓA AN TOÀN do sự cố cấu phần hoặc quy trình.");
      }
      const batchRelease = await loadPackBatchReleaseGate(supabase, {
        quyTrinhId: String(qt.id),
        loTietKhuanId: qt.lo_tiet_khuan_id,
      });
      const packGate = assertPackIssuable({
        han_su_dung: qt.han_su_dung,
        ngay_het_han: qt.ngay_het_han,
        tinh_trang: qt.tinh_trang,
        is_red_alert: qt.is_red_alert,
        is_dong_bang: qt.is_dong_bang,
        batchRelease,
      });
      if (!packGate.ok) throw new Error(packGate.message);
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
        ledgerWarning = ledger.warning;
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

  // 2. Một RPC atomic: quét trạm + (CAP_PHAT) khoa nhận/ma_ca_mo_id + (DONG_GOI) mã chu trình.
  // Domain 23: CAP_PHAT chỉ lưu ma_ca_mo_id để truy vết — KHÔNG set used_clinically.
  const isCapPhat = targetStation === "CAP_PHAT";
  const khoaNhanRaw = String(opts.extraPayload?.khoa_nhan_id || "").trim();
  const maCaMoRaw = String(opts.extraPayload?.ma_ca_mo_id || "").trim();
  const { data, error } = await supabase.rpc("rpc_cssd_scan_station_commit", {
    p_ma_qr: qr,
    p_target_station: targetStation,
    p_operator_label: operator,
    p_khoa_nhan_id: isCapPhat && khoaNhanRaw ? khoaNhanRaw : null,
    p_ma_ca_mo_id: isCapPhat && maCaMoRaw ? maCaMoRaw : null,
  });

  if (error) throw new Error(`Lỗi hệ thống: ${error.message}`);

  const result = data as {
    success?: boolean;
    code?: string;
    message?: string;
    quy_trinh_id?: string | null;
    ma_cycle_qr?: string | null;
    khoa_nhan_id?: string | null;
  } | null;
  if (!result?.success) {
    throw new Error(result?.message || "Không thể thực hiện quét trạm.");
  }

  return {
    tenBoDungCu: qr,
    ledgerWarning,
    quyTrinhId: result.quy_trinh_id ? String(result.quy_trinh_id) : null,
    maCycleQr: result.ma_cycle_qr ? String(result.ma_cycle_qr) : null,
    khoaNhanId: result.khoa_nhan_id ? String(result.khoa_nhan_id) : null,
  };
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
    /** auth user id phiên — bắt buộc khi `supabase` là admin client (service_role). */
    actorUserId?: string;
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

  // CSSD-006: một RPC nguyên tử (khóa dòng, kiểm trạm, đổi trạm + xóa dấu trạm + gỡ mẻ chưa chốt nạp,
  // ghi nhật ký TRA_VE + ngoại lệ TRA_LUI_VOLUNTARY_ONE_STEP). Sai điều kiện → không ghi gì.
  const { data: rpcRes, error: rpcErr } = await supabase.rpc("rpc_cssd_tra_lui_mot_buoc", {
    p_quy_trinh_id: q.id,
    p_tu_tram: currentStatus,
    p_ly_do: lyDo,
    p_actor_user_id: opts.actorUserId || null,
    p_nguoi_thao_tac: operator,
    p_ma_qr: qr,
  });
  if (rpcErr) throw new Error(`Lỗi hệ thống: ${rpcErr.message}`);
  const res = rpcRes as { success: boolean; message?: string } | null;
  if (!res?.success) throw new Error(res?.message || "Không trả lui được.");

  return { from: currentStatus, to: prev };
}
