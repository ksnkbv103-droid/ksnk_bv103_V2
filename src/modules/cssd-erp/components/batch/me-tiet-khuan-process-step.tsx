"use client";

import React, { useMemo, useState } from "react";
import { History, Lock, PlayCircle, StopCircle } from "lucide-react";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../layout/cssd-page-shell";
import MeTietKhuanProcessScanPanel, { type MeTkItemRow } from "./me-tiet-khuan-process-scan-panel";
import MeTietKhuanProcessQcPanel from "./me-tiet-khuan-process-qc-panel";
import MeTietKhuanWaitingPanel, { type MeTkWaitingRow } from "./me-tiet-khuan-waiting-panel";
import { CSSD_UI_ACTION_PRIMARY, CSSD_UI_ACTION_SECONDARY } from "../../shared/ui/cssd-ui-chrome";
import { isSteamSterilizerProfile } from "../../helpers/me-tiet-khuan-machine-kind";

type MeRow = {
  id: string;
  ma_lo_tiet_khuan?: string;
  tk_chot_nap_at?: string | null;
  tk_mo_form_qc_at?: string | null;
  thiet_bi?: { ten_thiet_bi?: string | null; loai_thiet_bi?: string | null } | null;
};

export default function MeTietKhuanProcessStep({
  activeMe,
  batchGate,
  items,
  waitingRows,
  nguoiUnload,
  setNguoiUnload,
  nhietDo,
  setNhietDo,
  thongSoMay,
  setThongSoMay,
  chiThiTiepXuc,
  setChiThiTiepXuc,
  chiThiDaThongSo,
  setChiThiDaThongSo,
  testSinhHoc,
  setTestSinhHoc,
  testCI,
  setTestCI,
  testBD,
  setTestBD,
  anhMay,
  setAnhMay,
  anhTiepXuc,
  setAnhTiepXuc,
  anhDaThongSo,
  setAnhDaThongSo,
  anhSinhHoc,
  setAnhSinhHoc,
  anhBowieDick,
  setAnhBowieDick,
  onBackToList,
  onAddItemByCode,
  onConfirmBatDau,
  onConfirmKetThucChuTrinh,
  onFinishQc,
}: {
  activeMe: MeRow | null;
  batchGate: MeRow | null;
  items: MeTkItemRow[];
  waitingRows: MeTkWaitingRow[];
  nguoiUnload: string;
  setNguoiUnload: (v: string) => void;
  nhietDo: string;
  setNhietDo: (v: string) => void;
  thongSoMay: string;
  setThongSoMay: (v: string) => void;
  chiThiTiepXuc: "DAT" | "KHONG_DAT" | "";
  setChiThiTiepXuc: (v: "DAT" | "KHONG_DAT" | "") => void;
  chiThiDaThongSo: "DAT" | "KHONG_DAT" | "";
  setChiThiDaThongSo: (v: "DAT" | "KHONG_DAT" | "") => void;
  testSinhHoc: "DAT" | "KHONG_DAT" | "NA" | "";
  setTestSinhHoc: (v: "DAT" | "KHONG_DAT" | "NA" | "") => void;
  testCI: "DAT" | "KHONG_DAT" | "";
  setTestCI: (v: "DAT" | "KHONG_DAT" | "") => void;
  testBD: "DAT" | "KHONG_DAT" | "NA";
  setTestBD: (v: "DAT" | "KHONG_DAT" | "NA") => void;
  anhMay: string;
  setAnhMay: (v: string) => void;
  anhTiepXuc: string;
  setAnhTiepXuc: (v: string) => void;
  anhDaThongSo: string;
  setAnhDaThongSo: (v: string) => void;
  anhSinhHoc: string;
  setAnhSinhHoc: (v: string) => void;
  anhBowieDick: string;
  setAnhBowieDick: (v: string) => void;
  onBackToList: () => void;
  onAddItemByCode: (code: string) => void;
  onConfirmBatDau: () => void | Promise<void>;
  onConfirmKetThucChuTrinh: () => void | Promise<void>;
  onFinishQc: (isPass: boolean) => void | Promise<void>;
}) {
  const [scanPrefillToken, setScanPrefillToken] = useState<string | undefined>(undefined);
  const napLocked = Boolean(batchGate?.tk_chot_nap_at);
  const qcOpen = Boolean(batchGate?.tk_mo_form_qc_at);
  const showBowie = useMemo(() => isSteamSterilizerProfile(batchGate?.thiet_bi ?? null), [batchGate?.thiet_bi]);

  return (
    <CSSDPageShell
      title={<span className="text-[#026f17]">Mẻ tiệt khuẩn: đang xử lý</span>}
      subtitle="Nạp bộ → bắt đầu TK (khóa nạp) → kết thúc chu trình → nhập thông số & kết luận mẻ."
      actions={
        <button type="button" onClick={onBackToList} className={`${CSSD_UI_ACTION_SECONDARY} h-10`}>
          <History size={16} />
          Về danh sách
        </button>
      }
    >
      <div className={`${CSSD_PAGE_OUTER} animate-in slide-in-from-right-6 duration-300`}>
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-800 bg-emerald-700 p-6 text-white shadow-sm">
          <div>
            <h2 className="text-2xl font-semibold uppercase tracking-tight">{activeMe?.ma_lo_tiet_khuan}</h2>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide opacity-90">
              {items.length} bộ trong phiếu ·{" "}
              {napLocked ? <span className="text-amber-200">Đã chốt nạp</span> : <span>Đang nạp</span>}
              {qcOpen ? " · Form QC đã mở" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={napLocked || !items.length}
              onClick={() => void onConfirmBatDau()}
              className={`${CSSD_UI_ACTION_PRIMARY} inline-flex h-10 items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Lock size={16} /> Xác nhận bắt đầu TK
            </button>
            <button
              type="button"
              disabled={!napLocked || qcOpen}
              onClick={() => void onConfirmKetThucChuTrinh()}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 text-xs font-semibold text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <StopCircle size={16} /> Kết thúc chu trình TK
            </button>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <MeTietKhuanWaitingPanel
            rows={waitingRows}
            onPickCode={(code) => {
              if (!code || napLocked) return;
              setScanPrefillToken(`${Date.now()}|${code}`);
            }}
          />
          <MeTietKhuanProcessScanPanel
            items={items}
            napLocked={napLocked}
            prefillToken={scanPrefillToken}
            onPrefillConsumed={() => setScanPrefillToken(undefined)}
            onAddItemByCode={onAddItemByCode}
          />
          <MeTietKhuanProcessQcPanel
            showForm={qcOpen}
            showBowieDick={showBowie}
            nguoiUnload={nguoiUnload}
            setNguoiUnload={setNguoiUnload}
            nhietDo={nhietDo}
            setNhietDo={setNhietDo}
            thongSoMay={thongSoMay}
            setThongSoMay={setThongSoMay}
            chiThiTiepXuc={chiThiTiepXuc}
            setChiThiTiepXuc={setChiThiTiepXuc}
            chiThiDaThongSo={chiThiDaThongSo}
            setChiThiDaThongSo={setChiThiDaThongSo}
            testSinhHoc={testSinhHoc}
            setTestSinhHoc={setTestSinhHoc}
            testCI={testCI}
            setTestCI={setTestCI}
            testBD={testBD}
            setTestBD={setTestBD}
            anhMay={anhMay}
            setAnhMay={setAnhMay}
            anhTiepXuc={anhTiepXuc}
            setAnhTiepXuc={setAnhTiepXuc}
            anhDaThongSo={anhDaThongSo}
            setAnhDaThongSo={setAnhDaThongSo}
            anhSinhHoc={anhSinhHoc}
            setAnhSinhHoc={setAnhSinhHoc}
            anhBowieDick={anhBowieDick}
            setAnhBowieDick={setAnhBowieDick}
            onFinish={(isPass) => void onFinishQc(isPass)}
          />
        </div>

        <p className="mt-4 flex items-start gap-2 text-[10px] font-medium text-slate-500">
          <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#026f17]" aria-hidden />
          <span>
            Chỉ khi <strong className="text-slate-700">kết luận ĐẠT</strong> hệ thống mới chuyển các bộ trong mẻ sang{" "}
            <strong className="text-slate-700">Cấp phát</strong>. Nếu không đạt, bộ được đưa về Đóng gói theo chính sách hiện hành.
          </span>
        </p>
      </div>
    </CSSDPageShell>
  );
}
