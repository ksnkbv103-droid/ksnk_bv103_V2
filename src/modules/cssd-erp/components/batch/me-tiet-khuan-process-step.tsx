// src/modules/cssd-erp/components/batch/me-tiet-khuan-process-step.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  History,
  Lock,
  StopCircle,
  Inbox,
  Flame,
  ClipboardCheck,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  PlayCircle,
  Timer,
} from "lucide-react";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../layout/cssd-page-shell";
import MeTietKhuanProcessScanPanel, { type MeTkItemRow } from "./me-tiet-khuan-process-scan-panel";
import MeTietKhuanProcessQcPanel from "./me-tiet-khuan-process-qc-panel";
import MeTietKhuanWaitingPanel, { type MeTkWaitingRow } from "./me-tiet-khuan-waiting-panel";
import MeTietKhuanHeatBanner from "./me-tiet-khuan-heat-banner";
import { CSSD_UI_ACTION_SECONDARY } from "../../shared/ui/cssd-ui-chrome";
import { isSteamSterilizerProfile } from "../../helpers/me-tiet-khuan-machine-kind";

type MeRow = {
  id: string;
  ma_lo_tiet_khuan?: string;
  tk_chot_nap_at?: string | null;
  tk_mo_form_qc_at?: string | null;
  ket_qua_test?: boolean | null;
  trang_thai?: string | null;
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
  onFinishQc: (isPass: boolean, overrideThongSoMay?: string) => void | Promise<void>;
}) {
  const [scanPrefillToken, setScanPrefillToken] = useState<string | undefined>(undefined);
  const napLocked = Boolean(batchGate?.tk_chot_nap_at);
  const qcOpen = Boolean(batchGate?.tk_mo_form_qc_at);
  const showBowie = useMemo(() => isSteamSterilizerProfile(batchGate?.thiet_bi ?? null), [batchGate?.thiet_bi]);

  // Xác định giai đoạn hiện tại
  const phase: "CHUAN_BI" | "DANG_TK" | "DANH_GIA" | "HOAN_THANH" = qcOpen
    ? activeMe?.ket_qua_test !== null && activeMe?.ket_qua_test !== undefined
      ? "HOAN_THANH"
      : "DANH_GIA"
    : napLocked
    ? "DANG_TK"
    : "CHUAN_BI";

  // Stepper State
  const step1State = napLocked ? "COMPLETED" : "ACTIVE";
  const step2State = !napLocked ? "PENDING" : qcOpen ? "COMPLETED" : "ACTIVE";
  const step3State = !qcOpen
    ? "PENDING"
    : activeMe?.ket_qua_test === true || activeMe?.ket_qua_test === false
    ? "COMPLETED"
    : "ACTIVE";
  const step4State =
    activeMe?.ket_qua_test === true
      ? "COMPLETED"
      : activeMe?.ket_qua_test === false
      ? "FAILED"
      : "PENDING";

  return (
    <CSSDPageShell
      title={<span className="text-[var(--primary)]">Mẻ tiệt khuẩn: đang xử lý</span>}
      subtitle="Nạp bộ → bắt đầu TK → kết thúc chu trình → đánh giá QC → kết luận."
      actions={
        <button type="button" onClick={onBackToList} className={`${CSSD_UI_ACTION_SECONDARY} h-10`}>
          <History size={16} aria-hidden="true" />
          Về danh sách
        </button>
      }
    >
      <div className={`${CSSD_PAGE_OUTER} animate-in slide-in-from-right-6 duration-300`}>
        {/* Header Thông Tin Mẻ + Nút theo giai đoạn */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-800 bg-emerald-700 p-5 text-white shadow-sm">
          <div>
            <h2 className="text-2xl font-semibold uppercase tracking-tight">{activeMe?.ma_lo_tiet_khuan}</h2>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide opacity-90">
              {items.length} bộ trong phiếu ·{" "}
              {phase === "CHUAN_BI" && <span className="text-sky-200">Đang nạp bộ</span>}
              {phase === "DANG_TK" && <span className="text-amber-200">Đang tiệt khuẩn</span>}
              {phase === "DANH_GIA" && <span className="text-yellow-200">Đang đánh giá QC</span>}
              {phase === "HOAN_THANH" && (
                <span className={activeMe?.ket_qua_test ? "text-emerald-200" : "text-red-300"}>
                  {activeMe?.ket_qua_test ? "Đạt — Cấp phát" : "Không đạt"}
                </span>
              )}
            </p>
          </div>

          {/* Nút hành động ẩn/hiện theo giai đoạn */}
          <div className="flex flex-wrap gap-2">
            {/* Giai đoạn CHUAN_BI: Nút xác nhận bắt đầu TK */}
            {phase === "CHUAN_BI" && (
              <button
                type="button"
                disabled={!items.length}
                onClick={() => void onConfirmBatDau()}
                className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-400 px-5 text-xs font-black uppercase tracking-wide text-slate-900 shadow-lg transition-all hover:bg-amber-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Lock size={16} aria-hidden="true" />
                Xác nhận bắt đầu tiệt khuẩn
              </button>
            )}

            {/* Giai đoạn DANG_TK: Nút kết thúc chu trình */}
            {phase === "DANG_TK" && (
              <button
                type="button"
                onClick={() => void onConfirmKetThucChuTrinh()}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-5 text-xs font-black uppercase tracking-wide text-white shadow-lg transition-all hover:bg-white/25 active:scale-95"
              >
                <StopCircle size={16} aria-hidden="true" />
                Kết thúc chu trình tiệt khuẩn
              </button>
            )}

            {/* Giai đoạn DANH_GIA và HOAN_THANH: không hiện nút chuyển giai đoạn */}
          </div>
        </header>

        {activeMe?.id ? <MeTietKhuanHeatBanner batchId={activeMe.id} /> : null}

        {/* Process Stepper 4 bước */}
        <div className="my-4 bg-slate-50 border border-slate-200/50 p-5 rounded-2xl shadow-inner">
          <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-2">
            {/* Step 1 */}
            <div className="col-span-1 flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                step1State === "COMPLETED"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                  : "bg-white border-sky-500 text-sky-600 shadow-md shadow-sky-100 animate-pulse"
              }`}>
                <Inbox size={18} strokeWidth={2.5} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium text-slate-400 tracking-wider">Bước 1</p>
                <p className="text-xs font-bold text-slate-700">Chuẩn bị nạp mẻ</p>
              </div>
            </div>

            <div className="hidden md:flex col-span-1 justify-center text-slate-300"><ChevronRight size={20} /></div>

            {/* Step 2 */}
            <div className="col-span-1 flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                step2State === "COMPLETED"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                  : step2State === "ACTIVE"
                  ? "bg-white border-blue-500 text-blue-600 shadow-md shadow-blue-100 animate-pulse"
                  : "bg-slate-100 border-slate-200 text-slate-400"
              }`}>
                <Flame size={18} strokeWidth={2.5} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium text-slate-400 tracking-wider">Bước 2</p>
                <p className={`text-xs font-bold ${step2State === "PENDING" ? "text-slate-400" : "text-slate-700"}`}>Đang tiệt khuẩn</p>
              </div>
            </div>

            <div className="hidden md:flex col-span-1 justify-center text-slate-300"><ChevronRight size={20} /></div>

            {/* Step 3 */}
            <div className="col-span-1 flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                step3State === "COMPLETED"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                  : step3State === "ACTIVE"
                  ? "bg-white border-amber-500 text-amber-600 shadow-md shadow-amber-100 animate-pulse"
                  : "bg-slate-100 border-slate-200 text-slate-400"
              }`}>
                <ClipboardCheck size={18} strokeWidth={2.5} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium text-slate-400 tracking-wider">Bước 3</p>
                <p className={`text-xs font-bold ${step3State === "PENDING" ? "text-slate-400" : "text-slate-700"}`}>Đánh giá QC</p>
              </div>
            </div>

            <div className="hidden md:flex col-span-1 justify-center text-slate-300"><ChevronRight size={20} /></div>

            {/* Step 4 */}
            <div className="col-span-1 flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                step4State === "COMPLETED"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                  : step4State === "FAILED"
                  ? "bg-red-50 border-red-500 text-red-600"
                  : "bg-slate-100 border-slate-200 text-slate-400"
              }`}>
                {step4State === "FAILED" ? <AlertCircle size={18} strokeWidth={2.5} /> : <CheckCircle size={18} strokeWidth={2.5} />}
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium text-slate-400 tracking-wider">Bước 4</p>
                <p className={`text-xs font-bold ${step4State === "PENDING" ? "text-slate-400" : "text-slate-700"}`}>
                  {step4State === "FAILED" ? "Lỗi tiệt khuẩn" : "Chờ cấp phát"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== GIAI ĐOẠN 1: Chuẩn bị nạp mẻ ===== */}
        {phase === "CHUAN_BI" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
          </div>
        )}

        {/* ===== GIAI ĐOẠN 2: Đang tiệt khuẩn (chờ kết thúc chu trình) ===== */}
        {phase === "DANG_TK" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 p-12 text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 border-2 border-blue-300">
                <Timer className="h-8 w-8 text-blue-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <p className="text-base font-black uppercase tracking-widest text-blue-800">Đang tiệt khuẩn</p>
                <p className="text-sm font-semibold text-blue-600">
                  Đã chốt <strong>{items.length} bộ</strong> trong phiếu
                </p>
                <p className="max-w-md text-[11px] font-medium leading-relaxed text-blue-500">
                  Chờ máy hoàn thành chu trình. Sau khi hoàn tất, bấm nút{" "}
                  <strong className="text-blue-800">«Kết thúc chu trình tiệt khuẩn»</strong>{" "}
                  ở thanh tiêu đề để mở form đánh giá QC.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void onConfirmKetThucChuTrinh()}
                className="mt-2 inline-flex h-12 items-center gap-2 rounded-2xl border border-blue-300 bg-white px-8 text-sm font-black uppercase tracking-wide text-blue-700 shadow-md transition-all hover:bg-blue-50 hover:shadow-lg active:scale-95"
              >
                <StopCircle size={18} />
                Kết thúc chu trình tiệt khuẩn
              </button>
            </div>
          </div>
        )}

        {/* ===== GIAI ĐOẠN 3: Đánh giá QC — Full width ===== */}
        {(phase === "DANH_GIA" || phase === "HOAN_THANH") && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <MeTietKhuanProcessQcPanel
              showForm={qcOpen}
              showBowieDick={showBowie}
              thietBi={activeMe?.thiet_bi || batchGate?.thiet_bi || null}
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
              onFinish={(isPass, overrideThongSoMay) => void onFinishQc(isPass, overrideThongSoMay)}
            />
          </div>
        )}

        <p className="mt-4 flex items-start gap-2 text-[11px] font-medium text-slate-500">
          <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden="true" />
          <span>
            Chỉ khi <strong className="text-slate-700">kết luận ĐẠT</strong> hệ thống mới chuyển các bộ trong mẻ sang{" "}
            <strong className="text-slate-700">Cấp phát</strong>. Nếu không đạt, bộ được đưa về Đóng gói theo chính sách hiện hành.
          </span>
        </p>
      </div>
    </CSSDPageShell>
  );
}
