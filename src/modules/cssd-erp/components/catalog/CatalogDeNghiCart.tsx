"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { toast } from "sonner";
import { createCatalogDeNghiBatchAction } from "@/modules/cssd-erp/actions/cssd-catalog-de-nghi.actions";
import {
  CSSD_CATALOG_DE_NGHI_KIND_LABEL,
  type CssdCatalogDeNghiItem,
} from "@/lib/domain/cssd-catalog-de-nghi";
import { CatalogDeNghiPhieuDialog } from "./CatalogDeNghiPhieuPreview";

type CartCtx = {
  items: CssdCatalogDeNghiItem[];
  addItem: (item: CssdCatalogDeNghiItem) => void;
  removeAt: (index: number) => void;
  clear: () => void;
  submit: (note?: string) => Promise<boolean>;
  submitting: boolean;
};

const Ctx = createContext<CartCtx | null>(null);

export function CatalogDeNghiCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CssdCatalogDeNghiItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addItem = useCallback((item: CssdCatalogDeNghiItem) => {
    setItems((prev) => {
      const key = `${item.kind}:${item.targetId || item.targetMa || ""}`;
      const next = prev.filter((x) => `${x.kind}:${x.targetId || x.targetMa || ""}` !== key);
      next.push(item);
      return next;
    });
    toast.success(`Đã thêm vào phiếu lô (${CSSD_CATALOG_DE_NGHI_KIND_LABEL[item.kind]})`);
  }, []);

  const removeAt = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const submit = useCallback(
    async (note?: string) => {
      if (!items.length) {
        toast.error("Phiếu lô trống.");
        return false;
      }
      setSubmitting(true);
      const res = await createCatalogDeNghiBatchAction({ items, note });
      setSubmitting(false);
      if (!res.success) {
        toast.error(res.error);
        return false;
      }
      toast.success(`Đã gửi phiếu lô ${items.length} mục — chờ admin duyệt.`);
      setItems([]);
      return true;
    },
    [items],
  );

  const value = useMemo(
    () => ({ items, addItem, removeAt, clear, submit, submitting }),
    [items, addItem, removeAt, clear, submit, submitting],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalogDeNghiCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCatalogDeNghiCart outside provider");
  return ctx;
}

export function CatalogDeNghiCartBar() {
  const cart = useCatalogDeNghiCart();
  const [note, setNote] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  if (!cart.items.length) return null;
  return (
    <>
      <div className="sticky bottom-2 z-20 rounded-xl border border-violet-300 bg-violet-50 p-3 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-violet-950">
              Phiếu lô đề nghị — {cart.items.length} mục
            </p>
            <ul className="mt-1 max-h-24 space-y-0.5 overflow-y-auto text-[11px] text-violet-900">
              {cart.items.map((it, i) => (
                <li key={`${it.kind}-${it.targetId}-${i}`} className="flex items-center gap-2">
                  <span className="font-medium">{CSSD_CATALOG_DE_NGHI_KIND_LABEL[it.kind]}</span>
                  <span className="font-mono">{it.targetMa || "—"}</span>
                  <span className="truncate">{it.targetTen || ""}</span>
                  <button
                    type="button"
                    className="ml-auto text-red-700 hover:underline"
                    onClick={() => cart.removeAt(i)}
                  >
                    Bỏ
                  </button>
                </li>
              ))}
            </ul>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú phiếu lô (tuỳ chọn)"
              className="mt-2 w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            <button
              type="button"
              disabled={cart.submitting}
              onClick={() => setPreviewOpen(true)}
              className="rounded-lg bg-[var(--primary)] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              Gửi một phiếu lô
            </button>
            <button
              type="button"
              onClick={() => cart.clear()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600"
            >
              Xóa giỏ
            </button>
          </div>
        </div>
      </div>
      <CatalogDeNghiPhieuDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={`Xem trước phiếu lô — ${cart.items.length} mục`}
        items={cart.items}
        note={note}
        mode="send"
        busy={cart.submitting}
        onConfirmSend={async () => {
          const ok = await cart.submit(note);
          if (ok) setPreviewOpen(false);
        }}
      />
    </>
  );
}
