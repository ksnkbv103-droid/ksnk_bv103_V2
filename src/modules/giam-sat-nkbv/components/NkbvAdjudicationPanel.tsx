"use client";

import { nkbvFormChrome as UI } from "@/modules/giam-sat-nkbv/lib/nkbv-form-chrome";

import React, { useState } from "react";
import { Award, Check, Ban } from "lucide-react";
import { toast } from "sonner";

interface NkbvAdjudicationPanelProps {
  onAdjudicate: (decision: "APPROVE" | "EXCLUDE", reason?: string) => Promise<void>;
  allowedEdit: boolean;
  simulatedRole?: 'KSNK' | 'LAM_SANG' | 'VI_SINH';
  adjudicating: boolean;
}

export default function NkbvAdjudicationPanel({
  onAdjudicate,
  allowedEdit,
  simulatedRole = 'KSNK',
  adjudicating,
}: NkbvAdjudicationPanelProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [lyDoLoaiTru, setLyDoLoaiTru] = useState("");

  if (!allowedEdit) return null;

  const isRoleLocked = simulatedRole !== 'KSNK';

  const handleAction = async (decision: "APPROVE" | "EXCLUDE") => {
    if (isRoleLocked) {
      toast.error("Vai trò hiện tại không có quyền thực hiện chức năng này!");
      return;
    }

    if (decision === "EXCLUDE" && !lyDoLoaiTru.trim()) {
      toast.error("Vui lòng điền lý do loại trừ ca bệnh!");
      return;
    }

    await onAdjudicate(decision, decision === "EXCLUDE" ? lyDoLoaiTru : undefined);
    
    if (decision === "EXCLUDE") {
      setLyDoLoaiTru("");
      setShowRejectForm(false);
    }
  };

  return (
    <div className={`relative ${UI.inset} mt-2 flex flex-col gap-3 transition ${
      isRoleLocked ? "opacity-75 bg-slate-100/80" : ""
    }`}>
      {isRoleLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/10 rounded-[var(--radius-shell)] backdrop-blur-[0.5px]">
          <span className="rounded-full bg-slate-800/95 border border-slate-700 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-md flex items-center gap-1.5 animate-in zoom-in-95 duration-250">
            🔒 Chỉ KSNK có quyền phán quyết ca bệnh
          </span>
        </div>
      )}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${isRoleLocked ? "pointer-events-none select-none" : ""}`}>
        <div className="flex items-center gap-1.5">
          <Award className="h-5 w-5 text-[var(--primary)]" />
          <span className={UI.panelTitle}>
            Hội đồng kiểm soát nhiễm khuẩn (KSNK) phán quyết
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={adjudicating || isRoleLocked}
            onClick={() => handleAction("APPROVE")}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-white shadow-md transition flex items-center gap-1 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Phê duyệt (Xác nhận NKBV)
          </button>
          <button
            type="button"
            disabled={adjudicating || isRoleLocked}
            onClick={() => setShowRejectForm(!showRejectForm)}
            className="rounded-full bg-red-55 hover:bg-red-100 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-red-655 border border-red-200 transition flex items-center gap-1 disabled:opacity-50"
          >
            <Ban className="h-3.5 w-3.5" /> Loại trừ (Từ chối NKBV)
          </button>
        </div>
      </div>

      {showRejectForm && !isRoleLocked && (
        <div className="space-y-2 border-t border-slate-200/60 pt-3 animate-in slide-in-from-top-2">
          <label className={`${UI.formLabel} text-red-700`}>
            Lý do loại trừ ca bệnh này khỏi thống kê dịch tễ *
          </label>
          <div className="flex gap-2">
            <input
              value={lyDoLoaiTru}
              onChange={(e) => setLyDoLoaiTru(e.target.value)}
              placeholder="VD: Cấy vi khuẩn cộng sinh ngoài da nghi ngờ nhiễm bẩn mẫu cấy..."
              className="flex-1 rounded-xl border-red-200 bg-white px-3 py-2 text-xs font-semibold focus:border-red-500 focus:ring-red-500"
            />
            <button
              type="button"
              onClick={() => handleAction("EXCLUDE")}
              disabled={adjudicating}
              className="rounded-xl bg-red-600 hover:bg-red-700 px-6 py-2 text-xs font-semibold uppercase text-white transition"
            >
              Xác nhận loại trừ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
