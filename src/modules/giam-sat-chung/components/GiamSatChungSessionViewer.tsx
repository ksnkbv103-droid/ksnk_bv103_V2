"use client";

import React, { useMemo } from "react";
import type { ChecklistResult, ChecklistTemplate } from "@/types/giam-sat-chung";
import type { MasterOption } from "@/lib/master-data/gateway";
import type { NhanSuLike } from "../lib/gsc-session-labels";
import {
  resolveGscDoiTuongTen,
  resolveGscKhoaTen,
  resolveGscKhuTen,
  resolveGscNgheTen,
  resolveGscNguoiGiamSatTen,
} from "../lib/gsc-session-labels";
import ChecklistItem from "./ChecklistItem";
import { format } from "date-fns";
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
  if (!open) return null;
  const ngayRaw = session.ngay_giam_sat as string | undefined;
  let ngayStr = "—";
  try {
    if (ngayRaw) ngayStr = format(new Date(ngayRaw), "dd/MM/yyyy");
  } catch {
    ngayStr = String(ngayRaw || "—");
  }
  return (
    <div
      className="fixed inset-0 z-[60] flex touch-manipulation items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gsc-viewer-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-shell)] border border-slate-200 bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
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
          <button
            type="button"
            onClick={onClose}
            className={`app-shell-focus shrink-0 ${C.btnSecondary} h-auto min-h-0 px-3 py-1.5`}
          >
            Đóng
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
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
      </div>
    </div>
  );
}
