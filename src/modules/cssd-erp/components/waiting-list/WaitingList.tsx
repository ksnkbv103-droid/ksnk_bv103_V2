// src/modules/cssd-erp/components/waiting-list/WaitingList.tsx
"use client";

import React from "react";
import { Clock, User, Phone, ArrowRight } from "lucide-react";
import { CSSDWaitingItem } from "../../types/cssd.types";

/** Rút gọn mã QR/CATALOG dài thành dạng ngắn dễ đọc */
function shortQr(qr: string): string {
  if (qr.startsWith("CATALOG::")) {
    const id = qr.replace("CATALOG::", "");
    return `CAT:${id.slice(0, 6)}…`;
  }
  if (qr.length > 16) return `${qr.slice(0, 8)}…${qr.slice(-4)}`;
  return qr;
}

const ACTION_VERBS: Record<string, string> = {
  TIEP_NHAN: "Tiếp nhận bởi",
  LAM_SACH: "Làm sạch bởi",
  QC: "Kiểm chuẩn bởi",
  DONG_GOI: "Đóng gói bởi",
  TIET_KHUAN: "Tiệt khuẩn bởi",
  CAP_PHAT: "Cấp phát bởi",
};

interface Props {
  items: CSSDWaitingItem[];
  onAction: (maQR: string) => void;
}

export default function WaitingList({ items, onAction }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-2 px-1">
        <Clock size={14} className="text-[var(--primary)]" /> Đang chờ xử lý ({items.length})
      </h2>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100 max-h-[440px] overflow-y-auto custom-scrollbar">
        {items.length > 0 ? items.map((item) => (
          <div key={item.id} className="p-4 hover:bg-slate-50/80 transition-colors">
            <div className="flex items-start justify-between gap-3">
              {/* Thông tin chính */}
              <div className="min-w-0 flex-1 space-y-3">
                {/* Tên bộ dụng cụ - TO RÕ */}
                <p className="text-base font-black text-slate-800 leading-snug truncate">
                  {item.ten_bo || "Chưa gán bộ"}
                </p>
                
                {/* Mã bộ nổi bật + thời gian cập nhật */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-extrabold text-slate-700 shadow-sm">
                    Mã bộ: {item.ma_vach_qr.startsWith("CATALOG::") ? item.ma_vach_qr.replace("CATALOG::", "DM-") : item.ma_vach_qr}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Clock size={12} className="-mt-0.5 text-slate-400" />
                    {new Date(item.updated_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Thông tin trạm trước - Nâng cấp trực quan */}
                {item.nguoi_tram_truoc && (
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-2 text-[11px] text-blue-800">
                      <span className="flex items-center gap-1.5 font-bold">
                        <User size={12} className="shrink-0 text-blue-600" />
                        {ACTION_VERBS[item.tram_truoc || ""] || "Được xử lý bởi"}:{" "}
                        <span className="font-extrabold text-blue-900">{item.nguoi_tram_truoc}</span>
                      </span>
                      
                      {item.sdt_tram_truoc && (
                        <>
                          <span className="text-blue-300">·</span>
                          <a
                            href={`tel:${item.sdt_tram_truoc}`}
                            className="flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 underline decoration-dotted"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone size={10} className="shrink-0" />
                            {item.sdt_tram_truoc}
                          </a>
                        </>
                      )}
                      
                      {item.thoi_gian_tram_truoc && (
                        <>
                          <span className="text-blue-300">|</span>
                          <span className="font-semibold text-blue-700 flex items-center gap-1">
                            <Clock size={11} className="shrink-0" />
                            Đến lúc {new Date(item.thoi_gian_tram_truoc).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ngày {new Date(item.thoi_gian_tram_truoc).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Nút xử lý */}
              <button
                onClick={() => onAction(item.ma_vach_qr)}
                className="shrink-0 self-center px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-semibold uppercase tracking-wide active:scale-95 transition-all shadow-md shadow-blue-100 hover:bg-blue-700"
              >
                Xử lý
              </button>
            </div>
          </div>
        )) : (
          <div className="py-16 text-center text-slate-400">
            <Clock size={36} className="mx-auto mb-2 opacity-20" />
            <p className="text-[11px] font-semibold uppercase tracking-wide italic">Không có bộ chờ xử lý</p>
          </div>
        )}
      </div>
    </div>
  );
}

