"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { moKhoaMayHoldQcAction } from "../../actions/cssd-bao-tri-mutations.actions";

/** Nút «Mở khóa» cho máy tạm giữ QC — server chỉ cho Admin / Chủ nhiệm khoa. */
export default function ThietBiMoKhoaButton({
  thietBiId,
  maThietBi,
  onDone,
}: {
  thietBiId: string;
  maThietBi: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [lyDo, setLyDo] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const r = await moKhoaMayHoldQcAction({ thietBiId, lyDo });
    setBusy(false);
    if (!r.success) {
      toast.error(r.error);
      return;
    }
    toast.success(`Đã mở khóa máy ${maThietBi}.`);
    setOpen(false);
    setLyDo("");
    onDone();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-8 rounded-lg border border-amber-300 bg-amber-50 px-2 text-[11px] font-semibold text-amber-800"
      >
        Mở khóa
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md space-y-3">
          <DialogTitle>Mở khóa máy {maThietBi}</DialogTitle>
          <p className="text-xs text-slate-600">
            Chỉ Admin hoặc Chủ nhiệm khoa KSNK. Máy về «Sẵn sàng»; lý do được lưu vết.
          </p>
          <textarea
            value={lyDo}
            onChange={(e) => setLyDo(e.target.value)}
            rows={3}
            placeholder="Lý do mở khóa (bắt buộc)"
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
              Xác nhận mở khóa
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
