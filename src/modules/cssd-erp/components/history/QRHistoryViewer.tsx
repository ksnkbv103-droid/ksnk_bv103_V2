// src/modules/cssd-erp/components/history/QRHistoryViewer.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, History, CheckCircle2, AlertTriangle, Clock, User, QrCode } from "lucide-react";
import QrScanInput from "@/components/shared/QrScanInput";
import { toast } from "sonner";
import { fetchCssdQrHistory, assignCssdCaMoTrace } from "../../actions/cssd-qr-history.actions";
import { useCssdPrint } from "../../hooks/use-cssd-print";
import CssdPrintPortal from "../print/CssdPrintPortal";
import type { CssdBatchPrintData } from "../../types/cssd-print.types";
import { formatCssdPrintDateTime, formatCssdTriLabel } from "../../lib/cssd-print-format";
import { normalizeCssdCode } from "../../shared/domain/cssd-qr-core";

interface HistoryLog {
  id: string;
  tram: string;
  hanh_dong: string;
  created_at: string;
  ghi_chu: string;
}

/**
 * Component Truy vết lịch sử bộ dụng cụ (QR History Viewer)
 * Tối ưu Mobile-first, timeline dọc Ops dialect (primary + slate).
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
  const [batchTrace, setBatchTrace] = useState<CssdBatchPrintData | null>(null);
  const [assigningCaMo, setAssigningCaMo] = useState(false);
  const [caMoInput, setCaMoInput] = useState("");
  const autoFetched = useRef<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const { printState, onPrintBatch, isPrinting } = useCssdPrint();

  const fetchHistory = async (qr: string) => {
    const codeNorm = normalizeCssdCode(qr);
    if (!codeNorm) return toast.error("Vui lòng nhập mã QR");
    setCode(codeNorm);
    setLoading(true);
    try {
      const res = await fetchCssdQrHistory(codeNorm);
      if (!res.success) throw new Error(res.error);
      if ("kind" in res && res.kind === "BATCH" && "batch" in res) {
        setBatchTrace(res.batch as CssdBatchPrintData);
        setProcess(null);
        setHistory([]);
        return;
      }
      setBatchTrace(null);
      setProcess(res.process);
      setHistory(res.history);
      setCaMoInput(String(res.process?.ma_ca_mo_id || "").trim());
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi truy vết");
      setHistory([]);
      setProcess(null);
      setBatchTrace(null);
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

  const saveCaMoTrace = async () => {
    if (!process?.id) return;
    const val = caMoInput.trim();
    if (!val) return toast.error("Nhập mã ca mổ hoặc tên bệnh nhân");
    setAssigningCaMo(true);
    try {
      const res = await assignCssdCaMoTrace(String(process.id), val);
      if (!res.success) throw new Error(res.error);
      toast.success("Đã gán truy vết ca mổ / bệnh nhân");
      await fetchHistory(code);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không gán được ca mổ");
    } finally {
      setAssigningCaMo(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-[var(--bv103-space-3)] touch-manipulation pointer-events-auto">
      {/* 1. Thanh tìm kiếm / Quét mã — QrScanInput SSOT */}
      <div className="space-y-2 rounded-[var(--radius-shell)] border border-slate-200 bg-[var(--primary)] p-3 shadow-sm">
        <div className="flex items-center gap-2 px-2 text-white/80">
          <QrCode className="h-4 w-4" aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-wide">Truy vết QR</span>
        </div>
        <QrScanInput
          inputRef={scanInputRef}
          placeholder="Nhập hoặc quét mã QR…"
          cameraTitle="Quét QR truy vết"
          onEnter={(scanned) => void fetchHistory(scanned)}
          onCameraScan={(scanned) => void fetchHistory(scanned)}
          inputClassName="bv103-control-h w-full rounded-[var(--radius-control)] border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white outline-none placeholder:font-normal placeholder:text-white/50"
        />
        <button
          type="button"
          onClick={() => void fetchHistory(scanInputRef.current?.value || code)}
          className="bv103-control-h inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-white text-xs font-semibold text-[var(--primary)] shadow-sm active:scale-95"
        >
          {loading ? "..." : <><Search className="h-4 w-4" aria-hidden /> Tra cứu</>}
        </button>
      </div>

      {/* 2. Hiển thị nội dung */}
      {loading ? (
        <div className="py-24 text-center space-y-[var(--bv103-space-3)] animate-pulse">
          <Clock className="mx-auto text-slate-200" size={48} />
          <p className="text-[11px] font-medium text-slate-400 tracking-wide">Đang truy xuất dữ liệu...</p>
        </div>
      ) : batchTrace ? (
        <div className="bv103-layer-panel bv103-pad-panel bv103-stack-in animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h3 className="bv103-type-title text-slate-900 mb-1">Mẻ tiệt khuẩn: {batchTrace.maLo}</h3>
            <p className="text-sm text-emerald-700 font-medium">
              {batchTrace.ketQuaDat ? "Đạt QC — sẵn sàng cấp phát" : "Không đạt QC"}
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
              <span><strong>Thiết bị:</strong> {batchTrace.thietBi}</span>
              <span><strong>Người load:</strong> {batchTrace.nguoiLoad}</span>
              <span><strong>Người dỡ:</strong> {batchTrace.nguoiUnload}</span>
              <span><strong>Kết thúc:</strong> {formatCssdPrintDateTime(batchTrace.thoiGianKetThuc)}</span>
              <span><strong>CI:</strong> {formatCssdTriLabel(batchTrace.testCI)}</span>
              <span><strong>BI:</strong> {formatCssdTriLabel(batchTrace.testSinhHoc)}</span>
            </div>
            <button
              type="button"
              disabled={isPrinting || !batchTrace.ketQuaDat}
              onClick={() => void onPrintBatch({ batchId: batchTrace.batchId })}
              className="bv103-control-h mt-4 w-full rounded-[var(--radius-control)] bg-[var(--primary)] text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
            >
              In phiếu mẻ A4
            </button>
          </div>
          <div className="border-t border-slate-100 pt-[var(--bv103-space-3)] space-y-2">
            <h4 className="bv103-type-section">Bộ trong mẻ ({batchTrace.members.length})</h4>
            {batchTrace.members.map((m) => (
              <div key={m.maQrBo} className="border-b border-slate-100 py-2 last:border-b-0 text-sm">
                <p className="font-semibold text-slate-800">{m.tenBo}</p>
                <p className="font-mono bv103-type-label text-slate-500">{m.maQrBo}</p>
              </div>
            ))}
          </div>
        </div>
      ) : process ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Card thông tin tóm tắt */}
          <div className="bv103-layer-panel bv103-pad-panel flex items-center justify-between overflow-hidden relative">
            <div className="relative z-10 space-y-2">
              <h3 className="bv103-type-title mb-1 font-mono">{process.ma_vach_qr}</h3>
              <p className="text-[11px] font-medium text-[var(--primary)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" /> Trạng thái:{" "}
                {String(process.trang_thai_hien_tai || "").replace(/_/g, " ")}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {process.ma_qr_bo_vinh_vien ? (
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono bv103-type-label font-semibold text-slate-700">
                    Tem bộ (vĩnh viễn): {String(process.ma_qr_bo_vinh_vien)}
                  </span>
                ) : null}
                {process.ma_cycle_qr ? (
                  <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono bv103-type-label font-semibold text-emerald-800">
                    Tem chu trình (túi hấp): {String(process.ma_cycle_qr)}
                  </span>
                ) : (
                  <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                    Chưa gắn tem chu trình — thường sau Đóng gói
                  </span>
                )}
                {process.qr_kind_matched === "CYCLE" ? (
                  <span className="rounded-lg bg-emerald-700 px-2 py-1 bv103-type-label text-white">
                    Bạn vừa quét tem chu trình
                  </span>
                ) : process.qr_kind_matched === "PERMANENT" ? (
                  <span className="rounded-lg bg-slate-700 px-2 py-1 bv103-type-label text-white">
                    Bạn vừa quét tem bộ vĩnh viễn
                  </span>
                ) : null}
              </div>
            </div>
            {process.is_red_alert && (
              <div className="bg-red-500 text-white p-3 rounded-[var(--radius-shell)] shadow-sm animate-bounce">
                <AlertTriangle size={24} />
              </div>
            )}
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-slate-900"><History size={120} /></div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-[var(--radius-shell)] p-5 space-y-3">
            <h4 className="text-xs font-semibold tracking-wide text-emerald-800">
              Truy vết ca mổ / bệnh nhân
            </h4>
            <p className="text-[11px] text-emerald-700">
              Gán sau khi cấp phát — không nhập tại trạm quét workflow.
            </p>
            <input
              value={caMoInput}
              onChange={(e) => setCaMoInput(e.target.value)}
              placeholder="Mã ca mổ hoặc tên bệnh nhân…"
              className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-400"
            />
            <button
              type="button"
              disabled={assigningCaMo || !caMoInput.trim()}
              onClick={() => void saveCaMoTrace()}
              className="bv103-control-h w-full rounded-[var(--radius-control)] bg-[var(--primary)] text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
            >
              {assigningCaMo ? "Đang lưu…" : "Lưu truy vết ca mổ"}
            </button>
          </div>

          {/* Timeline truy vết dọc */}
          <div className="relative space-y-[var(--bv103-space-3)] pl-10 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
            {history.map((log) => (
              <div key={log.id} className="relative">
                {/* Marker Point */}
                <div className={`absolute -left-[35px] top-1 w-10 h-10 rounded-full border-4 border-white shadow-md flex items-center justify-center z-10 ${log.hanh_dong === 'REPORT_INCIDENT' ? 'bg-red-500 text-white' : 'bg-[var(--primary)] text-white'}`}>
                  {log.hanh_dong === 'REPORT_INCIDENT' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                </div>
                
                {/* Log Card */}
                <div className={`p-4 rounded-[var(--radius-shell)] border transition-all active:scale-[0.98] ${log.hanh_dong === 'REPORT_INCIDENT' ? 'bg-red-50/50 border-red-100' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[11px] font-semibold uppercase tracking-wide ${log.hanh_dong === 'REPORT_INCIDENT' ? 'text-red-600' : 'text-[var(--primary)]'}`}>
                      TRẠM {String(log.tram || "").replace(/_/g, " ")}
                    </span>
                    <span className="bv103-type-label font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                      {formatCssdPrintDateTime(log.created_at)}
                    </span>
                  </div>
                  <p className="bv103-type-section text-slate-700 leading-snug">
                    {log.hanh_dong === 'REPORT_INCIDENT' && <span className="text-red-600 uppercase font-semibold mr-2">[SỰ CỐ]</span>}
                    {log.ghi_chu || 'Xác nhận quy trình thành công'}
                  </p>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50">
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><User size={12} /></div>
                    <span className="text-[11px] font-medium text-slate-400 tracking-tighter">Nhân viên khoa KSNK</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-32 text-center border-4 border-dashed border-slate-100 rounded-[48px] bg-white/50 space-y-[var(--bv103-space-3)]">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto opacity-50">
            <History className="text-slate-300" size={32} />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-slate-400 tracking-wide">Chưa có dữ liệu</p>
            <p className="bv103-type-label font-semibold text-slate-300 uppercase">Vui lòng nhập hoặc quét mã để truy vết</p>
          </div>
        </div>
      )}
      <CssdPrintPortal printState={printState} />
    </div>
  );
}
