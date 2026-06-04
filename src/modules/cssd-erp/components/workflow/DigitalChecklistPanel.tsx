// src/modules/cssd-erp/components/workflow/DigitalChecklistPanel.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, AlertTriangle, ShieldAlert, AlertCircle, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { checkSetCompositionAndIssues, recordInstrumentTransaction } from "../../actions/cssd-write.actions";
import {
  loadBomCheckpoint,
  persistBomCheckpoint,
  requestReplenishFromReserveAction,
} from "../../actions/cssd-bom-checkpoint.actions";

interface Props {
  boDungCuId: string;
  quyTrinhId: string;
  onCheckFinished: (isOk: boolean, missingSummary?: string) => void;
}

export default function DigitalChecklistPanel({ boDungCuId, quyTrinhId, onCheckFinished }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const loadChecklist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await checkSetCompositionAndIssues(boDungCuId);
      if (res.success) {
        setData(res);
        
        // Tạo chuỗi tóm tắt các dụng cụ bị thiếu
        const missingItems = res.issues.filter((x: any) => x.is_missing);
        const missingSummary = missingItems
          .map((x: any) => `${x.ten_dung_cu} (Thiếu ${x.missing_count})`)
          .join(", ");

        onCheckFinished(!res.is_missing, res.is_missing ? missingSummary : undefined);
      } else {
        toast.error("Không tải được bảng kiểm: " + res.error);
      }
    } catch (e) {
      toast.error("Lỗi kết nối máy chủ kiểm chuẩn.");
    } finally {
      setLoading(false);
    }
  }, [boDungCuId, onCheckFinished]);

  useEffect(() => {
    if (boDungCuId) {
      void loadChecklist();
    }
  }, [boDungCuId, loadChecklist]);

  const handleAction = async (loaiDungCuId: string, action: "BAO_HONG" | "BAO_MAT" | "BO_SUNG") => {
    setUpdatingId(loaiDungCuId);
    try {
      const qty = action === "BO_SUNG" ? 1 : -1;
      const res =
        action === "BO_SUNG"
          ? await requestReplenishFromReserveAction({
              boDungCuId,
              loaiDungCuId: loaiDungCuId,
              quyTrinhId,
              quantity: 1,
              note: "QC Bảng kiểm kỹ thuật số tại trạm",
            })
          : await recordInstrumentTransaction({
              bo_dung_cu_id: boDungCuId,
              loai_dung_cu_id: loaiDungCuId,
              loai_giao_dich: action,
              so_luong_thay_doi: qty,
              quy_trinh_id: quyTrinhId,
              ghi_chu: `QC Bảng kiểm kỹ thuật số tại trạm`,
            });
      if (res.success) {
        toast.success("Đã cập nhật thay đổi thành công.");
        await loadChecklist();
      }
    } catch (e: any) {
      toast.error(e.message || "Cập nhật thất bại.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmCheckpoint = async () => {
    if (!quyTrinhId || !data) return;
    setConfirming(true);
    try {
      const cp = await loadBomCheckpoint(quyTrinhId);
      if (!cp.success || !cp.data?.length) {
        toast.error("Chưa có sổ cấu phần — quét trạm Đóng gói trước.");
        return;
      }
      const lines = cp.data.map((row: { id: string; so_luong_thuc_te: number }) => ({
        thanh_phan_id: row.id,
        so_luong_thuc_te: row.so_luong_thuc_te,
      }));
      const res = await persistBomCheckpoint({
        quy_trinh_id: quyTrinhId,
        lines,
        do_split: cp.heat?.requireSplit ? "REQUESTED" : "NONE",
        ghi_chu: "Digital BOM panel",
      });
      if (res.success) {
        toast.success("Đã ghi nhận KIEM_DEM_BOM — có thể tiếp tục quy trình.");
        onCheckFinished(!data.is_missing, undefined);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lưu checkpoint thất bại.");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl text-center space-y-3 animate-pulse">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#026f17] mx-auto" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Đang khởi tạo Bảng kiểm kỹ thuật số...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full text-slate-800 text-left">
      {/* 1. Banner Cảnh báo Poka-yoke Bộ hỗn hợp Nhiệt */}
      {data.heatCheck?.is_hybrid ? (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3 text-red-900 shadow-sm animate-in zoom-in-95">
          <ShieldAlert className="shrink-0 text-red-600 mt-0.5" size={20} strokeWidth={2.5} />
          <div className="space-y-1">
            <h5 className="text-[11px] font-black uppercase tracking-wider text-red-800">
              ⚠️ KHÓA AN TOÀN: BỘ DỤNG CỤ HỖN HỢP
            </h5>
            <p className="text-[10px] leading-relaxed text-red-700 font-medium">
              {data.heatCheck.message}
            </p>
            <div className="pt-1.5 flex items-center gap-2">
              <span className="inline-flex rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white uppercase shadow-sm">
                Khóa Steam 134°C
              </span>
              <span className="text-[11px] font-black text-red-600 underline hover:text-red-800 transition-colors cursor-pointer">
                Đọc quy trình tách gói hấp Plasma & STEAM
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800">
          <CheckCircle2 className="shrink-0 text-emerald-600" size={16} strokeWidth={2.5} />
          <span className="text-[10px] font-black uppercase tracking-wider">
            ✓ ĐỒNG NHẤT NHIỆT LÝ TÍNH (AN TOÀN HẤP 134°C)
          </span>
        </div>
      )}

      {/* 2. Banner Cảnh báo Thiếu dụng cụ */}
      {data.is_missing && (
        <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 shadow-sm animate-in zoom-in-95">
          <AlertCircle className="shrink-0 text-amber-600 mt-0.5" size={20} strokeWidth={2.5} />
          <div className="space-y-1">
            <h5 className="text-[11px] font-black uppercase tracking-wider text-amber-800">
              CẢNH BÁO: BỘ DỤNG CỤ THIẾU THÀNH PHẦN
            </h5>
            <p className="text-[10px] leading-relaxed text-amber-700 font-semibold">
              Số lượng thực tế của một số dụng cụ đang nhỏ hơn tiêu chuẩn thiết kế. Bạn có thể sử dụng các nút tương tác bên dưới để bổ sung từ kho dự phòng lẻ.
            </p>
          </div>
        </div>
      )}

      {/* 3. Danh sách Checklist BOM */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-inner space-y-3">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Thành phần mâm/hộp tiêu chuẩn
          </h4>
          <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${data.is_missing ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"}`}>
            {data.is_missing ? "⚠️ Thiếu" : "Đầy đủ"}
          </span>
        </div>

        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar divide-y divide-slate-100">
          {data.issues.map((item: any, index: number) => (
            <div 
              key={item.loai_dung_cu_id} 
              className={`pt-2 flex items-center justify-between gap-4 ${index === 0 ? "pt-0 border-t-0" : "border-t border-slate-100"}`}
            >
              <div className="space-y-0.5 min-w-0">
                <p className={`text-xs font-black truncate uppercase ${item.is_missing ? "text-red-600" : "text-slate-700"}`}>
                  {item.ten_dung_cu}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">Tiêu chuẩn: x{item.so_luong_tieu_chuan}</span>
                  <span 
                    className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                      item.is_missing 
                        ? "bg-red-50 text-red-600 font-extrabold" 
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    Thực tế: x{item.so_luong_thuc_te}
                  </span>
                </div>
              </div>

              {/* Tác vụ cập nhật biến động nhanh */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={updatingId !== null || item.so_luong_thuc_te <= 0}
                  onClick={() => void handleAction(item.loai_dung_cu_id, "BAO_HONG")}
                  className="p-1.5 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-lg transition-all"
                  title="Báo hỏng 1 chiếc (-1)"
                >
                  <Minus size={11} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  disabled={updatingId !== null || item.so_luong_thuc_te <= 0}
                  onClick={() => void handleAction(item.loai_dung_cu_id, "BAO_MAT")}
                  className="p-1.5 bg-white border border-slate-200 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 text-slate-400 rounded-lg transition-all text-[11px] font-bold leading-none px-2"
                  title="Báo mất 1 chiếc (-1)"
                >
                  Mất
                </button>
                <button
                  type="button"
                  disabled={updatingId !== null}
                  onClick={() => void handleAction(item.loai_dung_cu_id, "BO_SUNG")}
                  className="p-1.5 bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 hover:text-[#026f17] text-slate-400 rounded-lg transition-all"
                  title="Bổ sung từ kho lẻ (+1)"
                >
                  <Plus size={11} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {quyTrinhId ? (
        <button
          type="button"
          disabled={confirming || loading || data.is_missing || data.heatCheck?.is_hybrid}
          onClick={() => void handleConfirmCheckpoint()}
          className="w-full rounded-xl bg-[#026f17] px-4 py-3 text-[11px] font-black uppercase tracking-wider text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirming ? "Đang lưu kiểm đếm…" : "Xác nhận kiểm đếm (Digital BOM)"}
        </button>
      ) : null}
    </div>
  );
}
