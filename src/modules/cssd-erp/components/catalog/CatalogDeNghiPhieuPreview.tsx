"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CSSD_CATALOG_DE_NGHI_KIND_LABEL,
  listDeNghiFieldDiffs,
  type CssdCatalogDeNghiBomLine,
  type CssdCatalogDeNghiItem,
} from "@/lib/domain/cssd-catalog-de-nghi";

export function CatalogDeNghiPhieuBody({
  items,
  note,
}: {
  items: CssdCatalogDeNghiItem[];
  note?: string;
}) {
  return (
    <div className="space-y-3">
      {note ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-700">
          <span className="font-semibold">Ghi chú:</span> {note}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="text-[12px] text-slate-500">Phiếu không có mục.</p>
      ) : (
        items.map((it, idx) => {
          const diffs = listDeNghiFieldDiffs(it.before, it.after);
          const lines = Array.isArray((it.after as { lines?: CssdCatalogDeNghiBomLine[] }).lines)
            ? ((it.after as { lines: CssdCatalogDeNghiBomLine[] }).lines)
            : [];
          const opLabel = it.op === "CREATE" ? "CREATE" : "UPDATE";
          return (
            <section
              key={`${it.kind}-${it.targetId || it.targetMa || idx}`}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12px]">
                <span className="font-semibold text-slate-900">
                  {CSSD_CATALOG_DE_NGHI_KIND_LABEL[it.kind]}
                </span>
                <span
                  className={
                    it.op === "CREATE"
                      ? "rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-800"
                      : "rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800"
                  }
                >
                  {opLabel}
                </span>
                <span className="font-mono text-violet-700">{it.targetMa || "—"}</span>
                <span className="text-slate-700">{it.targetTen || ""}</span>
              </div>

              {diffs.length > 0 ? (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[320px] border-collapse text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-1 pr-2 font-semibold">Trường</th>
                        <th className="py-1 pr-2 font-semibold">Trước</th>
                        <th className="py-1 font-semibold">Sau</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffs.map((d) => (
                        <tr key={d.key} className="border-b border-slate-100 align-top">
                          <td className="py-1.5 pr-2 font-medium text-slate-700">{d.label}</td>
                          <td className="py-1.5 pr-2 text-slate-500">{d.beforeText}</td>
                          <td className="py-1.5 font-medium text-slate-900">{d.afterText}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-slate-500">Không có trường thay đổi.</p>
              )}

              {it.kind === "BOM" && lines.length > 0 ? (
                <ul className="mt-2 space-y-0.5 rounded-lg border border-slate-100 bg-slate-50/80 px-2 py-1.5 text-[11px] text-slate-700">
                  {lines.map((l, i) => {
                    const ma = String(l.maLoai || l.maChiTiet || "").trim();
                    const ten = String(l.tenDungCuLe || l.tenChiTiet || "").trim();
                    const head = [ma, ten].filter(Boolean).join(" · ") || "—";
                    const qty = l.soLuong != null ? ` × ${l.soLuong}` : "";
                    return (
                      <li key={`${l.chiTietId || ma}-${i}`}>
                        <span
                          className={
                            l.op === "DELETE"
                              ? "font-semibold text-red-700"
                              : "font-semibold text-emerald-700"
                          }
                        >
                          {l.op === "DELETE" ? "Xóa" : "UPSERT"}
                        </span>
                        {": "}
                        {head}
                        {l.op !== "DELETE" ? qty : ""}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })
      )}
    </div>
  );
}

export type CatalogDeNghiPhieuDialogMode = "send" | "approve" | "view";

export type CatalogDeNghiPhieuDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: CssdCatalogDeNghiItem[];
  note?: string;
  mode: CatalogDeNghiPhieuDialogMode;
  busy?: boolean;
  approveBusy?: boolean;
  rejectBusy?: boolean;
  onConfirmSend?: () => void | Promise<void>;
  onApprove?: () => void | Promise<void>;
  onReject?: () => void | Promise<void>;
  /** View mode: xóa phiếu (PENDING/REJECTED) hoặc xóa + hoàn tác (APPROVED). */
  onDelete?: () => void | Promise<void>;
  deleteBusy?: boolean;
  deleteLabel?: string;
};

export function CatalogDeNghiPhieuDialog({
  open,
  onOpenChange,
  title,
  items,
  note,
  mode,
  busy = false,
  approveBusy = false,
  rejectBusy = false,
  onConfirmSend,
  onApprove,
  onReject,
  onDelete,
  deleteBusy = false,
  deleteLabel = "Xóa phiếu",
}: CatalogDeNghiPhieuDialogProps) {
  const anyBusy = busy || approveBusy || rejectBusy || deleteBusy;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[min(92dvh,860px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <CatalogDeNghiPhieuBody items={items} note={note} />
        <DialogFooter className="gap-2 sm:gap-2">
          {mode === "view" ? (
            <>
              {onDelete ? (
                <button
                  type="button"
                  disabled={anyBusy}
                  onClick={() => void onDelete()}
                  className="mr-auto rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-700 disabled:opacity-50"
                >
                  {deleteBusy ? "Đang xóa…" : deleteLabel}
                </button>
              ) : null}
              <button
                type="button"
                disabled={anyBusy}
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 disabled:opacity-50"
              >
                Đóng
              </button>
            </>
          ) : null}
          {mode === "send" ? (
            <>
              <button
                type="button"
                disabled={anyBusy}
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 disabled:opacity-50"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={anyBusy || items.length === 0}
                onClick={() => void onConfirmSend?.()}
                className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Đang gửi…" : "Xác nhận gửi"}
              </button>
            </>
          ) : null}
          {mode === "approve" ? (
            <>
              <button
                type="button"
                disabled={anyBusy}
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={anyBusy}
                onClick={() => void onReject?.()}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 disabled:opacity-50"
              >
                {rejectBusy ? "Đang từ chối…" : "Từ chối"}
              </button>
              <button
                type="button"
                disabled={anyBusy}
                onClick={() => void onApprove?.()}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {approveBusy ? "Đang duyệt…" : "Duyệt ghi đè master"}
              </button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
