"use client";

import React from "react";
import { PackageOpen } from "lucide-react";
import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[min(90dvh,880px)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        aria-labelledby="cssd-set-members-title"
      >
        <DialogTitle className="sr-only">Thẻ bộ — {tenBo}</DialogTitle>

        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-6 py-5 pr-14 sm:px-8 sm:py-6">
          <div className="shrink-0 rounded-[var(--radius-shell)] bg-emerald-50 p-3 text-[var(--primary)]">
            <PackageOpen size={22} />
          </div>
          <div className="min-w-0">
            <h4 id="cssd-set-members-title" className={UI.panelSubtitle}>
              Thẻ bộ — cần / thực tế
            </h4>
            <p className={`truncate ${UI.panelTitle}`}>{tenBo}</p>
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4 sm:px-8">
          {boId ? (
            <SetCompositionCard boDungCuId={boId} compact />
          ) : (
            <p className="py-12 text-center text-xs text-slate-400">Bộ này chưa gắn danh mục.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
