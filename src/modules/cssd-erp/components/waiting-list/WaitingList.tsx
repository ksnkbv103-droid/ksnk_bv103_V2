// src/modules/cssd-erp/components/waiting-list/WaitingList.tsx
"use client";

import React, { useState } from "react";
import { Clock, User, Phone, ArrowRight, List } from "lucide-react";
import { CSSDWaitingItem } from "../../types/cssd.types";
import SetMembersModal from "../inventory/SetMembersModal";

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
  const [detailSet, setDetailSet] = useState<{ bo_dung_cu_id: string; ten_bo?: string | null } | null>(null);

  return (
    <div className="space-y-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-2 px-1">
        <Clock size={14} className="text-[var(--primary)]" /> Đang chờ xử lý ({items.length})
      </h2>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100 max-h-[440px] overflow-y-auto custom-scrollbar">
        {items.length > 0 ? items.map((item) => (
          <div key={item.id} className="p-4 hover:bg-slate-50/80 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-base font-black text-slate-800 leading-snug truncate">
                  {item.ten_bo || "Chưa gán bộ"}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-extrabold text-slate-700 shadow-sm">
                    Mã bộ: {item.ma_vach_qr}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Clock size={12} className="-mt-0.5 text-slate-400" />
                    {new Date(item.updated_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

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

              <div className="flex shrink-0 flex-col gap-2 self-center sm:flex-row">
                <button
                  type="button"
                  disabled={!item.bo_dung_cu_id}
                  onClick={() =>
                    item.bo_dung_cu_id
                      ? setDetailSet({ bo_dung_cu_id: item.bo_dung_cu_id, ten_bo: item.ten_bo })
                      : undefined
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <List size={14} aria-hidden />
                  Chi tiết
                </button>
                <button
                  type="button"
                  onClick={() => onAction(item.ma_vach_qr)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-md shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95"
                >
                  <ArrowRight size={14} aria-hidden />
                  Xử lý
                </button>
              </div>
            </div>
          </div>
        )) : (
          <div className="py-16 text-center text-slate-400">
            <Clock size={36} className="mx-auto mb-2 opacity-20" />
            <p className="text-[11px] font-semibold uppercase tracking-wide italic">Không có bộ chờ xử lý</p>
          </div>
        )}
      </div>

      <SetMembersModal
        isOpen={detailSet !== null}
        onClose={() => setDetailSet(null)}
        set={detailSet ? { bo_dung_cu_id: detailSet.bo_dung_cu_id, ten_bo: detailSet.ten_bo } : null}
      />
    </div>
  );
}
