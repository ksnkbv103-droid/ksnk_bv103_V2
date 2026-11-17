"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { xacNhanThamDinhThietBiAction } from "../../actions/cssd-bao-tri-mutations.actions";

type Dong = { ngay: string; maMeThu: string };
const TRONG: Dong[] = [0, 1, 2].map(() => ({ ngay: "", maMeThu: "" }));

/** Nút «Thẩm định» cho máy chờ thẩm định sau bảo trì (ME-03) — cần 3 kết quả BI âm; server kiểm quyền QC. */
export default function ThietBiThamDinhButton({
  thietBiId,
  maThietBi,
  onDone,
}: {
  thietBiId: string;
  maThietBi: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Dong[]>(TRONG);
  const [ghiChu, setGhiChu] = useState("");
  const [busy, setBusy] = useState(false);

  const setRow = (i: number, patch: Partial<Dong>) =>
    setRows((prev) => prev.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  const submit = async () => {
    setBusy(true);
    const r = await xacNhanThamDinhThietBiAction({
      thietBiId,
      biKetQua: rows.map((x) => ({ ngay: x.ngay, maMeThu: x.maMeThu, ketQua: "AM" as const })),
      ghiChu,
    });
    setBusy(false);
    if (!r.success) {
      toast.error(r.error);
      return;
    }
    toast.success(`Máy ${maThietBi} đã thẩm định, sẵn sàng.`);
    setOpen(false);
    setRows(TRONG);
    setGhiChu("");
    onDone();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-8 rounded-lg border border-sky-300 bg-sky-50 px-2 text-[11px] font-semibold text-sky-800"
      >
        Thẩm định
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md space-y-3">
          <DialogTitle>Thẩm định máy {maThietBi}</DialogTitle>
          <p className="text-xs text-slate-600">Nhập đủ 3 mẻ thử có chỉ thị sinh học (BI) âm. Máy về «Sẵn sàng».</p>
          {rows.map((r, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="date"
                value={r.ngay}
                onChange={(e) => setRow(i, { ngay: e.target.value })}
                aria-label={`Ngày mẻ thử ${i + 1}`}
                className="h-9 flex-1 rounded-lg border border-slate-300 px-2 text-sm"
              />
              <input
                value={r.maMeThu}
                onChange={(e) => setRow(i, { maMeThu: e.target.value })}
                placeholder={`Số mẻ thử ${i + 1} (BI âm)`}
                className="h-9 flex-1 rounded-lg border border-slate-300 px-2 text-sm"
              />
            </div>
          ))}
          <textarea
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            rows={2}
            placeholder="Ghi chú (không bắt buộc)"
            className="w-full rounded-lg border border-slate-300 p-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg px-3 text-xs">
              Hủy
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="h-9 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              Xác nhận thẩm định
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
