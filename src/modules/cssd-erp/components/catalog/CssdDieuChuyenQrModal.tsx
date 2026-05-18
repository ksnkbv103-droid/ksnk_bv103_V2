"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { dieuChuyenThanhPhanGiuaHaiQrAction } from "../../actions/cssd-asset.actions";
import { CSSD_UI_ACTION_PRIMARY, CSSD_UI_ACTION_SECONDARY } from "../../shared/ui/cssd-ui-chrome";

type Props = {
  open: boolean;
  onClose: () => void;
  suggestedTenDungCu?: string | null;
  onSuccess?: () => void;
};

export default function CssdDieuChuyenQrModal({ open, onClose, suggestedTenDungCu, onSuccess }: Props) {
  const [maQrTu, setMaQrTu] = useState("");
  const [maQrDen, setMaQrDen] = useState("");
  const [tenDungCu, setTenDungCu] = useState("");
  const [soLuong, setSoLuong] = useState("1");
  const [ghiChu, setGhiChu] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && suggestedTenDungCu) setTenDungCu(suggestedTenDungCu);
  }, [open, suggestedTenDungCu]);

  if (!open) return null;

  const submit = async () => {
    setBusy(true);
    try {
      const r = await dieuChuyenThanhPhanGiuaHaiQrAction({
        maQrTu: maQrTu.trim().toUpperCase(),
        maQrDen: maQrDen.trim().toUpperCase(),
        tenDungCuLe: tenDungCu.trim(),
        soLuong: Number(soLuong),
        ghiChu: ghiChu.trim() || undefined,
      });
      if (!r.success) throw new Error(r.error);
      toast.success("Đã điều chuyển cấu phần giữa hai bộ QR.");
      onSuccess?.();
      onClose();
      setMaQrTu("");
      setMaQrDen("");
      setSoLuong("1");
      setGhiChu("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Điều chuyển thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-labelledby="dieu-chuyen-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 id="dieu-chuyen-title" className="text-sm font-bold text-slate-900">
              Điều chuyển cấu phần (2 mã QR)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Chuyển số lượng dụng cụ lẻ giữa hai bộ đang hoạt động trên quy trình.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-[10px] font-semibold uppercase text-slate-500">
            QR bộ nguồn
            <input
              value={maQrTu}
              onChange={(e) => setMaQrTu(e.target.value.toUpperCase())}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm"
              placeholder="BV103-DC-…"
            />
          </label>
          <label className="block text-[10px] font-semibold uppercase text-slate-500">
            QR bộ đích
            <input
              value={maQrDen}
              onChange={(e) => setMaQrDen(e.target.value.toUpperCase())}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm"
              placeholder="BV103-DC-…"
            />
          </label>
          <label className="block text-[10px] font-semibold uppercase text-slate-500">
            Tên dụng cụ lẻ
            <input
              value={tenDungCu}
              onChange={(e) => setTenDungCu(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
          </label>
          <label className="block text-[10px] font-semibold uppercase text-slate-500">
            Số lượng
            <input
              type="number"
              min={1}
              value={soLuong}
              onChange={(e) => setSoLuong(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
          </label>
          <label className="block text-[10px] font-semibold uppercase text-slate-500">
            Ghi chú (tùy chọn)
            <textarea
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={CSSD_UI_ACTION_SECONDARY} onClick={onClose} disabled={busy}>
            Hủy
          </button>
          <button type="button" className={CSSD_UI_ACTION_PRIMARY} disabled={busy} onClick={() => void submit()}>
            {busy ? "Đang xử lý…" : "Xác nhận điều chuyển"}
          </button>
        </div>
      </div>
    </div>
  );
}
