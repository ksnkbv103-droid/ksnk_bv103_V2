"use client";

import { useEffect, useId, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ImportContractDecision = "cancel" | "safe" | "sync_full";

export type ImportContractPreview = {
  displayName: string;
  total: number;
  updateCount: number;
  insertCount: number;
  /** Số bản ghi sẽ bị ẩn nếu chọn đồng bộ đầy đủ (từ dry-run server). */
  deactivateCount?: number;
  /** Ẩn nút đồng bộ đầy đủ (fact vận hành). */
  disableSyncFull?: boolean;
  /** Tối đa ~5 dòng mẫu (chuỗi đã format). */
  sampleLines: string[];
  /** Lỗi parse / bỏ dòng — hiện trên dialog (đã cắt sẵn phía caller). */
  errorLines?: string[];
  /** Tổng số lỗi (có thể > errorLines.length). */
  errorTotal?: number;
};

type DialogProps = {
  preview: ImportContractPreview;
  onDecide: (d: ImportContractDecision) => void;
};

function ImportConfirmContractDialog({ preview, onDecide }: DialogProps) {
  const titleId = useId();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        onDecide("cancel");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDecide]);

  const close = (d: ImportContractDecision) => {
    setOpen(false);
    onDecide(d);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close("cancel");
      }}
    >
      <DialogContent className="max-w-lg" aria-labelledby={titleId}>
        <DialogHeader>
          <DialogTitle id={titleId}>Xác nhận nạp {preview.displayName}</DialogTitle>
          <DialogDescription>
            Xem trước trước khi ghi vào hệ thống. Hủy ở bước này = không thay đổi dữ liệu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-slate-700">
          <ul className="list-inside list-disc space-y-1 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs">
            <li>
              Tổng bản ghi: <strong>{preview.total}</strong>
            </li>
            <li>
              Cập nhật (có mã): <strong>{preview.updateCount}</strong>
            </li>
            <li>
              Thêm mới: <strong>{preview.insertCount}</strong>
            </li>
            {typeof preview.deactivateCount === "number" && preview.deactivateCount > 0 ? (
              <li>
                Sẽ ẩn nếu đồng bộ đầy đủ: <strong>{preview.deactivateCount}</strong>
              </li>
            ) : null}
          </ul>
          {preview.sampleLines.length > 0 ? (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Mẫu dòng đầu
              </p>
              <pre className="max-h-28 overflow-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                {preview.sampleLines.join("\n")}
              </pre>
            </div>
          ) : null}
          {(preview.errorLines?.length ?? 0) > 0 ? (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-rose-600">
                Dòng lỗi / bỏ qua
                {typeof preview.errorTotal === "number" && preview.errorTotal > (preview.errorLines?.length ?? 0)
                  ? ` (hiện ${preview.errorLines?.length}/${preview.errorTotal})`
                  : ` (${preview.errorTotal ?? preview.errorLines?.length})`}
              </p>
              <pre className="max-h-36 overflow-auto rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-[11px] leading-relaxed text-rose-900">
                {(preview.errorLines ?? []).join("\n")}
              </pre>
            </div>
          ) : null}
          {preview.disableSyncFull ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Dữ liệu vận hành: chỉ cho phép <strong>thêm/cập nhật an toàn</strong> — không ẩn hàng loạt tem đang chạy.
            </p>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              <strong>Đồng bộ đầy đủ</strong> sẽ <strong>ẩn (tắt)</strong> các bản ghi có trong hệ thống nhưng không có
              trong file — <strong>không xóa khỏi cơ sở dữ liệu</strong>. Chỉ chọn khi file là danh sách đầy đủ.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <button
            type="button"
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[var(--primary)] px-4 text-xs font-semibold text-white hover:opacity-95"
            onClick={() => close("safe")}
          >
            Chỉ thêm / cập nhật (an toàn)
          </button>
          {!preview.disableSyncFull ? (
            <button
              type="button"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-4 text-xs font-semibold text-amber-950 hover:bg-amber-100"
              onClick={() => close("sync_full")}
            >
              Đồng bộ đầy đủ (ẩn bản ghi thiếu — không xóa)
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            onClick={() => close("cancel")}
          >
            Hủy — không ghi
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function ensureHost() {
  if (typeof document === "undefined") {
    throw new Error("Import confirm chỉ chạy trên trình duyệt.");
  }
  if (!host) {
    host = document.createElement("div");
    host.setAttribute("data-import-confirm-host", "1");
    document.body.appendChild(host);
    root = createRoot(host);
  }
  return root!;
}

/** Hợp đồng UX nạp file dùng chung (P4) — thay `window.confirm` kép. */
export function requestImportContract(preview: ImportContractPreview): Promise<ImportContractDecision> {
  return new Promise((resolve) => {
    const r = ensureHost();
    const finish = (d: ImportContractDecision) => {
      r.render(null);
      resolve(d);
    };
    r.render(<ImportConfirmContractDialog preview={preview} onDecide={finish} />);
  });
}
