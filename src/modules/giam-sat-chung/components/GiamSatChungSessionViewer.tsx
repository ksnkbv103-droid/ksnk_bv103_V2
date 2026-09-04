"use client";

import React, { useMemo } from "react";
import type { ChecklistResult, ChecklistTemplate } from "@/types/giam-sat-chung";
import type { MasterOption } from "@/lib/master-data/gateway";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { NhanSuLike } from "../lib/gsc-session-labels";
import {
  resolveGscDoiTuongTen,
  resolveGscKhoaTen,
  resolveGscKhuTen,
  resolveGscNgheTen,
  resolveGscNguoiGiamSatTen,
} from "../lib/gsc-session-labels";
import ChecklistItem from "./ChecklistItem";
import { formatDateVi } from "@/lib/format-datetime-vi";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

export default function GiamSatChungSessionViewer({
  open,
  session,
  results,
  template,
  khoas,
  khuVucs,
  ngheNghieps,
  nhanSus,
  onClose,
  onPrint,
}: {
  open: boolean;
  session: Record<string, unknown>;
  results: ChecklistResult[];
  template: ChecklistTemplate;
  khoas: Array<{ id?: string; ten_danh_muc?: string; ten_khoa?: string }>;
  khuVucs: Array<{ id?: string; ten_danh_muc?: string }>;
  ngheNghieps: MasterOption[];
  nhanSus: NhanSuLike[];
  onClose: () => void;
  onPrint: () => void;
}) {
  const resultByCriterionId = useMemo(
    () => new Map(results.map((r) => [r.criterionId, r] as const)),
    [results],
  );
  const ngayRaw = session.ngay_giam_sat as string | undefined;
  const ngayStr = formatDateVi(ngayRaw?.slice(0, 10), String(ngayRaw || "—"));
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="flex max-h-[min(90dvh,880px)] max-w-3xl flex-col gap-0 overflow-hidden p-0 touch-manipulation sm:max-w-3xl">
        <DialogTitle className="sr-only">{template.title}</DialogTitle>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 pr-14">
          <div className="min-w-0">
            <h2 id="gsc-viewer-title" className="text-sm font-semibold text-[var(--primary)]">
              {template.title}
            </h2>
            <p className="mt-1 text-[11px] font-semibold text-slate-600">
              {ngayStr} · Khoa: {resolveGscKhoaTen(session, khoas)} · Khu: {resolveGscKhuTen(session, khuVucs)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Người GS: {resolveGscNguoiGiamSatTen(session)} · Đối tượng: {resolveGscDoiTuongTen(session, nhanSus)} · Nghề:{" "}
              {resolveGscNgheTen(session, ngheNghieps)}
            </p>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          {template.criteria.map((c, idx) => {
            const result = resultByCriterionId.get(c.id);
            if (!result) return null;
            return <ChecklistItem key={c.id} index={idx + 1} criterion={c} result={result} readOnly />;
          })}
          {String(session.ghi_chu_chung || "").trim() ? (
            <div className={`${C.panelInset} p-3 text-xs`}>
              <span className="font-medium text-slate-500">Ghi chú chung: </span>
              <span className="font-semibold text-slate-800">{String(session.ghi_chu_chung)}</span>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className={`app-shell-focus ${C.btnSecondary}`}
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="app-shell-focus bv103-control-h inline-flex items-center justify-center rounded-[var(--radius-control)] bg-slate-800 px-4 text-xs font-semibold uppercase tracking-wide text-white hover:bg-slate-900"
          >
            In A4
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
