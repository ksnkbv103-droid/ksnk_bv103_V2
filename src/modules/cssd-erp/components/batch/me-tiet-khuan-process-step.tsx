// src/modules/cssd-erp/components/batch/me-tiet-khuan-process-step.tsx
"use client";

import React, { useMemo } from "react";
import { History, Lock, StopCircle, Timer, Printer } from "lucide-react";
import { CSSD_PAGE_OUTER } from "../layout/cssd-page-shell";
import MeTietKhuanProcessScanPanel, { type MeTkItemRow } from "./me-tiet-khuan-process-scan-panel";
import MeTietKhuanProcessQcPanel from "./me-tiet-khuan-process-qc-panel";
import MeTietKhuanWaitingPanel, { type MeTkWaitingRow } from "./me-tiet-khuan-waiting-panel";
import MeTietKhuanHeatBanner from "./me-tiet-khuan-heat-banner";
import MeTkNkbvLinkBanner from "./me-tk-nkbv-link-banner";
import { MeTietKhuanSlipStepper } from "./me-tiet-khuan-slip-stepper";
import { CSSD_UI_ACTION_SECONDARY, CSSD_UI_CONTROL, CSSD_UI_FORM_LABEL } from "../../shared/ui/cssd-ui-chrome";
import { getSterilizerMethod, type SterilizerMethod } from "../../helpers/me-tiet-khuan-machine-kind";
import { currentMeSlipStep, meTrangThaiBadge, slipStatusLabel } from "../../lib/me-tiet-khuan-slip-ux";

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
  chuongTrinh,
  setChuongTrinh,
  nhietDo,
  setNhietDo,
  apSuat,
  setApSuat,
  thoiGianChuKy,
  setThoiGianChuKy,
  thongSoVatLy,
  setThongSoVatLy,
  ciNgoaiGoi,
  setCiNgoaiGoi,
  ciPcd,
  setCiPcd,
  trangThaiBi,
  setTrangThaiBi,
  onBackToList,
  onAddItemByCode,
  onConfirmBatDau,
  onConfirmKetThucChuTrinh,
  onFinishQc,
  onSubmitBi,
  onPrintBatch,
  isPrintBusy,
  onReportIncident,
  suppressShell = false,
}: {
  activeMe: MeRow | null;
  batchGate: MeRow | null;
  items: MeTkItemRow[];
  waitingRows: MeTkWaitingRow[];
  chuongTrinh: string;
  setChuongTrinh: (v: string) => void;
  nhietDo: string;
  setNhietDo: (v: string) => void;
  apSuat: string;
  setApSuat: (v: string) => void;
  thoiGianChuKy: string;
  setThoiGianChuKy: (v: string) => void;
  thongSoVatLy: "DAT" | "KHONG_DAT" | "";
  setThongSoVatLy: (v: "DAT" | "KHONG_DAT" | "") => void;
  ciNgoaiGoi: "DAT" | "KHONG_DAT" | "";
  setCiNgoaiGoi: (v: "DAT" | "KHONG_DAT" | "") => void;
  ciPcd: "DAT" | "KHONG_DAT" | "";
  setCiPcd: (v: "DAT" | "KHONG_DAT" | "") => void;
  trangThaiBi: "CHUA_CO" | "AM" | "DUONG" | "";
  setTrangThaiBi: (v: "CHUA_CO" | "AM" | "DUONG" | "") => void;
  onBackToList: () => void;
  onAddItemByCode: (code: string) => void;
  onConfirmBatDau: () => void | Promise<void>;
  onConfirmKetThucChuTrinh: () => void | Promise<void>;
  onFinishQc: (isPass: boolean) => void | Promise<void>;
  onSubmitBi: (ketQua: "AM" | "DUONG") => void | Promise<void>;
  onPrintBatch?: () => void;
  isPrintBusy?: boolean;
  onReportIncident?: () => void;
  suppressShell?: boolean;
}) {
  const napLocked = Boolean(batchGate?.tk_chot_nap_at);
  const qcOpen = Boolean(batchGate?.tk_mo_form_qc_at);
  const method = useMemo<SterilizerMethod | null>(
    () => getSterilizerMethod(batchGate?.thiet_bi ?? activeMe?.thiet_bi ?? null) || getSterilizerMethod({ phuong_phap: (batchGate as { phuong_phap?: string | null } | null)?.phuong_phap }),
    [batchGate, activeMe?.thiet_bi],
  );
  const trangThai = String(activeMe?.trang_thai || (batchGate as { trang_thai_me?: string | null } | null)?.trang_thai_me || "");
  const choBi = trangThai === "CHO_BI";
  const coImplant = Boolean((batchGate as { co_implant?: boolean | null } | null)?.co_implant);
  const steamBiReminder = (batchGate as { steamBiReminder?: string | null } | null)?.steamBiReminder || null;
  const slipStep = currentMeSlipStep({
    chuongTrinh,
    itemCount: items.length,
    napLocked,
    qcOpen,
    choBi,
    ketQuaTest: activeMe?.ket_qua_test,
    trangThai,
  });
  const statusLabel = slipStatusLabel({
    step: slipStep,
    choBi,
    ketQuaTest: activeMe?.ket_qua_test,
    trangThai,
  });
  const statusBadge = meTrangThaiBadge(
    choBi ? "CHO_BI" : activeMe?.ket_qua_test === true ? "HOAN_THANH" : activeMe?.ket_qua_test === false ? "QC_KHONG_DAT" : napLocked ? (qcOpen ? "CHO_DANH_GIA_QC" : "DANG_TIET_KHUAN") : "DANG_CHUAN_NAP",
  );
  const itemSig = items.map((row) => String(row.id || row.ma_vach_qr || "")).join("|");
  const canPrint =
    choBi ||
    activeMe?.ket_qua_test === true ||
    activeMe?.ket_qua_test === false ||
    ["QC_KHONG_DAT", "THU_HOI", "HOAN_THANH", "CHO_BI"].includes(trangThai);

  const toolbar = (
    <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
      {onReportIncident ? (
        <button
          type="button"
          onClick={onReportIncident}
          className={`${CSSD_UI_ACTION_SECONDARY} border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100`}
        >
          Thu hồi mẻ
        </button>
      ) : null}
      {canPrint && onPrintBatch ? (
        <button type="button" disabled={isPrintBusy} onClick={onPrintBatch} className={CSSD_UI_ACTION_SECONDARY}>
          <Printer size={16} aria-hidden="true" />
          In phiếu mẻ
        </button>
      ) : null}
      <button type="button" onClick={onBackToList} className={CSSD_UI_ACTION_SECONDARY}>
        <History size={16} aria-hidden="true" />
        Về danh sách
      </button>
    </div>
  );

  return (
    <div className={suppressShell ? "space-y-3" : `${CSSD_PAGE_OUTER} space-y-3 animate-in slide-in-from-right-6 duration-300`}>
      {toolbar}
      <div className="space-y-3">
        <MeTietKhuanSlipStepper current={slipStep} />

        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-shell)] border border-emerald-800 bg-emerald-700 p-5 text-white shadow-sm">
          <div>
            <h2 className="bv103-type-title font-mono tracking-tight">{activeMe?.ma_lo_tiet_khuan}</h2>
            <p className="mt-1 text-[11px] font-medium opacity-90">
              {activeMe?.thiet_bi?.ten_thiet_bi || batchGate?.thiet_bi?.ten_thiet_bi || "Máy"} · {items.length} bộ · {statusLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={statusBadge.className}>{statusBadge.label}</span>
            {slipStep === 4 ? (
              <button
                type="button"
                disabled={!items.length}
                onClick={() => void onConfirmBatDau()}
                className="bv103-control-h inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-amber-300 bg-amber-400 px-4 text-xs font-semibold text-slate-900 shadow-sm transition-all hover:bg-amber-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Lock size={16} aria-hidden="true" />
                Bắt đầu chu trình
              </button>
            ) : null}
            {slipStep === 5 && !qcOpen ? (
              <button
                type="button"
                onClick={() => void onConfirmKetThucChuTrinh()}
                className="bv103-control-h inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-white/30 bg-white/15 px-4 text-xs font-semibold text-white shadow-sm transition-all hover:bg-white/25 active:scale-95"
              >
                <StopCircle size={16} aria-hidden="true" />
                Kết thúc
              </button>
            ) : null}
          </div>
        </header>

        {activeMe?.id ? <MeTietKhuanHeatBanner key={`${activeMe.id}:${itemSig}`} batchId={activeMe.id} /> : null}
        {activeMe?.id ? <MeTkNkbvLinkBanner loTietKhuanId={activeMe.id} /> : null}

        {slipStep < 5 ? (
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className={CSSD_UI_FORM_LABEL}>Chương trình</span>
              <input
                className={CSSD_UI_CONTROL}
                value={chuongTrinh}
                maxLength={80}
                placeholder="Tên chương trình trên máy"
                onChange={(e) => setChuongTrinh(e.target.value)}
              />
            </label>
            <div className="grid grid-cols-1 gap-[var(--bv103-space-3)] lg:grid-cols-2">
              <div className="order-1 lg:order-2">
                <MeTietKhuanProcessScanPanel items={items} napLocked={napLocked} onAddItemByCode={onAddItemByCode} />
              </div>
              <div className="order-2 lg:order-1">
                <MeTietKhuanWaitingPanel
                  rows={waitingRows}
                  napLocked={napLocked}
                  onProcess={(code) => {
                    if (!code || napLocked) return;
                    onAddItemByCode(code);
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {slipStep === 5 && !qcOpen ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-shell)] border-2 border-dashed border-blue-200 bg-blue-50/60 p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue-300 bg-blue-100">
              <Timer className="h-8 w-8 animate-pulse text-blue-600" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-blue-800">Đang chạy</p>
              <p className="text-sm font-semibold text-blue-600">
                Đã chốt <strong>{items.length} bộ</strong> trong phiếu
              </p>
              <p className="max-w-md text-[11px] font-medium leading-relaxed text-blue-500">
                Chờ máy xong, rồi bấm «Kết thúc».
              </p>
            </div>
          </div>
        ) : null}

        {qcOpen || choBi ? (
          <MeTietKhuanProcessQcPanel
            showForm={qcOpen}
            method={method}
            coImplant={coImplant}
            steamBiReminder={steamBiReminder}
            choBi={choBi}
            chuongTrinh={chuongTrinh}
            setChuongTrinh={setChuongTrinh}
            nhietDo={nhietDo}
            setNhietDo={setNhietDo}
            apSuat={apSuat}
            setApSuat={setApSuat}
            thoiGianChuKy={thoiGianChuKy}
            setThoiGianChuKy={setThoiGianChuKy}
            thongSoVatLy={thongSoVatLy}
            setThongSoVatLy={setThongSoVatLy}
            ciNgoaiGoi={ciNgoaiGoi}
            setCiNgoaiGoi={setCiNgoaiGoi}
            ciPcd={ciPcd}
            setCiPcd={setCiPcd}
            trangThaiBi={trangThaiBi}
            setTrangThaiBi={setTrangThaiBi}
            batchId={activeMe?.id || ""}
            onFinish={(isPass) => void onFinishQc(isPass)}
            onSubmitBi={(ketQua) => void onSubmitBi(ketQua)}
          />
        ) : null}
      </div>
    </div>
  );
}
