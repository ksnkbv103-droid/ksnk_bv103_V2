// src/modules/cssd-erp/components/packaging/BomChecklistModal.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  AlertCircle, 
  Plus, 
  Minus, 
  X, 
  Loader2, 
  Flame, 
  CornerDownRight 
} from "lucide-react";
import { toast } from "sonner";
import { usePrint } from "@/hooks/usePrint";
import { CSSD_UI_SECTION_TITLE, CSSD_UI_TABLE_HEADER, CSSD_UI_STEP_HINT } from "../../shared/ui/cssd-ui-chrome";
import { loadBomCheckpoint, persistBomCheckpoint, requestReplenishFromReserveAction } from "../../actions/cssd-bom-checkpoint.actions";
import { recordInstrumentTransaction } from "../../actions/cssd-write.actions";
import { evaluateHeatCompatibility, summarizeBomGap, isReadyForPackaging } from "@/lib/domain/cssd-packaging-rules";
import BomGapBadge from "./BomGapBadge";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quyTrinhId: string;
  boDungCuId: string;
  onCheckFinished: (isOk: boolean, warningSummary?: string) => void;
}

export default function BomChecklistModal({ isOpen, onClose, quyTrinhId, boDungCuId, onCheckFinished }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [split, setSplit] = useState<"NONE" | "DONE">("NONE");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { printLabel } = usePrint();

  const fetchChecklist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await loadBomCheckpoint(quyTrinhId);
      if (res.success) {
        setItems(res.data);
      } else {
        toast.error("Không thể tải bảng kiểm.");
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi tải bảng kiểm cấu phần.");
    } finally {
      setLoading(false);
    }
  }, [quyTrinhId]);

  useEffect(() => {
    if (isOpen && quyTrinhId) {
      void fetchChecklist();
      setSplit("NONE");
    }
  }, [isOpen, quyTrinhId, fetchChecklist]);

  if (!isOpen) return null;

  // Ánh xạ dữ liệu sang domain format
  const domainItems = items.map(item => ({
    loai_id: item.loai_id,
    ten: item.ten,
    so_luong_ke_hoach: item.so_luong_ke_hoach,
    so_luong_thuc_te: item.so_luong_thuc_te,
    is_chiu_nhiet: item.is_chiu_nhiet,
    phan_loai_spaulding: item.phan_loai_spaulding,
    phuong_phap_tiet_khuan_chi_dinh: item.phuong_phap_tiet_khuan_chi_dinh,
  }));

  const heatEval = evaluateHeatCompatibility(domainItems);
  const gap = summarizeBomGap(domainItems);
  const readyCheck = isReadyForPackaging(domainItems, split);

  const handleAction = async (itemId: string, action: "BAO_HONG" | "BAO_MAT" | "BO_SUNG") => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setUpdatingId(itemId);
    try {
      const qty = action === "BO_SUNG" ? 1 : -1;
      const res = action === "BO_SUNG"
        ? await requestReplenishFromReserveAction({
            boDungCuId,
            loaiDungCuId: item.loai_id,
            quyTrinhId,
            quantity: 1,
            note: "QC Bảng kiểm kỹ thuật số tại trạm Đóng gói",
          })
        : await recordInstrumentTransaction({
            bo_dung_cu_id: boDungCuId,
            loai_dung_cu_id: item.loai_id,
            loai_giao_dich: action,
            so_luong_thay_doi: qty,
            quy_trinh_id: quyTrinhId,
            ghi_chu: `QC Báo ${action === "BAO_HONG" ? "hỏng" : "mất"} tại trạm Đóng gói`,
          });

      if (res.success) {
        toast.success("Cập nhật thay đổi thành công.");
        await fetchChecklist();
      } else {
        toast.error("Không thể cập nhật.");
      }
    } catch (e: any) {
      toast.error(e.message || "Thao tác thất bại.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSave = async () => {
    if (!readyCheck.ready) {
      toast.error(readyCheck.reason || "Bộ dụng cụ chưa đủ điều kiện đóng gói.");
      return;
    }

    setSaving(true);
    try {
      const lines = items.map(i => ({
        thanh_phan_id: i.id,
        so_luong_thuc_te: i.so_luong_thuc_te
      }));

      const res = await persistBomCheckpoint({
        quy_trinh_id: quyTrinhId,
        lines,
        do_split: split === "DONE" ? "REQUESTED" : "NONE",
      });

      if (res.success) {
        toast.success("Lưu checkpoint và đóng gói thành công.");

        if (res.ma_cycle_qr) {
          try {
            await printLabel({
              qrCode: res.ma_cycle_qr,
              tenBoDungCu: res.ten_bo || "Bộ dụng cụ CSSD",
              tram: "ĐÓNG GÓI · Cycle QR",
              nguoiThucHien: "CSSD",
              thoiGian: new Date().toLocaleString("vi-VN"),
            });
          } catch {
            toast.message("Đã lưu BOM — in nhãn cycle QR thất bại (popup bị chặn?). Mã: " + res.ma_cycle_qr);
          }
        }
        
        // Tạo tóm tắt gap để gửi cảnh báo ở Cấp phát
        const missingSummary = gap
          .filter(g => g.thieu > 0)
          .map(g => `${g.ten} (Thiếu ${g.thieu})`)
          .join(", ");

        onCheckFinished(gap.length === 0, gap.length > 0 ? missingSummary : undefined);
        onClose();
      } else {
        toast.error("Lưu checkpoint thất bại.");
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi lưu checkpoint.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative bg-white border border-slate-200 rounded-3xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h3 className={CSSD_UI_SECTION_TITLE}>Digital BOM Checklist & QC</h3>
              {!loading && <BomGapBadge heat={heatEval} gap={gap} />}
            </div>
            <p className="text-[11px] font-semibold text-slate-400">
              Mã quy trình: {quyTrinhId.slice(0, 8)}... | Mã bộ: {boDungCuId.slice(0, 8)}...
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex-1 p-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-[var(--primary)]" size={36} strokeWidth={2.5} />
            <p className={CSSD_UI_STEP_HINT}>Đang đối chiếu dữ liệu danh mục…</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-700">
            
            {/* 1. Safety Alerts */}
            {heatEval.requireSplit && (
              <div className="p-4.5 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-start gap-3.5 text-rose-950 shadow-sm animate-in zoom-in-98 duration-300">
                <ShieldAlert className="shrink-0 text-rose-600 mt-0.5" size={22} strokeWidth={2.5} />
                <div className="space-y-1.5 flex-1">
                  <h5 className="text-[11px] font-semibold uppercase tracking-wide text-rose-800 flex items-center gap-1.5">
                    ⚠️ KHÓA AN TOÀN CHỊU NHIỆT (POKA-YOKE)
                  </h5>
                  <p className="text-[11px] leading-relaxed text-rose-700 font-medium">
                    {heatEval.reason}
                  </p>
                  <div className="pt-2 flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold text-white uppercase shadow-sm">
                      Khóa hấp Steam 134°C
                    </span>
                    
                    {split === "NONE" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSplit("DONE");
                          toast.success("Đã xác nhận tách các dụng cụ nhạy cảm nhiệt.");
                        }}
                        className="bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all text-white text-[11px] font-semibold uppercase tracking-wide px-3 py-1 rounded-lg shadow-md"
                      >
                        [ Xác nhận tách Sub-set ]
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-rose-100 border border-rose-200 text-rose-800 rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
                        ✓ ĐÃ TÁCH SUB-SET (Hấp Plasma)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {gap.length > 0 && (
              <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start gap-3 text-amber-950 shadow-sm animate-in zoom-in-98 duration-300">
                <AlertCircle className="shrink-0 text-amber-600 mt-0.5" size={20} strokeWidth={2.5} />
                <div className="space-y-1">
                  <h5 className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                    CẢNH BÁO: BỘ DỤNG CỤ THIẾU CẤU PHẦN
                  </h5>
                  <p className="text-[11px] leading-relaxed text-amber-700 font-medium">
                    Số lượng thực tế đang nhỏ hơn tiêu chuẩn thiết kế. Bạn có thể sử dụng các nút tương tác bên dưới để báo hỏng, báo mất hoặc bù dụng cụ lẻ từ kho dự phòng.
                  </p>
                </div>
              </div>
            )}

            {/* 2. Flat Table */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200">
                    <th className={`py-2.5 px-3 ${CSSD_UI_TABLE_HEADER} w-12 text-center`}>STT</th>
                    <th className={`py-2.5 px-3 ${CSSD_UI_TABLE_HEADER}`}>Cấu phần chuẩn</th>
                    <th className={`py-2.5 px-3 ${CSSD_UI_TABLE_HEADER} w-16 text-center`}>KH</th>
                    <th className={`py-2.5 px-3 ${CSSD_UI_TABLE_HEADER} w-16 text-center`}>TT</th>
                    <th className={`py-2.5 px-3 ${CSSD_UI_TABLE_HEADER} w-36 text-center`}>Tương tác QC</th>
                    <th className={`py-2.5 px-3 ${CSSD_UI_TABLE_HEADER} w-24 text-center`}>Nhiệt / Spaulding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {items.map((item, idx) => {
                    const isMissing = item.so_luong_thuc_te < item.so_luong_ke_hoach;
                    const isUpdating = updatingId === item.id;
                    
                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-slate-100/40 transition-colors ${
                          isMissing ? "bg-red-50/10" : ""
                        }`}
                      >
                        <td className="py-3 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          <div className="space-y-0.5">
                            <span className="uppercase text-xs font-black">{item.ten}</span>
                            {!item.is_chiu_nhiet && (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
                                <CornerDownRight size={10} />
                                Nhạy nhiệt (Cần tách hấp PLASMA)
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500 font-extrabold">{item.so_luong_ke_hoach}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-black text-xs ${
                            isMissing 
                              ? "bg-red-100 text-red-700" 
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {item.so_luong_thuc_te}
                          </span>
                        </td>
                        
                        {/* QC Action buttons */}
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              disabled={isUpdating || item.so_luong_thuc_te <= 0}
                              onClick={() => void handleAction(item.id, "BAO_HONG")}
                              className="p-1 bg-white border border-slate-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 text-slate-400 rounded-lg transition-all"
                              title="Báo hỏng 1 chiếc (-1)"
                            >
                              <Minus size={11} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              disabled={isUpdating || item.so_luong_thuc_te <= 0}
                              onClick={() => void handleAction(item.id, "BAO_MAT")}
                              className="p-1 bg-white border border-slate-200 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50 text-slate-400 rounded-lg transition-all text-[11px] font-black px-1.5 py-0.5 leading-none"
                              title="Báo mất 1 chiếc (-1)"
                            >
                              Mất
                            </button>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => void handleAction(item.id, "BO_SUNG")}
                              className="p-1 bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 text-slate-400 rounded-lg transition-all"
                              title="Bù kho lẻ dự phòng (+1)"
                            >
                              <Plus size={11} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-[11px] font-semibold uppercase tracking-wide px-1.5 py-0.2 rounded-md ${
                              item.is_chiu_nhiet 
                                ? "bg-slate-100 text-slate-600" 
                                : "bg-rose-100 text-rose-700 animate-pulse"
                            }`}>
                              {item.is_chiu_nhiet ? "Chịu nhiệt" : "⚡ Nhạy nhiệt"}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400 uppercase">
                              {item.phan_loai_spaulding}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {!loading && readyCheck.ready ? (
              <span className="text-emerald-700">✓ Bộ dụng cụ đủ điều kiện đóng gói</span>
            ) : (
              <span className="text-rose-600">⚠️ Chờ xác nhận tách dụng cụ nhạy nhiệt</span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all text-slate-600 text-xs font-bold px-4 py-2 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={loading || saving || !readyCheck.ready}
              onClick={() => void handleSave()}
              className="min-w-[120px] flex items-center justify-center gap-1.5 bg-[var(--primary)] hover:bg-[#015210] active:scale-95 transition-all text-white text-[11px] font-semibold uppercase tracking-wide px-5 py-2 rounded-xl shadow-md disabled:opacity-50 disabled:scale-100"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  Đang đóng...
                </>
              ) : (
                "Đóng gói (Đạt)"
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
