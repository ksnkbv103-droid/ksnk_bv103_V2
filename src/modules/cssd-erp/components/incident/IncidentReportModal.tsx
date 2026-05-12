// src/modules/cssd-erp/components/incident/IncidentReportModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, X, CheckCircle2, ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useModulePermission } from "@/hooks/useModulePermission";
import { createIncidentReport } from "../../actions/cssd.actions";
import type { Station } from "../../types/cssd.types";
import IncidentFormFields from "./IncidentFormFields";

interface Props { isOpen: boolean; onClose: () => void; station?: string; onSuccess?: () => void; }

/**
 * Modal báo cáo sự cố CSSD - Rebuild sạch (≤ 180 dòng)
 * Đã tách Component con để tối ưu tính đóng gói.
 */
export default function IncidentReportModal({ isOpen, onClose, station, onSuccess }: Props) {
  const { allowed } = useModulePermission("BAO_SU_CO");
  const [loading, setLoading] = useState(false);
  const [fLoading, setFLoading] = useState(false);
  const [fError, setFError] = useState<string | null>(null);
  const [form, setForm] = useState({ maQR: "", typeId: "", typeTen: "", desc: "", errorQR: "", machineId: "" });
  const [categories, setCategories] = useState<{ id: string; ten: string }[]>([]);
  const [machines, setMachines] = useState<{ id: string; ten: string }[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setFLoading(true); setFError(null);
      try {
        const [cRes, mRes] = await Promise.all([
          supabase.from("dm_loai_su_co").select("id, ten_loai_su_co").eq("is_active", true).order("ten_loai_su_co"),
          supabase.from("dm_loai_may_tiet_khuan").select("id, ten_loai_may").eq("is_active", true).order("ten_loai_may"),
        ]);
        if (cRes.error) throw new Error(cRes.error.message);
        const cats = (cRes.data || []).map((c: { id: string; ten_loai_su_co?: string }) => ({ id: c.id, ten: c.ten_loai_su_co || "" }));
        setCategories(cats);
        if (cats.length > 0 && !form.typeId) setForm(f => ({ ...f, typeId: cats[0].id, typeTen: cats[0].ten }));
        if (mRes.data)
          setMachines(
            mRes.data.map((m: { id: string; ten_loai_may?: string }) => ({ id: m.id, ten: m.ten_loai_may || "" }))
          );
      } catch (err: unknown) {
        setFError(err instanceof Error ? err.message : "Lỗi tải danh mục");
      } finally {
        setFLoading(false);
      }
    })();
  }, [isOpen]);

  // Kiểm tra quyền BAO_SU_CO theo registry mới
  if (!isOpen || !allowed.create) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.maQR || !form.desc) return toast.error("Vui lòng điền đủ thông tin");
    setLoading(true);
    try {
      const res = await createIncidentReport({
        ...form,
        station: (station || "TIEP_NHAN") as Station,
      });
      if (res.isRedAlert)
        toast.error(
          "⚠️ CẢNH BÁO ĐỎ: Mã QR này đã có từ 2 sự cố trước — lần báo này được đánh dấu đỏ.",
          { duration: 8000 },
        );
      else toast.success("Đã ghi nhận sự cố và rollback.");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không gửi được báo cáo");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm pointer-events-auto transition-all animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl border-t-4 sm:border-4 border-red-500/10 flex flex-col max-h-[95vh] touch-manipulation">
        <div className="bg-[#026f17] p-5 flex items-center justify-between text-[#FFD700] shrink-0 shadow-md">
          <div className="flex items-center gap-3 font-black uppercase text-[10px] tracking-[0.2em]"><AlertTriangle className="animate-pulse" size={20} /> BÁO CÁO SỰ CỐ</div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-full active:scale-90 transition-all"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto pb-12">
          {fError && <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-100 flex gap-3 text-red-600 animate-in shake duration-500"><AlertCircle className="shrink-0" size={20} /><div className="text-[10px] font-bold leading-tight">Không tải được danh mục: {fError}</div></div>}
          {fLoading ? <div className="py-20 flex flex-col items-center justify-center gap-4 text-[#026f17]"><Loader2 className="animate-spin" size={32} /><p className="text-[10px] font-black uppercase tracking-widest opacity-40">Đang tải...</p></div> : (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạm phát hiện</span>
                <span className="text-[10px] font-black text-[#026f17] uppercase">{(station || "TIEP_NHAN").replace(/_/g, " ")}</span>
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Quét mã QR quy trình</label>
                <input value={form.maQR} onChange={e => handleFieldChange("maQR", e.target.value.toUpperCase())} className="w-full h-16 px-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-red-600 outline-none focus:border-red-500 transition-all text-xl" placeholder="MÃ QR..." autoFocus />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Loại sự cố</label>
                <div className="relative">
                  <select value={form.typeId} onChange={e => { const sel = categories.find(c => c.id === e.target.value); setForm(f => ({ ...f, typeId: e.target.value, typeTen: sel?.ten || "" })); }} className="w-full h-16 px-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-slate-700 outline-none focus:border-[#026f17] transition-all appearance-none">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.ten}</option>)}
                  </select>
                  <ChevronDown className="absolute right-6 top-6 text-slate-300 pointer-events-none" size={20} />
                </div>
              </div>
              <IncidentFormFields typeTen={form.typeTen} formData={form} onChange={handleFieldChange} machines={machines} />
            </div>
          )}
          <button type="submit" disabled={loading || !!fError} className="w-full h-16 bg-red-600 text-white rounded-[32px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-red-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
            {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> XÁC NHẬN BÁO CÁO</>}
          </button>
        </form>
      </div>
    </div>
  );
}
