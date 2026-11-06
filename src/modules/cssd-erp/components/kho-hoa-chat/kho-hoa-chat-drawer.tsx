"use client";

import { lyDoXuatLabel } from "@/lib/domain/cssd-kho-hoa-chat-ly-do-xuat";
import React, { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import { buildTheKho } from "@/lib/domain/cssd-kho-hoa-chat-the-kho";
import KhoHoaChatPrintView, { type KhoPrintState } from "./kho-hoa-chat-print-view";
import { fefoSortLots } from "@/lib/domain/cssd-kho-hoa-chat-fefo";
import { canShowDuyetButtons, normalizeTrangThai, trangThaiLabel, validateLyDoTuChoi } from "@/lib/domain/cssd-kho-hoa-chat-duyet";
import type { DmStockSummary } from "@/lib/domain/cssd-kho-hoa-chat-summary";
import { formatDateTimeVi, formatDateVi } from "@/lib/format-datetime-vi";
import type { KhoHoaChatGiaoDichRow, KhoHoaChatTonLo, SuCoChemicalRow } from "../../actions/cssd-kho-hoa-chat.actions";

export type DrawerApprove = {
  canApprove: boolean;
  decidingId: string | null;
  onDecide: (row: KhoHoaChatGiaoDichRow, q: "DUYET" | "TU_CHOI", lyDo?: string) => Promise<boolean>;
};

type Props = {
  dm: DmStockSummary;
  lots: KhoHoaChatTonLo[];
  movs: KhoHoaChatGiaoDichRow[];
  suCo: SuCoChemicalRow[];
  canEdit: boolean;
  approve: DrawerApprove;
  onXuatTuSuCo: (r: SuCoChemicalRow) => void;
  onClose: () => void;
};

const LOAI: Record<string, string> = { NHAP: "Nhập", NHAP_KHO: "Nhập", XUAT: "Xuất", XUAT_KHO: "Xuất" };
const H = "bv103-type-label font-semibold text-slate-500";

export default function KhoHoaChatDrawer({ dm, lots, movs, suCo, canEdit, approve, onXuatTuSuCo, onClose }: Props) {
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [lyDo, setLyDo] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const [printState, setPrintState] = useState<KhoPrintState>(null);
  const item = { ma_hoa_chat: dm.ma_hoa_chat, ten_hoa_chat: dm.ten_hoa_chat, don_vi_tinh: dm.don_vi_tinh ?? null, tong_ton: dm.tong_ton };
  // Render vùng in trước, rồi mới gọi hộp thoại in; xong thì gỡ.
  useEffect(() => {
    if (!printState) return;
    const done = () => setPrintState(null);
    window.addEventListener("afterprint", done);
    const t = window.setTimeout(() => window.print(), 50);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("afterprint", done);
    };
  }, [printState]);
  const sorted = fefoSortLots(lots.filter((l) => l.ton_so_luong > 0));

  const reject = async (m: KhoHoaChatGiaoDichRow) => {
    const e = validateLyDoTuChoi("TU_CHOI", lyDo);
    setLoi(e);
    if (e) return;
    if (await approve.onDecide(m, "TU_CHOI", lyDo)) {
      setRejectId(null);
      setLyDo("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{dm.ten_hoa_chat}</h2>
            <p className="bv103-type-label text-slate-500">
              {dm.ma_hoa_chat} · Tồn {dm.tong_ton} {dm.don_vi_tinh || ""}
            </p>
          </div>
          <button type="button" onClick={() => setPrintState({ kind: "THE_KHO", item, the: buildTheKho(movs, dm.tong_ton) })} className="ml-auto flex items-center gap-1 rounded border border-slate-200 px-2 py-1 bv103-type-label font-semibold text-slate-700 hover:bg-slate-50">
            <Printer className="h-3.5 w-3.5" /> In thẻ kho
          </button>
          <button type="button" aria-label="Đóng" onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {suCo.length ? (
          <div className="mb-3 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2">
            <p className={H}>Sự cố chờ ghi xuất ({suCo.length})</p>
            {suCo.slice(0, 5).map((r) => (
              <p key={r.id} className="bv103-type-label flex justify-between gap-2 text-slate-700">
                <span className="truncate">{r.incident_type_label || "Sự cố"}{r.ma_lo ? ` · Lô ${r.ma_lo}` : ""}</span>
                {canEdit ? (
                  <button type="button" className="font-semibold text-violet-700 underline" onClick={() => onXuatTuSuCo(r)}>
                    Ghi xuất
                  </button>
                ) : null}
              </p>
            ))}
          </div>
        ) : null}

        <p className={H}>Các lô (hết hạn trước)</p>
        <ul className="mb-4 mt-1 space-y-1">
          {sorted.length ? (
            sorted.map((l, i) => (
              <li key={`${l.ma_lo}-${l.han_su_dung}-${i}`} className="bv103-type-label flex justify-between rounded border border-slate-100 px-2 py-1">
                <span>{l.ma_lo ? `Lô ${l.ma_lo}` : "Không mã lô"} · HSD {l.han_su_dung ? formatDateVi(l.han_su_dung) : "—"}</span>
                <span className="font-semibold tabular-nums">{l.ton_so_luong}</span>
              </li>
            ))
          ) : (
            <li className="bv103-type-label text-slate-500">Hết hàng.</li>
          )}
        </ul>

        <p className={H}>Lịch sử nhập, xuất</p>
        <ul className="mt-1 space-y-2">
          {movs.length ? (
            movs.map((m) => {
              const tt = normalizeTrangThai(m.trang_thai);
              const showBtn = canShowDuyetButtons({ trangThai: m.trang_thai, canApprove: approve.canApprove });
              const busy = approve.decidingId === m.id;
              return (
                <li key={m.id} className="rounded-lg border border-slate-100 px-2.5 py-2">
                  <p className="bv103-type-label flex justify-between font-semibold text-slate-800">
                    <span>{LOAI[m.loai_giao_dich] ?? "Điều chỉnh (cũ)"} {m.so_luong_co_dau} · {m.ma_phieu}{m.ly_do_xuat ? ` · ${lyDoXuatLabel(m.ly_do_xuat)}` : ""}</span>
                    <span className={tt === "CHO_DUYET" ? "text-amber-700" : tt === "TU_CHOI" ? "text-rose-700" : "text-emerald-700"}>{trangThaiLabel(m.trang_thai)}</span>
                  </p>
                  <p className="bv103-type-label text-slate-500">
                    {m.created_at ? formatDateTimeVi(m.created_at) : "—"} · Lập: {m.nguoi_lap_ten || "—"}
                    {m.nguoi_duyet_ten ? ` · Duyệt: ${m.nguoi_duyet_ten}` : ""}
                    {m.tu_duyet_ngoai_le ? " · tự duyệt ngoại lệ" : ""}
                  </p>
                  {tt === "DA_DUYET" && m.so_luong_co_dau !== 0 ? (
                    <button type="button" onClick={() => setPrintState({ kind: "PHIEU", item, mov: m })} className="mt-1 flex items-center gap-1 bv103-type-label font-semibold text-slate-600 underline">
                      <Printer className="h-3 w-3" /> In phiếu
                    </button>
                  ) : null}
                  {tt === "TU_CHOI" && m.ly_do_tu_choi ? <p className="bv103-type-label text-rose-700">Lý do: {m.ly_do_tu_choi}</p> : null}
                  {showBtn ? (
                    rejectId === m.id ? (
                      <div className="mt-1.5 space-y-1">
                        <input value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="Lý do từ chối (bắt buộc)" className="w-full rounded border border-slate-200 px-2 py-1 text-sm" />
                        {loi ? <p className="bv103-type-label text-rose-700">{loi}</p> : null}
                        <div className="flex gap-2">
                          <button type="button" disabled={busy} onClick={() => void reject(m)} className="rounded bg-rose-600 px-2 py-0.5 bv103-type-label font-semibold text-white disabled:opacity-50">Xác nhận từ chối</button>
                          <button type="button" onClick={() => { setRejectId(null); setLoi(null); }} className="bv103-type-label text-slate-600">Hủy</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1.5 flex gap-2">
                        <button type="button" disabled={busy} onClick={() => void approve.onDecide(m, "DUYET")} className="rounded bg-emerald-600 px-2 py-0.5 bv103-type-label font-semibold text-white disabled:opacity-50">Duyệt</button>
                        <button type="button" disabled={busy} onClick={() => { setRejectId(m.id); setLyDo(""); setLoi(null); }} className="rounded border border-rose-300 px-2 py-0.5 bv103-type-label font-semibold text-rose-700 disabled:opacity-50">Từ chối</button>
                      </div>
                    )
                  ) : null}
                </li>
              );
            })
          ) : (
            <li className="bv103-type-label text-slate-500">Chưa có phiếu.</li>
          )}
        </ul>
      </aside>
      <KhoHoaChatPrintView state={printState} />
    </div>
  );
}
