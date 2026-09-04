"use client";

import React from "react";
import {
  fefoSortLots,
  pickFefoLotKey,
  isFefoLotKey,
  isLotExpired,
  lotRowToKey,
} from "@/lib/domain/cssd-kho-hoa-chat-fefo";
import { formatDateVi } from "@/lib/format-datetime-vi";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { KhoHoaChatTonLo } from "../../actions/cssd-kho-hoa-chat.actions";

type DmOpt = {
  id: string;
  ma_hoa_chat: string;
  ten_hoa_chat: string;
  don_vi_tinh: string | null;
  nguong_ton_toi_thieu: number | null;
};

export type MoveMode = "NHAP" | "XUAT" | "DIEU";

type Props = {
  open: boolean;
  mode: MoveMode;
  dmList: DmOpt[];
  tonLots: KhoHoaChatTonLo[];
  canSubmit: boolean;
  onClose: () => void;
  onSubmit: () => void;
  dmId: string;
  onDmId: (v: string) => void;
  lotKey: string;
  onLotKey: (v: string) => void;
  qty: string;
  onQty: (v: string) => void;
  note: string;
  onNote: (v: string) => void;
  maLoNhap: string;
  onMaLoNhap: (v: string) => void;
  hanNhap: string;
  onHanNhap: (v: string) => void;
  linkedSuCoId?: string | null;
};

function lotOptsForDm(dmId: string, tons: KhoHoaChatTonLo[]): { key: string; label: string; ton: number; disabled: boolean }[] {
  const rows = tons.filter((t) => t.dm_hoa_chat_id === dmId && t.ton_so_luong > 0);
  const fefoKey = pickFefoLotKey(rows);
  return fefoSortLots(rows).map((t) => {
    const expired = isLotExpired(t.han_su_dung);
    const key = lotRowToKey(t);
    const fefoHint = fefoKey && key === fefoKey ? " ★ FEFO" : "";
    return {
      key,
      label: `${t.ma_lo?.length ? `Lô ${t.ma_lo}` : "Không lô"}${t.han_su_dung ? ` — HSD ${formatDateVi(t.han_su_dung)}` : ""} — Tồn ${t.ton_so_luong}${fefoHint}${expired ? " (HẾT HẠN)" : ""}`,
      ton: t.ton_so_luong,
      disabled: expired,
    };
  });
}

export default function KhoHoaChatMoveSheet({
  open,
  mode,
  dmList,
  tonLots,
  canSubmit,
  onClose,
  onSubmit,
  dmId,
  onDmId,
  lotKey,
  onLotKey,
  qty,
  onQty,
  note,
  onNote,
  maLoNhap,
  onMaLoNhap,
  hanNhap,
  onHanNhap,
  linkedSuCoId,
}: Props) {
  if (!open) return null;

  const dmRows = tonLots.filter((t) => t.dm_hoa_chat_id === dmId && t.ton_so_luong > 0);
  const lots = mode === "NHAP" ? [] : lotOptsForDm(dmId, tonLots);
  const showFefoWarning = mode === "XUAT" && Boolean(lotKey && dmId && !isFefoLotKey(lotKey, dmRows));

  const title =
    mode === "NHAP" ? "Nhập kho" : mode === "XUAT" ? "Xuất kho (theo lô)" : "Điều chỉnh tồn (kiểm kê)";
  const subtitle = linkedSuCoId
    ? "Phiếu này sẽ liên kết với báo cáo sự cố CHEMICAL đã chọn."
    : mode === "XUAT"
      ? "Lô được sắp theo FEFO (hết hạn trước). Không xuất lô quá hạn."
      : "Đơn vị theo danh mục (chai, lọ, kg…).";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="flex max-h-[min(90dvh,880px)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">{title}</DialogTitle>

        <div className="shrink-0 border-b border-slate-100 px-5 py-4 pr-14">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4">
          <div>
            <label className="text-[11px] font-medium text-slate-500">Mặt hàng</label>
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={dmId} onChange={(e) => onDmId(e.target.value)}>
              <option value="">— Chọn —</option>
              {dmList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.ma_hoa_chat} — {d.ten_hoa_chat}
                </option>
              ))}
            </select>
          </div>

          {(mode === "XUAT" || mode === "DIEU") && dmId ? (
            <div>
              <label className="text-[11px] font-medium text-slate-500">{mode === "XUAT" ? "Lô xuất" : "Lô điều chỉnh"}</label>
              <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={lotKey} onChange={(e) => onLotKey(e.target.value)}>
                <option value="">— Không lô / không HSD —</option>
                {lots.map((l) => (
                  <option key={l.key} value={l.key} disabled={l.disabled}>
                    {l.label}
                  </option>
                ))}
              </select>
              {showFefoWarning ? (
                <p className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">
                  Bạn đang chọn lô không theo FEFO — nên ưu tiên lô có hạn sử dụng gần nhất.
                </p>
              ) : null}
            </div>
          ) : null}

          {mode === "NHAP" ? (
            <>
              <div>
                <label className="text-[11px] font-medium text-slate-500">Mã lô (tuỳ chọn)</label>
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={maLoNhap} onChange={(e) => onMaLoNhap(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500">Hạn SD (tuỳ chọn)</label>
                <input type="date" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={hanNhap} onChange={(e) => onHanNhap(e.target.value)} />
              </div>
            </>
          ) : null}

          <div>
            <label className="text-[11px] font-medium text-slate-500">
              {mode === "NHAP" ? "Số lượng nhập" : mode === "XUAT" ? "Số lượng xuất" : "Điều chỉnh (+ hoặc -)"}
            </label>
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={qty}
              onChange={(e) => onQty(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500">Ghi chú</label>
            <textarea className="mt-1 min-h-[64px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={note} onChange={(e) => onNote(e.target.value)} />
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
          <button type="button" className="rounded-lg px-4 py-2 text-sm text-slate-600" onClick={onClose}>
            Đóng
          </button>
          <button
            type="button"
            className={`rounded-lg px-5 py-2 text-sm font-semibold ${canSubmit ? "bg-[var(--primary)] text-white" : "bg-slate-200 text-slate-500"}`}
            disabled={!canSubmit}
            onClick={() => void onSubmit()}
          >
            Ghi nhận
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
