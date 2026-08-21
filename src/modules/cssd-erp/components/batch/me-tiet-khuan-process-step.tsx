// src/modules/cssd-erp/components/batch/me-tiet-khuan-process-step.tsx
"use client";

import React, { useMemo } from "react";
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
  Printer,
} from "lucide-react";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../layout/cssd-page-shell";
import MeTietKhuanProcessScanPanel, { type MeTkItemRow } from "./me-tiet-khuan-process-scan-panel";
import MeTietKhuanProcessQcPanel from "./me-tiet-khuan-process-qc-panel";
import MeTietKhuanWaitingPanel, { type MeTkWaitingRow } from "./me-tiet-khuan-waiting-panel";
import MeTietKhuanHeatBanner from "./me-tiet-khuan-heat-banner";
import MeTkNkbvLinkBanner from "./me-tk-nkbv-link-banner";
import { CSSD_UI_ACTION_SECONDARY } from "../../shared/ui/cssd-ui-chrome";
import { isSteamSterilizerKind } from "@/lib/domain/cssd-sterilizer-kind";

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
  onPrintBatch,
  isPrintBusy,
  onReportIncident,
  onRecallBatch,
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
  onPrintBatch?: () => void;
  isPrintBusy?: boolean;
  onReportIncident?: () => void;
  onRecallBatch?: () => void;
}) {
  const napLocked = Boolean(batchGate?.tk_chot_nap_at);
  const qcOpen = Boolean(batchGate?.tk_mo_form_qc_at);
  const showBowie = useMemo(() => isSteamSterilizerKind(batchGate?.thiet_bi ?? null), [batchGate?.thiet_bi]);

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
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {onReportIncident ? (
            <button
              type="button"
              onClick={onReportIncident}
              className={`${CSSD_UI_ACTION_SECONDARY} border-red-200 text-red-600 hover:bg-red-50`}
            >
              Báo sự cố
            </button>
          ) : null}
          <button type="button" onClick={onBackToList} className={CSSD_UI_ACTION_SECONDARY}>
            <History size={16} aria-hidden="true" />
            Về danh sách
          </button>
        </div>
      }
    >
      <div className={`${CSSD_PAGE_OUTER} animate-in slide-in-from-right-6 duration-300`}>
        {/* Header Thông Tin Mẻ + Nút theo giai đoạn */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-shell)] border border-emerald-800 bg-emerald-700 p-5 text-white shadow-sm">
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
                className="bv103-control-h inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-amber-300 bg-amber-400 px-4 text-xs font-semibold uppercase tracking-wide text-slate-900 shadow-sm transition-all hover:bg-amber-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="bv103-control-h inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-white/30 bg-white/15 px-4 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition-all hover:bg-white/25 active:scale-95"
              >
                <StopCircle size={16} aria-hidden="true" />
                Kết thúc chu trình tiệt khuẩn
              </button>
            )}

            {phase === "HOAN_THANH" && onRecallBatch ? (
              <button
                type="button"
                onClick={() => void onRecallBatch()}
                className="bv103-control-h inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-red-300 bg-red-500 px-4 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition-all hover:bg-red-400 active:scale-95"
              >
                <AlertCircle size={16} aria-hidden="true" />
                Thu hồi mẻ
              </button>
            ) : null}

            {phase === "HOAN_THANH" && activeMe?.ket_qua_test === true && onPrintBatch ? (
              <button
                type="button"
                disabled={isPrintBusy}
                onClick={onPrintBatch}
                className="bv103-control-h inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-amber-300 bg-amber-400 px-4 text-xs font-semibold uppercase tracking-wide text-slate-900 shadow-sm transition-all hover:bg-amber-300 active:scale-95 disabled:opacity-50"
              >
                <Printer size={16} aria-hidden="true" />
                In phiếu mẻ A4
              </button>
            ) : null}

            {/* Giai đoạn DANH_GIA và HOAN_THANH: không hiện nút chuyển giai đoạn */}
          </div>
        </header>

        {activeMe?.id ? <MeTietKhuanHeatBanner batchId={activeMe.id} /> : null}
        {activeMe?.id ? <MeTkNkbvLinkBanner loTietKhuanId={activeMe.id} /> : null}

        {/* Process stepper — 4 giai đoạn thật (nạp → TK → QC → cấp phát) */}
        <div className="my-3 rounded-[var(--radius-shell)] border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-7">
            <div className="col-span-1 flex items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  step1State === "COMPLETED"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                    : "animate-pulse border-sky-500 bg-white text-sky-600"
                }`}
              >
                <Inbox size={14} strokeWidth={2.5} />
              </div>
              <p className="text-xs font-semibold text-slate-700">Chuẩn bị nạp</p>
            </div>

            <div className="col-span-1 hidden justify-center text-slate-300 md:flex">
              <ChevronRight size={16} />
            </div>

            <div className="col-span-1 flex items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  step2State === "COMPLETED"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                    : step2State === "ACTIVE"
                      ? "animate-pulse border-blue-500 bg-white text-blue-600"
                      : "border-slate-200 bg-slate-100 text-slate-400"
                }`}
              >
                <Flame size={14} strokeWidth={2.5} />
              </div>
              <p className={`text-xs font-semibold ${step2State === "PENDING" ? "text-slate-400" : "text-slate-700"}`}>
                Đang tiệt khuẩn
              </p>
            </div>

            <div className="col-span-1 hidden justify-center text-slate-300 md:flex">
              <ChevronRight size={16} />
            </div>

            <div className="col-span-1 flex items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  step3State === "COMPLETED"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                    : step3State === "ACTIVE"
                      ? "animate-pulse border-amber-500 bg-white text-amber-600"
                      : "border-slate-200 bg-slate-100 text-slate-400"
                }`}
              >
                <ClipboardCheck size={14} strokeWidth={2.5} />
              </div>
              <p className={`text-xs font-semibold ${step3State === "PENDING" ? "text-slate-400" : "text-slate-700"}`}>
                Đánh giá QC
              </p>
            </div>

            <div className="col-span-1 hidden justify-center text-slate-300 md:flex">
              <ChevronRight size={16} />
            </div>

            <div className="col-span-1 flex items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  step4State === "COMPLETED"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                    : step4State === "FAILED"
                      ? "border-red-500 bg-red-50 text-red-600"
                      : "border-slate-200 bg-slate-100 text-slate-400"
                }`}
              >
                {step4State === "FAILED" ? (
                  <AlertCircle size={14} strokeWidth={2.5} />
                ) : (
                  <CheckCircle size={14} strokeWidth={2.5} />
                )}
              </div>
              <p className={`text-xs font-semibold ${step4State === "PENDING" ? "text-slate-400" : "text-slate-700"}`}>
                {step4State === "FAILED" ? "Lỗi tiệt khuẩn" : "Chờ cấp phát"}
              </p>
            </div>
          </div>
        </div>

        {/* ===== GIAI ĐOẠN 1: Chuẩn bị nạp mẻ ===== */}
        {phase === "CHUAN_BI" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <MeTietKhuanWaitingPanel
              rows={waitingRows}
              napLocked={napLocked}
              onProcess={(code) => {
                if (!code || napLocked) return;
                onAddItemByCode(code);
              }}
            />
            <MeTietKhuanProcessScanPanel
              items={items}
              napLocked={napLocked}
              onAddItemByCode={onAddItemByCode}
            />
          </div>
        )}

        {/* ===== GIAI ĐOẠN 2: Đang tiệt khuẩn (chờ kết thúc chu trình) ===== */}
        {phase === "DANG_TK" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col items-center justify-center rounded-[var(--radius-shell)] border-2 border-dashed border-blue-200 bg-blue-50/60 p-12 text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 border-2 border-blue-300">
                <Timer className="h-8 w-8 text-blue-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-800">Đang tiệt khuẩn</p>
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
                className="bv103-control-h mt-2 inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-blue-300 bg-white px-6 text-xs font-semibold uppercase tracking-wide text-blue-700 shadow-sm transition-all hover:bg-blue-50 active:scale-95"
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
              thietBi={batchGate?.thiet_bi || activeMe?.thiet_bi || null}
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
