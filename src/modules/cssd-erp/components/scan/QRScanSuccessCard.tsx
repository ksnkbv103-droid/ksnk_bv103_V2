import React from "react";
import { CheckCircle2, User, Clock, ArrowRight, Printer } from "lucide-react";

interface Props {
  qrCode: string;
  tenBoDungCu: string;
  nguoiThucHien: string;
  thoiGianQuet: string;
  buocTiepTheo: string;
  /** Trạm hiện tại (từ trang cha; tránh gọi hook trùng state). */
  tramDisplay?: string;
  maLoTietKhuan?: string;
  ledgerWarning?: string;
  /** Tem chu trình túi hấp (khác tem bộ vĩnh viễn). */
  maCycleQr?: string | null;
  /** Trạm cấp phát: in phiếu A4 (QR mã mẻ). */
  onPrintCapPhat?: () => void;
  isPrintBusy?: boolean;
}

/**
 * Thẻ thông báo quét thành công — thống nhất mọi trạm workflow.
 */
export default function QRScanSuccessCard({
  qrCode,
  tenBoDungCu,
  nguoiThucHien,
  thoiGianQuet,
  buocTiepTheo,
  tramDisplay = "CSSD",
  maLoTietKhuan,
  ledgerWarning,
  maCycleQr,
  onPrintCapPhat,
  isPrintBusy,
}: Props) {
  const tramKey = tramDisplay.replace(/\s+/g, "_").toUpperCase();
  const isCapPhat = tramKey === "CAP_PHAT" || tramDisplay === "Cấp phát";

  return (
    <div className="w-full max-w-[360px] mx-auto animate-in zoom-in-95 duration-200 touch-manipulation pointer-events-auto -webkit-tap-highlight-color-transparent">
      <div className="bg-[var(--primary)] rounded-2xl overflow-hidden shadow-xl border-2 border-[#FFD700]/20 relative">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#FFD700_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="p-5 flex flex-col items-center text-center relative z-10">
          <div className="mb-4 bg-[#FFD700] p-3 rounded-full shadow-lg">
            <CheckCircle2 className="text-[var(--primary)]" size={32} strokeWidth={3} />
          </div>

          <h2 className="text-[#FFD700] text-lg font-black uppercase tracking-tight mb-1">
            QUÉT THÀNH CÔNG
          </h2>
          <p className="text-white/50 text-[11px] font-bold uppercase tracking-[0.2em] mb-6">
            Hệ thống đã ghi nhận bản ghi
          </p>

          <div className="w-full bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-3 rounded-2xl shadow-lg border-2 border-white">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrCode}`}
                  alt="QR"
                  className="w-28 h-28 object-contain"
                />
              </div>
              <div className="font-black text-[#FFD700] text-xl tracking-[0.1em]">
                {qrCode}
              </div>
              {maCycleQr && maCycleQr !== qrCode ? (
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#FFD700]/80">
                  Tem chu trình: <span className="font-mono tracking-normal">{maCycleQr}</span>
                </p>
              ) : null}
            </div>

            <div className="h-px bg-white/10 w-full" />

            <div className="space-y-4 text-left px-1">
              <div className="space-y-0.5">
                <label className="text-[11px] font-black text-[#FFD700]/40 uppercase tracking-widest">
                  Bộ dụng cụ
                </label>
                <div className="text-white text-base font-black uppercase leading-tight">
                  {tenBoDungCu}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-black/20 p-3 rounded-xl border border-white/5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#FFD700]/40 uppercase">
                    <User size={10} /> Người thực hiện
                  </div>
                  <div className="text-white text-[11px] font-black truncate">{nguoiThucHien}</div>
                </div>
                <div className="space-y-0.5 border-l border-white/10 pl-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#FFD700]/40 uppercase">
                    <Clock size={10} /> Thời gian
                  </div>
                  <div className="text-white text-[11px] font-black">{thoiGianQuet}</div>
                </div>
              </div>
            </div>

            {maLoTietKhuan && (
              <div className="w-full bg-emerald-500/15 border border-emerald-400/30 rounded-xl p-3 text-left">
                <label className="text-[11px] font-black text-emerald-200 uppercase tracking-widest block mb-1">
                  Mã mẻ tiệt khuẩn (QR trên phiếu)
                </label>
                <div className="text-white text-sm font-black font-mono tracking-wider">{maLoTietKhuan}</div>
              </div>
            )}

            {ledgerWarning && (
              <div className="w-full bg-rose-500/20 border border-rose-500/40 rounded-xl p-3 text-left animate-in fade-in slide-in-from-bottom-1">
                <label className="text-[11px] font-black text-rose-300 uppercase tracking-widest block mb-1">⚠️ CẢNH BÁO CẤU PHẦN (SỔ CÁI)</label>
                <div className="text-rose-100 text-[11px] font-bold leading-relaxed">{ledgerWarning}</div>
              </div>
            )}
          </div>

          <div className="mt-6 w-full bg-[#FFD700] text-[var(--primary)] p-4 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="text-left">
              <div className="text-[11px] font-black uppercase opacity-60 mb-0.5">Bước tiếp theo</div>
              <div className="text-sm font-black uppercase tracking-tight">{buocTiepTheo}</div>
            </div>
            <div className="bg-[var(--primary)] p-2 rounded-full text-[#FFD700]"><ArrowRight size={20} strokeWidth={3} /></div>
          </div>

          {isCapPhat && onPrintCapPhat ? (
            <div className="mt-4 w-full">
              <button
                type="button"
                disabled={isPrintBusy}
                onClick={onPrintCapPhat}
                className="w-full h-14 rounded-[20px] flex items-center justify-center gap-3 font-black uppercase text-[11px] tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 touch-manipulation bg-[#FFD700] text-[var(--primary)] border-2 border-[var(--primary)]/10"
              >
                <Printer size={20} strokeWidth={2.5} />
                {isPrintBusy ? "ĐANG CHUẨN BỊ IN..." : "IN PHIẾU CẤP PHÁT A4"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
