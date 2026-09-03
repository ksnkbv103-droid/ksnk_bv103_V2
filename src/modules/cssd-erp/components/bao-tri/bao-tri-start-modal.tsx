"use client";

import React from "react";
import type { LoaiPhieuBaoTri } from "../../actions/cssd-bao-tri.types";
import type { BaoTriMachineOption } from "../../actions/cssd-bao-tri-list.actions";
import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";
import { matchesDeviceCode, normalizeCssdCode } from "../../shared/domain/cssd-qr-core";
import QrScanInput from "@/components/shared/QrScanInput";

type Props = {
  open: boolean;
  machines: BaoTriMachineOption[];
  selTb: string;
  loaiPhieu: LoaiPhieuBaoTri;
  maMayHoacQr: string;
  lyDo: string;
  onSelTb: (v: string) => void;
  onLoaiPhieu: (v: LoaiPhieuBaoTri) => void;
  onMaMayHoacQr: (v: string) => void;
  onLyDo: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

function matchMachine(code: string, machines: BaoTriMachineOption[]) {
  return machines.find((m) => matchesDeviceCode(code, m.ma_thiet_bi, [m.ma_qr_thiet_bi]));
}

export default function BaoTriStartModal({
  open,
  machines,
  selTb,
  loaiPhieu,
  maMayHoacQr,
  lyDo,
  onSelTb,
  onLoaiPhieu,
  onMaMayHoacQr,
  onLyDo,
  onClose,
  onSubmit,
}: Props) {
  if (!open) return null;

  const applyScan = (raw: string) => {
    const code = normalizeCssdCode(raw);
    onMaMayHoacQr(code);
    if (!code) return;
    const matched = matchMachine(code, machines);
    if (matched) onSelTb(matched.id);
  };

  return (
    <div className={`${UI.sectionGap} fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4`} role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-[var(--radius-shell)] border border-slate-200 bg-white p-6 shadow-[var(--shadow-app-soft)]">
        <h2 className="bv103-type-title text-slate-900">Mở phiếu bảo dưỡng / sửa chữa</h2>
        <p className="mt-1 text-xs text-slate-500">Quét mã máy (nếu có) hoặc chọn tay. Chỉ máy sẵn sàng và không có mẻ TK mở.</p>

        <label className="mt-4 block text-[11px] font-medium text-slate-500">Loại phiếu</label>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => onLoaiPhieu("DINH_KY")}
            className={`flex-1 rounded-lg border px-3 py-2 text-[11px] font-semibold uppercase ${loaiPhieu === "DINH_KY" ? "border-[var(--primary)] bg-emerald-50 text-[var(--primary)]" : "border-slate-200 text-slate-600"}`}
          >
            Bảo dưỡng định kỳ
          </button>
          <button
            type="button"
            onClick={() => onLoaiPhieu("SUA_CHUA")}
            className={`flex-1 rounded-lg border px-3 py-2 text-[11px] font-semibold uppercase ${loaiPhieu === "SUA_CHUA" ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-600"}`}
          >
            Sửa chữa
          </button>
        </div>

        <label className="mt-4 block text-[11px] font-medium text-slate-500">Mã máy / QR máy</label>
        <div className="mt-1">
          <QrScanInput
            placeholder="Ví dụ: MAY-01 hoặc mã QR tương đương"
            cameraTitle="Quét QR máy"
            onEnter={applyScan}
            onCameraScan={applyScan}
          />
          {maMayHoacQr ? (
            <p className="mt-1 font-mono text-[11px] text-slate-500">Đã nhận: {maMayHoacQr}</p>
          ) : null}
        </div>
        <label className="mt-4 block text-[11px] font-medium text-slate-500">Hoặc chọn máy</label>
        <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={selTb} onChange={(e) => onSelTb(e.target.value)}>
          <option value="">— Chọn —</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.ma_thiet_bi} — {m.ten_thiet_bi}
            </option>
          ))}
        </select>
        <label className="mt-3 block text-[11px] font-medium text-slate-500">Lý do / nội dung</label>
        <textarea className="mt-1 min-h-[88px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={lyDo} onChange={(e) => onLyDo(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-lg px-4 py-2 text-sm text-slate-600" onClick={onClose}>
            Đóng
          </button>
          <button
            type="button"
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
            onClick={() => void onSubmit()}
            disabled={!selTb.trim() || !lyDo.trim()}
          >
            Bắt đầu
          </button>
        </div>
      </div>
    </div>
  );
}
