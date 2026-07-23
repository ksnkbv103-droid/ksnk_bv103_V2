"use client";

import React from "react";
import {
  fefoSortLots,
  isFefoLotKey,
  isLotExpired,
  lotRowToKey,
} from "@/lib/domain/cssd-kho-hoa-chat-fefo";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
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
  return fefoSortLots(rows).map((t, idx) => {
    const expired = isLotExpired(t.han_su_dung);
    const fefoHint = idx === 0 && !expired ? " ★ FEFO" : "";
    return {
      key: lotRowToKey(t),
      label: `${t.ma_lo?.length ? `Lô ${t.ma_lo}` : "Không lô"}${t.han_su_dung ? ` — HSD ${t.han_su_dung}` : ""} — Tồn ${t.ton_so_luong}${fefoHint}${expired ? " (HẾT HẠN)" : ""}`,
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

  return (
    <div className={C.modalOverlay} role="dialog" aria-modal="true">
      <div className="flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200 bg-white shadow-xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-2xl sm:animate-in sm:fade-in-0 sm:zoom-in-95">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">
            {linkedSuCoId
              ? "Phiếu này sẽ liên kết với báo cáo sự cố CHEMICAL đã chọn."
              : mode === "XUAT"
                ? "Lô được sắp theo FEFO (hết hạn trước). Không xuất lô quá hạn."
                : "Đơn vị theo danh mục (chai, lọ, kg…)."}
          </p>
        </div>
        <div className="space-y-3 overflow-y-auto overscroll-contain px-5 py-4">
          <div>
            <label className={C.labelField}>Mặt hàng</label>
            <select className={`mt-1 ${C.controlSelectNative}`} value={dmId} onChange={(e) => onDmId(e.target.value)}>
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
              <label className={C.labelField}>{mode === "XUAT" ? "Lô xuất" : "Lô điều chỉnh"}</label>
              <select className={`mt-1 ${C.controlSelectNative}`} value={lotKey} onChange={(e) => onLotKey(e.target.value)}>
                <option value="">— Không lô / không HSD —</option>
                {lots.map((l) => (
                  <option key={l.key} value={l.key} disabled={l.disabled}>
                    {l.label}
                  </option>
                ))}
              </select>
              {showFefoWarning ? (
                <p className={`mt-1.5 ${C.noticeWarning}`}>
                  Bạn đang chọn lô không theo FEFO — nên ưu tiên lô có hạn sử dụng gần nhất.
                </p>
              ) : null}
            </div>
          ) : null}

          {mode === "NHAP" ? (
            <>
              <div>
                <label className={C.labelField}>Mã lô (tuỳ chọn)</label>
                <input className={`mt-1 ${C.controlInput}`} value={maLoNhap} onChange={(e) => onMaLoNhap(e.target.value)} />
              </div>
              <div>
                <label className={C.labelField}>Hạn SD (tuỳ chọn)</label>
                <input type="date" className={`mt-1 ${C.controlInput}`} value={hanNhap} onChange={(e) => onHanNhap(e.target.value)} />
              </div>
            </>
          ) : null}

          <div>
            <label className={C.labelField}>
              {mode === "NHAP" ? "Số lượng nhập" : mode === "XUAT" ? "Số lượng xuất" : "Điều chỉnh (+ hoặc -)"}
            </label>
            <input
              type="number"
              step="0.01"
              className={`mt-1 ${C.controlInput}`}
              value={qty}
              onChange={(e) => onQty(e.target.value)}
            />
          </div>

          <div>
            <label className={C.labelField}>Ghi chú</label>
            <textarea className={`mt-1 ${C.textareaCompact}`} value={note} onChange={(e) => onNote(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" className={C.btnSecondary} onClick={onClose}>
            Đóng
          </button>
          <button
            type="button"
            className={canSubmit ? C.btnPrimary : `${C.btnPrimary} opacity-50`}
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
