"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildBaoCaoNxt, type NxtSoRow } from "@/lib/domain/cssd-kho-hoa-chat-bao-cao-nxt";
import type { DmLite } from "@/lib/domain/cssd-kho-hoa-chat-summary";
import { downloadRowsAsExcel } from "@/lib/analytics/download-supervision-excel";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { todayYmdInVn } from "@/lib/format-datetime-vi";
import { listSoKhoHoaChatDenNgayAction } from "../../actions/cssd-kho-hoa-chat.actions";

const TH = `${bv103LayoutChrome.labelField} px-2 py-1.5 text-right font-semibold text-slate-500`;
const TD = "px-2 py-1.5 text-right tabular-nums";

export default function KhoHoaChatBaoCaoPanel({ dms }: { dms: DmLite[] }) {
  const homNay = useMemo(() => todayYmdInVn(), []);
  const [tu, setTu] = useState(`${homNay.slice(0, 8)}01`);
  const [den, setDen] = useState(homNay);
  const [so, setSo] = useState<NxtSoRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (denNgay: string) => {
    setBusy(true);
    const r = await listSoKhoHoaChatDenNgayAction(denNgay);
    if (r.success) setSo(r.data);
    else toast.error(r.error);
    setBusy(false);
  }, []);
  useEffect(() => {
    if (den) void load(den);
  }, [den, load]);

  const kyHopLe = Boolean(tu && den && tu <= den);
  const dong = useMemo(() => (kyHopLe ? buildBaoCaoNxt(so, dms, tu, den) : []), [so, dms, tu, den, kyHopLe]);

  const xuatExcel = () =>
    downloadRowsAsExcel(
      "Nhập-Xuất-Tồn",
      dong.map((d) => ({
        "Mã": d.ma_hoa_chat,
        "Tên hóa chất, vật tư": d.ten_hoa_chat,
        "Đơn vị": d.don_vi_tinh ?? "",
        "Tồn đầu kỳ": d.ton_dau,
        "Nhập trong kỳ": d.nhap,
        "Xuất cấp sử dụng": d.xuat_cap_su_dung,
        "Xuất khác (hủy, hỏng, thất thoát, kiểm kê)": d.xuat_khac,
        "Tồn cuối kỳ": d.ton_cuoi,
      })),
      `NXT_${tu}_${den}`,
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="bv103-type-label text-slate-600">
          Từ ngày
          <input type="date" value={tu} max={den} onChange={(e) => setTu(e.target.value)} className="ml-2 rounded border border-slate-200 px-2 py-1 text-sm" />
        </label>
        <label className="bv103-type-label text-slate-600">
          Đến ngày
          <input type="date" value={den} min={tu} max={homNay} onChange={(e) => setDen(e.target.value)} className="ml-2 rounded border border-slate-200 px-2 py-1 text-sm" />
        </label>
        <button type="button" disabled={!dong.length} onClick={() => void xuatExcel()} className="flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 bv103-type-label font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <Download className="h-3.5 w-3.5" /> Xuất Excel
        </button>
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
      </div>
      {!kyHopLe ? <p className="bv103-type-label text-rose-700">Kỳ báo cáo không hợp lệ: ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p> : null}
      <p className="bv103-type-label text-slate-500">Chỉ tính phiếu đã duyệt. Tồn cuối = tồn đầu + nhập − xuất.</p>
      <div className="overflow-x-auto rounded-lg border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className={`${TH} text-left`}>Hóa chất, vật tư</th>
              <th className={TH}>Tồn đầu</th>
              <th className={TH}>Nhập</th>
              <th className={TH}>Xuất cấp SD</th>
              <th className={TH}>Xuất khác</th>
              <th className={TH}>Tồn cuối</th>
            </tr>
          </thead>
          <tbody>
            {dong.length ? (
              dong.map((d) => (
                <tr key={d.dm_hoa_chat_id} className="border-b border-slate-50">
                  <td className="px-2 py-1.5">{d.ten_hoa_chat} <span className="text-slate-400">· {d.ma_hoa_chat}{d.don_vi_tinh ? ` · ${d.don_vi_tinh}` : ""}</span></td>
                  <td className={TD}>{d.ton_dau}</td>
                  <td className={TD}>{d.nhap}</td>
                  <td className={TD}>{d.xuat_cap_su_dung}</td>
                  <td className={TD}>{d.xuat_khac}</td>
                  <td className={`${TD} font-semibold`}>{d.ton_cuoi}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="px-2 py-4 text-center bv103-type-label text-slate-500">{busy ? "Đang tải…" : "Không có phát sinh hoặc tồn trong kỳ."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
