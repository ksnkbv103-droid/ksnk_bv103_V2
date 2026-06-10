"use client";

import React from "react";
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
};

function lotOptsForDm(dmId: string, tons: KhoHoaChatTonLo[]): { key: string; label: string; ton: number }[] {
  return tons
    .filter((t) => t.dm_hoa_chat_id === dmId && t.ton_so_luong > 0)
    .map((t) => ({
      key: `${t.ma_lo ?? ""}|${t.han_su_dung ?? ""}`,
      label: `${t.ma_lo?.length ? `Lô ${t.ma_lo}` : "Không lô"}${t.han_su_dung ? ` — HSD ${t.han_su_dung}` : ""} — Tồn ${t.ton_so_luong}`,
      ton: t.ton_so_luong,
    }));
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
}: Props) {
  if (!open) return null;

  const lots = mode === "NHAP" ? [] : lotOptsForDm(dmId, tonLots);

  const title =
    mode === "NHAP" ? "Nhập kho" : mode === "XUAT" ? "Xuất kho (theo lô)" : "Điều chỉnh tồn (kiểm kê)";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{mode === "XUAT" ? "Chọn đúng lô có tồn > 0." : "Đơn vị theo danh mục (chai, lọ, kg…)."}</p>
        </div>
        <div className="space-y-3 overflow-y-auto px-5 py-4">
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
                  <option key={l.key} value={l.key}>
                    {l.label}
                  </option>
                ))}
              </select>
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
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" className="rounded-lg px-4 py-2 text-sm text-slate-600" onClick={onClose}>
            Đóng
          </button>
          <button
            type="button"
            className={`rounded-lg px-5 py-2 text-sm font-semibold ${canSubmit ? "bg-[var(--primary)] text-[#FFD700]" : "bg-slate-200 text-slate-500"}`}
            disabled={!canSubmit}
            onClick={() => void onSubmit()}
          >
            Ghi nhận
          </button>
        </div>
      </div>
    </div>
  );
}
