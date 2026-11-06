"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PhuongPhapChoPhepPicker } from "@/modules/cssd-erp/components/catalog/PhuongPhapChoPhepPicker";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import { setPhuongPhapChoPhepManyLoaiAction } from "../actions/loai-dung-cu.actions";

/** Đặt cùng một bộ phương pháp cho các loại đang chọn (nhựa, cao su, điện cực…). */
export function LoaiBulkPhuongPhapDialog({
  ids,
  open,
  onClose,
  onDone,
}: {
  ids: string[];
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [methods, setMethods] = useState<string[]>(["PLASMA", "EO"]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const res = await setPhuongPhapChoPhepManyLoaiAction(ids, methods);
    setBusy(false);
    if (!res.success) return toast.error(res.error);
    if (res.failed.length) {
      toast.error(`Lỗi ${res.failed.length}: ${res.failed.map((f) => `${f.ma} (${f.error})`).join("; ")}`);
    }
    if (res.updated) toast.success(`Đã cập nhật ${res.updated} loại.`);
    onDone();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Sửa phương pháp tiệt khuẩn cho {ids.length} loại</DialogTitle>
        <PhuongPhapChoPhepPicker value={methods} onChange={setMethods} />
        <p className="text-xs text-slate-500">
          Đổi chịu nhiệt (có/không hơi nước) sẽ tự áp tách bộ như khi sửa từng loại.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={C.ctaAmber}>Hủy</button>
          <button type="button" disabled={busy || !methods.length} onClick={submit} className={C.ctaPrimary}>
            {busy ? "Đang lưu…" : "Áp dụng"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
