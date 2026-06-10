"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Lock, LockOpen, RotateCcw, History } from "lucide-react";
import { useModulePermission } from "@/hooks/useModulePermission";
import {
  cssdCommandFreezeSet,
  cssdCommandRejectToPrevious,
  cssdCommandReleaseSet,
} from "../../actions/cssd-workflow.commands.actions";
import { CSSD_ROUTES } from "@/lib/cssd-routes";
import { CSSD_UI_ACTION_SECONDARY } from "../../shared/ui/cssd-ui-chrome";
type Props = {
  qrCode: string;
  onSuccess?: () => void;
  disabled?: boolean;
};

export default function WorkflowManualOpsPanel({ qrCode, onSuccess, disabled }: Props) {
  const [rejectReason, setRejectReason] = useState("");
  const [freezeReason, setFreezeReason] = useState("");
  const [busy, setBusy] = useState<"reject" | "freeze" | "release" | null>(null);
  const { allowed: workflow } = useModulePermission("CSSD_WORKFLOW");
  const { allowed: inventory } = useModulePermission("CSSD_KHO_DUNGCU");

  const code = qrCode.trim().toUpperCase();
  if (!code || code.startsWith("CATALOG::")) return null;

  const canEditWorkflow = workflow.edit;
  const canRelease = inventory.edit;

  const run = async (kind: "reject" | "freeze" | "release") => {
    setBusy(kind);
    try {
      if (kind === "reject") {
        await cssdCommandRejectToPrevious(code, rejectReason);
        toast.success("Đã trả lui một trạm");
        setRejectReason("");
      } else if (kind === "freeze") {
        await cssdCommandFreezeSet(code, freezeReason || undefined);
        toast.success("Đã khóa an toàn bộ dụng cụ");
        setFreezeReason("");
      } else {
        await cssdCommandReleaseSet(code);
        toast.success("Đã mở khóa an toàn");
      }
      onSuccess?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setBusy(null);
    }
  };

  if (!canEditWorkflow && !canRelease) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Thao tác ngoại lệ (QR vừa quét)
        </p>
        <Link
          href={`${CSSD_ROUTES.quyTrinh}?tab=trace&qr=${encodeURIComponent(code)}`}
          className={`${CSSD_UI_ACTION_SECONDARY} !py-1.5 !px-3 text-[11px]`}
        >
          <History size={14} aria-hidden /> Lịch sử QR
        </Link>
      </div>

      {canEditWorkflow ? (
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Trả lui 1 trạm
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Lý do trả lui (bắt buộc)…"
            rows={2}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-200"
          />
          <button
            type="button"
            disabled={disabled || busy !== null || !rejectReason.trim()}
            onClick={() => void run("reject")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw size={16} aria-hidden />
            {busy === "reject" ? "Đang xử lý…" : "Trả lui một trạm"}
          </button>
        </div>
      ) : null}

      {canEditWorkflow ? (
        <div className="space-y-2 border-t border-slate-200 pt-3">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Khóa an toàn (đóng băng)
          </label>
          <input
            value={freezeReason}
            onChange={(e) => setFreezeReason(e.target.value)}
            placeholder="Ghi chú (tùy chọn)…"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          />
          <button
            type="button"
            disabled={disabled || busy !== null}
            onClick={() => void run("freeze")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
          >
            <Lock size={16} aria-hidden />
            {busy === "freeze" ? "Đang khóa…" : "Đóng băng thủ công"}
          </button>
        </div>
      ) : null}

      {canRelease ? (
        <button
          type="button"
          disabled={disabled || busy !== null}
          onClick={() => void run("release")}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
        >
          <LockOpen size={16} aria-hidden />
          {busy === "release" ? "Đang mở khóa…" : "Mở khóa an toàn (kho)"}
        </button>
      ) : null}
    </div>
  );
}
