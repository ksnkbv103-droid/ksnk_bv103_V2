"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X, PackageOpen } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import SetCompositionCard from "./SetCompositionCard";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  set: {
    bo_dung_cu_id?: string | null;
    ten_bo?: string | null;
    cssd_dm_bo_dung_cu?: { ten_bo?: string | null } | null;
  } | null;
}

export default function SetMembersModal({ isOpen, onClose, set }: Props) {
  const boId = String(set?.bo_dung_cu_id || "").trim();
  const tenBo = set?.cssd_dm_bo_dung_cu?.ten_bo || set?.ten_bo || "Bộ dụng cụ";

  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cssd-set-members-title"
    >
      <div className="flex max-h-[85vh] min-h-0 w-full max-w-xl flex-col rounded-t-[var(--radius-shell)] bg-white p-6 shadow-[var(--shadow-app-soft)] sm:rounded-[var(--radius-shell)] sm:p-8">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-[var(--radius-shell)] bg-emerald-50 p-3 text-[var(--primary)]">
              <PackageOpen size={22} />
            </div>
            <div className="min-w-0">
              <h4 id="cssd-set-members-title" className="text-[11px] font-medium tracking-wide text-slate-400">
                Thẻ bộ — cần / thực tế
              </h4>
              <p className="truncate text-sm font-semibold uppercase text-slate-700">{tenBo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-400"
            aria-label="Đóng"
          >
            <X size={22} />
          </button>
        </div>
        <div className="custom-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {boId ? (
            <SetCompositionCard boDungCuId={boId} compact />
          ) : (
            <p className="py-12 text-center text-xs text-slate-400">Bộ này chưa gắn danh mục.</p>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
