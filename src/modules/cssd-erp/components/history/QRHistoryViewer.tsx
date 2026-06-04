// src/modules/cssd-erp/components/history/QRHistoryViewer.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, History, CheckCircle2, AlertTriangle, Clock, User, QrCode } from "lucide-react";
import { toast } from "sonner";
import { fetchCssdQrHistory } from "../../actions/cssd-qr-history.actions";

interface HistoryLog {
  id: string;
  tram: string;
  hanh_dong: string;
  created_at: string;
  ghi_chu: string;
}

/**
 * Component Truy vết lịch sử bộ dụng cụ (QR History Viewer)
 * Tối ưu Mobile-first, hiển thị Timeline dọc chuẩn Quân y (#026f17 + #FFD700).
 */
type Props = {
  /** Mã QR ban đầu (từ URL hoặc sau quét). */
  initialQr?: string;
};

export default function QRHistoryViewer({ initialQr }: Props) {
  const [code, setCode] = useState(() => String(initialQr || "").trim().toUpperCase());
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [process, setProcess] = useState<any>(null);
  const autoFetched = useRef<string | null>(null);

  const fetchHistory = async (qr: string) => {
    if (!qr.trim()) return toast.error("Vui lòng nhập mã QR");
    setLoading(true);
    try {
      const res = await fetchCssdQrHistory(qr);
      if (!res.success) throw new Error(res.error);
      setProcess(res.process);
      setHistory(res.history);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi truy vết");
      setHistory([]);
      setProcess(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const seed = String(initialQr || "").trim().toUpperCase();
    if (!seed || autoFetched.current === seed) return;
    autoFetched.current = seed;
    setCode(seed);
    void fetchHistory(seed);
  }, [initialQr]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 touch-manipulation pointer-events-auto">
      {/* 1. Thanh tìm kiếm / Quét mã */}
      <div className="bg-[#026f17] p-1.5 rounded-[28px] flex items-center gap-2 shadow-2xl shadow-green-900/20 border border-white/10">
        <div className="pl-5 text-[#FFD700] opacity-50"><QrCode size={20} /></div>
        <input 
          value={code} 
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && fetchHistory(code)}
          placeholder="NHẬP HOẶC QUÉT MÃ QR..."
          className="bg-transparent w-full h-14 rounded-2xl text-base font-black text-[#FFD700] placeholder:text-[#FFD700]/30 outline-none"
        />
        <button 
          onClick={() => fetchHistory(code)}
          className="bg-[#FFD700] text-[#026f17] px-6 h-14 rounded-[22px] font-black uppercase text-xs active:scale-95 transition-all shadow-lg"
        >
          {loading ? "..." : <Search size={20} strokeWidth={3} />}
        </button>
      </div>

      {/* 2. Hiển thị nội dung */}
      {loading ? (
        <div className="py-24 text-center space-y-4 animate-pulse">
          <Clock className="mx-auto text-slate-200" size={48} />
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Đang truy xuất dữ liệu...</p>
        </div>
      ) : process ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Card thông tin tóm tắt */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">{process.ma_vach_qr}</h3>
              <p className="text-[10px] font-black text-[#026f17] uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#FFD700] rounded-full" /> Trạng thái:{" "}
                {String(process.trang_thai_hien_tai || "").replace(/_/g, " ")}
              </p>
            </div>
            {process.is_red_alert && (
              <div className="bg-red-500 text-white p-3 rounded-2xl shadow-lg shadow-red-200 animate-bounce">
                <AlertTriangle size={24} />
              </div>
            )}
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-slate-900"><History size={120} /></div>
          </div>

          {/* Timeline truy vết dọc */}
          <div className="relative space-y-6 pl-10 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
            {history.map((log) => (
              <div key={log.id} className="relative">
                {/* Marker Point */}
                <div className={`absolute -left-[35px] top-1 w-10 h-10 rounded-full border-4 border-white shadow-md flex items-center justify-center z-10 ${log.hanh_dong === 'REPORT_INCIDENT' ? 'bg-red-500 text-white' : 'bg-[#026f17] text-[#FFD700]'}`}>
                  {log.hanh_dong === 'REPORT_INCIDENT' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                </div>
                
                {/* Log Card */}
                <div className={`p-5 rounded-[28px] border transition-all active:scale-[0.98] ${log.hanh_dong === 'REPORT_INCIDENT' ? 'bg-red-50/50 border-red-100 shadow-red-50' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${log.hanh_dong === 'REPORT_INCIDENT' ? 'text-red-600' : 'text-[#026f17]'}`}>
                      TRẠM {String(log.tram || "").replace(/_/g, " ")}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                      {new Date(log.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-700 leading-snug">
                    {log.hanh_dong === 'REPORT_INCIDENT' && <span className="text-red-600 uppercase font-black mr-2">[SỰ CỐ]</span>}
                    {log.ghi_chu || 'Xác nhận quy trình thành công'}
                  </p>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50">
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><User size={12} /></div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">Nhân viên khoa KSNK</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-32 text-center border-4 border-dashed border-slate-100 rounded-[48px] bg-white/50 space-y-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto opacity-50">
            <History className="text-slate-300" size={32} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Chưa có dữ liệu</p>
            <p className="text-[11px] font-bold text-slate-300 uppercase">Vui lòng nhập hoặc quét mã để truy vết</p>
          </div>
        </div>
      )}
    </div>
  );
}
