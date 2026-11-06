"use client";

import React from "react";
import {
  isFefoLotKey,
} from "@/lib/domain/cssd-kho-hoa-chat-fefo";
import { LY_DO_XUAT, LY_DO_XUAT_LABEL, type LyDoXuat } from "@/lib/domain/cssd-kho-hoa-chat-ly-do-xuat";
import { lotOptsForDm } from "./kho-hoa-chat-lot-opts";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { KhoHoaChatTonLo } from "../../actions/cssd-kho-hoa-chat.actions";

type DmOpt = {
  id: string;
  ma_hoa_chat: string;
  ten_hoa_chat: string;
  don_vi_tinh: string | null;
  nguong_ton_toi_thieu: number | null;
};

const LBL = "bv103-type-label font-medium text-slate-500";
const INP = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

export type MoveMode = "NHAP" | "XUAT";

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
  lyDoXuat: LyDoXuat | "";
  onLyDoXuat: (v: LyDoXuat | "") => void;
};

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
  lyDoXuat,
  onLyDoXuat,
}: Props) {
  if (!open) return null;

  const dmRows = tonLots.filter((t) => t.dm_hoa_chat_id === dmId && t.ton_so_luong > 0);
  const lots = mode === "NHAP" ? [] : lotOptsForDm(dmId, tonLots, lyDoXuat === "HET_HAN_HUY");
  const showFefoWarning = mode === "XUAT" && Boolean(lotKey && dmId && !isFefoLotKey(lotKey, dmRows));

  const title =
    mode === "NHAP" ? "Nhập kho (lĩnh hàng về kho)" : "Xuất kho (theo lô)";
  const subtitle = linkedSuCoId
    ? "Phiếu này sẽ liên kết với báo cáo sự cố CHEMICAL đã chọn."
    : mode === "XUAT"
      ? "Lô được sắp theo FEFO (hết hạn trước). Lô quá hạn chỉ xuất với lý do «Hết hạn, hủy»."
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
          <p className="bv103-type-label text-slate-500">{subtitle}</p>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4">
          <div>
            <label className={LBL}>Mặt hàng</label>
            <select className={INP} value={dmId} onChange={(e) => onDmId(e.target.value)}>
              <option value="">— Chọn —</option>
              {dmList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.ma_hoa_chat} — {d.ten_hoa_chat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LBL}>{mode === "NHAP" ? "Số lượng nhập" : "Số lượng xuất"}</label>
            <input type="number" step="0.01" className={INP} value={qty} onChange={(e) => onQty(e.target.value)} />
          </div>

          {mode === "XUAT" ? (
            <div>
              <label className={LBL}>Lý do xuất</label>
              <select className={INP} value={lyDoXuat} onChange={(e) => onLyDoXuat(e.target.value as LyDoXuat | "")}>
                <option value="">— Chọn lý do —</option>
                {LY_DO_XUAT.map((k) => (
                  <option key={k} value={k}>
                    {LY_DO_XUAT_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {mode === "NHAP" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LBL}>Mã lô (tuỳ chọn)</label>
                <input className={INP} value={maLoNhap} onChange={(e) => onMaLoNhap(e.target.value)} />
              </div>
              <div>
                <label className={LBL}>Hạn sử dụng (tuỳ chọn)</label>
                <input type="date" className={INP} value={hanNhap} onChange={(e) => onHanNhap(e.target.value)} />
              </div>
            </div>
          ) : null}

          {mode === "XUAT" && dmId ? (
            <details className="rounded-lg border border-slate-200 px-3 py-2" open={showFefoWarning}>
              <summary className="bv103-type-label cursor-pointer font-medium text-slate-600">
                Lô xuất: tự chọn theo FEFO — đổi lô
              </summary>
              <select className={INP} value={lotKey} onChange={(e) => onLotKey(e.target.value)}>
                <option value="">— Không lô / không HSD —</option>
                {lots.map((l) => (
                  <option key={l.key} value={l.key} disabled={l.disabled}>
                    {l.label}
                  </option>
                ))}
              </select>
              {showFefoWarning ? (
                <p className="bv103-type-label mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 font-medium text-amber-800">
                  Bạn đang chọn lô không theo FEFO — nên ưu tiên lô có hạn sử dụng gần nhất.
                </p>
              ) : null}
            </details>
          ) : null}

          <div>
            <label className={LBL}>Ghi chú</label>
            <input className={INP} value={note} onChange={(e) => onNote(e.target.value)} />
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
