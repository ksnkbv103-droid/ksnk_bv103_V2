// src/modules/cssd-erp/components/inventory/SetMembersModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, PackageOpen, Info } from "lucide-react";
import { toast } from "sonner";
import { fetchBoDungCuChiTietMembers } from "../../actions/cssd-bo-members.actions";
import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Kho dụng cụ: object quy trình; workflow: `{ bo_dung_cu_id, ten_bo? }`. */
  set: {
    bo_dung_cu_id?: string | null;
    ten_bo?: string | null;
    cssd_dm_bo_dung_cu?: { ten_bo?: string | null } | null;
  } | null;
}

export default function SetMembersModal({ isOpen, onClose, set }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedBoId, setLoadedBoId] = useState("");

  const boId = String(set?.bo_dung_cu_id || "").trim();
  const tenBo =
    set?.cssd_dm_bo_dung_cu?.ten_bo ||
    set?.ten_bo ||
    "Bộ dụng cụ";

  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      setLoadedBoId("");
      setLoading(true);
      return;
    }

    if (!boId) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (loadedBoId === boId && items.length > 0) return;

    let cancelled = false;
    setLoading(true);

    void fetchBoDungCuChiTietMembers(boId).then((res) => {
      if (cancelled) return;
      if (!res.success) {
        toast.error("Không tải thành phần: " + res.error);
        setItems([]);
      } else {
        setItems(res.data);
      }
      setLoadedBoId(boId);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // items/loadedBoId chỉ dùng để tránh flash khi đã có dữ liệu cùng bộ
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boId + isOpen là trigger chính
  }, [isOpen, boId]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cssd-set-members-title"
    >
      <div className="bg-white w-full max-w-xl rounded-t-[var(--radius-shell)] sm:rounded-[var(--radius-shell)] p-6 sm:p-8 shadow-2xl max-h-[85vh] min-h-0 flex flex-col">
        <div className="flex shrink-0 justify-between items-center gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-3 bg-emerald-50 text-[var(--primary)] rounded-2xl shrink-0">
              <PackageOpen size={24} />
            </div>
            <div className="min-w-0">
              <h4 id="cssd-set-members-title" className="text-[11px] font-medium text-slate-400 tracking-widest">
                Thành phần bộ dụng cụ
              </h4>
              <p className="text-sm font-semibold text-slate-700 uppercase truncate">{tenBo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 shrink-0 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center border border-slate-100"
            aria-label="Đóng"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-3 pr-1 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center text-slate-300 font-bold uppercase text-[11px] tracking-widest">
              Đang tải thành phần…
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-slate-300 font-bold uppercase text-[11px] tracking-widest">
              Bộ này chưa có dụng cụ chi tiết
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 uppercase truncate">
                    {item.ten_dung_cu_le || item.ten_chi_tiet}
                  </p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Info size={10} className="shrink-0" />
                    Max SUDs: {item.max_suds_count ?? "—"} lần • Trọng lượng: {item.trong_luong || 0}g
                  </p>
                </div>
                <div className="w-10 h-10 shrink-0 bg-white rounded-xl flex items-center justify-center shadow-sm text-[var(--primary)] font-semibold tabular-nums text-xs border border-slate-100">
                  x{item.so_luong ?? 1}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="shrink-0 pt-4 mt-4 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium italic">
            * Thành phần trích từ Danh mục gốc. Sửa danh mục để cập nhật toàn hệ thống.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
