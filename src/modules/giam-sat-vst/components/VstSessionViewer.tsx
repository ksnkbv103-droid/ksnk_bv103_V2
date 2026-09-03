"use client";

import React from "react";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import { formatDateVi } from "@/lib/format-datetime-vi";
import type { VstPrintData } from "../hooks/use-vst-print";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";

function resolveKhoaTen(session: Record<string, unknown>, khoas: VstPrintData["khoas"]): string {
  const id = String(session.khoa_id ?? "");
  const fromDm = khoas.find((k) => String(k.id) === id);
  return formatKhoaCompactLabel({
    ma_khoa: String(session.ma_khoa_phong ?? "").trim() || (fromDm as { ma_danh_muc?: string } | undefined)?.ma_danh_muc,
    ten_khoa:
      String(session.ten_khoa_phong ?? fromDm?.ten_khoa ?? fromDm?.ten_danh_muc ?? "").trim() || null,
  });
}

export default function VstSessionViewer({
  open,
  data,
  onClose,
  onPrint,
}: {
  open: boolean;
  data: VstPrintData | null;
  onClose: () => void;
  onPrint: () => void;
}) {
  if (!open || !data) return null;

  const session = data.session;
  const ngayRaw = session.ngay_giam_sat as string | undefined;
  const ngayStr = formatDateVi(ngayRaw?.slice(0, 10), String(ngayRaw || "—"));

  const totalOpps = data.persons.reduce((sum, p) => sum + (p.opportunities?.length ?? 0), 0);

  return (
    <div
      className="fixed inset-0 z-[60] flex touch-manipulation items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vst-viewer-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-shell)] border border-slate-200 bg-white shadow-[var(--shadow-app-soft)]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="min-w-0">
            <h2 id="vst-viewer-title" className="text-sm font-semibold text-[var(--primary)]">
              Phiên giám sát vệ sinh tay
            </h2>
            <p className="mt-1 text-[11px] font-semibold text-slate-600">
              {ngayStr} · Khoa: {resolveKhoaTen(session, data.khoas)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {String(session.hinh_thuc_giam_sat || "—")} · {String(session.cach_thuc_giam_sat || "—")} ·{" "}
              {totalOpps} cơ hội
            </p>
          </div>
          <button type="button" onClick={onClose} className={`app-shell-focus shrink-0 ${C.btnSecondary} h-auto min-h-0 px-3 py-1.5`}>
            Đóng
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-[var(--bv103-space-3)] overflow-y-auto p-4">
          {data.persons.map((person, pIdx) => {
            const name =
              person.is_manual
                ? person.ten_manual
                : data.nhanSus.find((n) => String(n.id) === String(person.nhan_vien_id))?.ho_ten ||
                  `Nhân viên ${pIdx + 1}`;
            return (
              <div key={person.id_col || pIdx} className={`${C.panelInset} p-3`}>
                <p className="text-xs font-semibold text-slate-800">{name || `Nhân viên ${pIdx + 1}`}</p>
                <ul className="mt-2 space-y-2">
                  {(person.opportunities || []).map((opp, oIdx) => (
                    <li key={opp.id || oIdx} className="rounded-md border border-slate-100 bg-white px-3 py-2 text-xs text-slate-700">
                      <p>
                        <span className="font-medium">Thời điểm:</span>{" "}
                        {(opp.thoi_diems || []).join(", ") || "—"}
                      </p>
                      <p className="mt-0.5">
                        <span className="font-medium">Hành động:</span> {opp.hanh_dong || "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <button type="button" onClick={onClose} className={`app-shell-focus ${C.btnSecondary}`}>
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
