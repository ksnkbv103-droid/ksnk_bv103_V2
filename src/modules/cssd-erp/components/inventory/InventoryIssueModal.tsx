// src/modules/cssd-erp/components/inventory/InventoryIssueModal.tsx
"use client";

import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";

import React, { useState } from "react";
import { X, Camera, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { reportInventoryIssue } from "../../contexts/inventory-instrument/entrypoint";

interface Props { isOpen: boolean; onClose: () => void; tool: any; onSuccess: () => void; }

/**
 * Modal báo hỏng / báo mất dụng cụ (≤ 180 dòng)
 * Hỗ trợ nhập lý do, ghi chú và tạo log giao dịch kho.
 */
export default function InventoryIssueModal({ isOpen, onClose, tool, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("HONG"); // HONG | MAT
  const [note, setNote] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await reportInventoryIssue({
        quy_trinh_id: String(tool.id),
        ma_vach_qr: typeof tool.ma_vach_qr === "string" ? tool.ma_vach_qr : null,
        reason: reason === "MAT" ? "MAT" : "HONG",
        note,
      });
      if (!result.success) throw new Error("Không ghi nhận được sự cố kho.");

      toast.success(`Đã báo cáo ${reason === 'HONG' ? 'HỎNG' : 'MẤT'} cho bộ ${tool.ma_vach_qr}`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !tool) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-t-[48px] sm:rounded-[48px] overflow-hidden shadow-2xl flex flex-col p-8 space-y-6 touch-manipulation">
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-4">
            <div className="bg-red-500 p-3 rounded-2xl text-white shadow-lg"><AlertTriangle size={24} /></div>
            <div>
              <h4 className={`${UI.modalTitle} text-red-600`}>Báo cáo sự cố kho</h4>
              <p className={`${UI.innerTableCode} mt-1 text-slate-400`}>{tool.ma_vach_qr}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center border border-slate-100 active:scale-90 transition-all"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-3">
            <button type="button" onClick={() => setReason("HONG")} className={`flex-1 h-16 rounded-2xl border-2 font-black text-[11px] uppercase transition-all ${reason === 'HONG' ? 'bg-red-50 border-red-500 text-red-600' : 'bg-slate-50 border-slate-50 text-slate-400'}`}>Dụng cụ Hỏng</button>
            <button type="button" onClick={() => setReason("MAT")} className={`flex-1 h-16 rounded-2xl border-2 font-black text-[11px] uppercase transition-all ${reason === 'MAT' ? 'bg-slate-800 border-slate-800 text-white' : 'bg-slate-50 border-slate-50 text-slate-400'}`}>Dụng cụ Mất</button>
          </div>

          <div className={UI.sectionGap}>
            <button type="button" className="w-full h-24 bg-slate-50 border-4 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-300 hover:text-[var(--primary)] hover:border-[var(--primary)]/20 transition-all active:scale-[0.98]">
              <Camera size={32} />
              <span className="text-[11px] font-semibold uppercase tracking-wide">Chụp ảnh minh chứng</span>
            </button>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Nhập lý do hỏng/mất hoặc ghi chú chi tiết..." className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium outline-none focus:border-[var(--primary)] resize-none h-32 transition-all" />
          </div>

          <button type="submit" disabled={loading} className={`w-full h-20 bg-red-600 text-white rounded-2xl ${UI.btnTouch} shadow-xl shadow-red-100 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-4`}>
            {loading ? <Loader2 className="animate-spin" size={28} /> : <><CheckCircle2 size={24} /> GỬI BÁO CÁO</>}
          </button>
        </form>
      </div>
    </div>
  );
}
