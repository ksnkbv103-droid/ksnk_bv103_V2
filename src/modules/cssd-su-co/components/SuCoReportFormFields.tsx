// src/modules/cssd-su-co/components/SuCoReportFormFields.tsx
"use client";

import React from "react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  FlaskConical,
  Cpu,
  Wrench,
  Layers,
  AlertTriangle,
  QrCode,
  Printer,
  PlusCircle,
} from "lucide-react";
import QrCameraButton from "@/components/shared/QrCameraButton";
import SearchableSelect from "@/components/shared/SearchableSelect";
import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import {
  INCIDENT_GROUP_LABEL,
  INCIDENT_GROUPS,
  INCIDENT_STATION_OPTIONS,
  type IncidentGroup,
} from "../domain/cssd-incident-taxonomy";
import { cssdSuCoIncidentJournalHref } from "@/lib/cssd-routes";
import {
  BATCH_RECALL_ENTRY_COPY,
  BATCH_RECALL_REASON_OPTIONS,
  type BatchRecallReasonCode,
} from "../domain/cssd-batch-recall";
import Link from "next/link";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { bv103PanelChrome as UI } from "@/lib/bv103-panel-chrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import IncidentPrintView from "./IncidentPrintView";

export type BoCatalogOption = { id: string; ten_bo: string; ma_bo: string };

const GROUP_ICONS: Record<IncidentGroup, React.ComponentType<{ className?: string; size?: number }>> = {
  PROCESS: Layers,
  INSTRUMENT: Wrench,
  CHEMICAL: FlaskConical,
  EQUIPMENT: Cpu,
  OTHER: AlertTriangle,
};

export function QrField({
  label,
  value,
  onChange,
  onKeyDown,
  onScanComplete,
  loading,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onScanComplete?: (code: string) => void;
  loading?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className={bv103LayoutChrome.labelBlock}>{label}</label>
      <div className="relative flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onKeyDown={onKeyDown}
          disabled={loading}
          className={`${bv103LayoutChrome.controlInput} bg-slate-50 pr-10 font-mono uppercase tracking-wider text-[var(--primary)] disabled:opacity-60`}
          placeholder="Quét QR…"
        />
        <QrCameraButton
          disabled={loading}
          onScan={(code) => {
            onChange(code);
            onScanComplete?.(code);
          }}
          className="bv103-control-h w-10 shrink-0 px-0"
          label=""
        />
        <div className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 text-slate-300">
          {loading ? <Loader2 className="animate-spin" size={16} /> : <QrCode size={16} className={value ? "text-[var(--primary)]" : ""} />}
        </div>
      </div>
    </div>
  );
}

/** Một ô: tìm / chọn / quét QR bộ (PROCESS, rà soát, cửa Chuyển). */
export function BoSourceFields({
  maQR,
  setMaQR,
  boOptions,
  boLoading,
  onKeyDown: _onKeyDown,
  onScanComplete,
  onSelectBo,
  loading,
  maLoHint,
  qrRequired = true,
  layout = "stack",
  compact = false,
  trailing,
}: {
  maQR: string;
  setMaQR: (v: string) => void;
  boOptions: BoCatalogOption[];
  boLoading?: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onScanComplete?: (code: string) => void;
  onSelectBo: (maBo: string) => void;
  loading?: boolean;
  maLoHint?: string;
  qrRequired?: boolean;
  layout?: "stack" | "row";
  /** Toolbar sổ danh mục — không nhãn, không khoảng thừa. */
  compact?: boolean;
  trailing?: React.ReactNode;
}) {
  const selectOptions = boOptions.map((b) => ({
    id: b.ma_bo.toUpperCase(),
    label: `${b.ma_bo} — ${b.ten_bo}`,
    keywords: [b.ten_bo, b.ma_bo],
  }));
  const selected = maQR.trim().toUpperCase();
  const apply = (raw: string) => {
    const code = String(raw || "").trim().toUpperCase();
    if (!code) return;
    setMaQR(code);
    onSelectBo(code);
  };
  const applyScan = (raw: string) => {
    const code = String(raw || "").trim().toUpperCase();
    if (!code) return;
    setMaQR(code);
    (onScanComplete ?? onSelectBo)(code);
  };
  const wrap =
    layout === "row"
      ? trailing
        ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        : ""
      : "space-y-3";
  return (
    <div className={wrap || undefined}>
      {maLoHint ? (
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-900">
          Mẻ {maLoHint}: chọn đúng bộ trong mẻ này (một phiếu / một bộ).
        </p>
      ) : null}
      <div className={compact ? undefined : "space-y-1.5"}>
        {compact ? null : (
          <label className={bv103LayoutChrome.labelBlock}>
            {qrRequired ? "Bộ dụng cụ *" : "Bộ dụng cụ (tùy chọn khi đã có mã lô)"}
            {boLoading ? <Loader2 className="ml-1 inline animate-spin" size={12} /> : null}
          </label>
        )}
        <SearchableSelect
          inputTrigger
          allowCustom
          value={selected}
          onChange={apply}
          options={selectOptions}
          placeholder="Tìm tên, mã hoặc quét QR…"
          searchPlaceholder="Tìm mã / tên bộ…"
          disabled={!!loading || !!boLoading}
          endSlot={
            <QrCameraButton
              disabled={!!loading || !!boLoading}
              onScan={applyScan}
              className="bv103-control-h w-10 shrink-0 px-0"
              label=""
            />
          }
        />
      </div>
      {trailing}
    </div>
  );
}

export function ProcessMaLoField({
  maLo,
  setMaLo,
  readOnly,
  batchRecall,
}: {
  maLo: string;
  setMaLo: (v: string) => void;
  readOnly?: boolean;
  /** QT.24 entry: bắt buộc mã lô / id mẻ. */
  batchRecall?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className={bv103LayoutChrome.labelBlock}>
        {batchRecall
          ? "Mã lô mẻ cần thu hồi"
          : `Mã lô mẻ tiệt khuẩn${readOnly ? "" : " (nếu sự cố gắn mẻ)"}`}
      </label>
      <input
        value={maLo}
        onChange={(e) => setMaLo(e.target.value.toUpperCase())}
        readOnly={readOnly}
        className={`${bv103LayoutChrome.controlInput} ${readOnly ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-600" : "bg-slate-50"} uppercase`}
        placeholder="VD. LOT-2026-01"
      />
    </div>
  );
}

export function BatchRecallEntryBanner() {
  return (
    <div
      className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-left"
      role="note"
      data-testid="batch-recall-entry-banner"
    >
      <p className="text-xs font-semibold text-amber-950">{BATCH_RECALL_ENTRY_COPY.title}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-amber-900">{BATCH_RECALL_ENTRY_COPY.subtitle}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-amber-800">{BATCH_RECALL_ENTRY_COPY.effect}</p>
    </div>
  );
}

export function BatchRecallReasonPicker({
  reason,
  onChange,
}: {
  reason: BatchRecallReasonCode;
  onChange: (code: BatchRecallReasonCode, typeId: string, typeTen: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className={bv103LayoutChrome.labelBlock}>Lý do thu hồi theo mẻ</label>
      <div className="grid gap-1.5 sm:grid-cols-3">
        {BATCH_RECALL_REASON_OPTIONS.map((opt) => {
          const selected = reason === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => onChange(opt.code, opt.typeId, opt.typeTen)}
              className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${
                selected
                  ? "border-amber-500 bg-amber-50 ring-1 ring-amber-400"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
              data-testid={`batch-recall-reason-${opt.code}`}
            >
              <span className="block text-[12px] font-semibold text-slate-800">{opt.label}</span>
              <span className="mt-0.5 block bv103-type-label leading-snug text-slate-500">{opt.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TypePicker({
  options,
  typeId,
  onChange,
}: {
  options: Array<{ code: string; label: string }>;
  typeId: string;
  onChange: (id: string, ten: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className={bv103LayoutChrome.labelBlock}>Loại sự cố an toàn</label>
      <div className="relative">
        <select
          value={typeId}
          onChange={(e) => {
            const sel = options.find((c) => c.code === e.target.value);
            onChange(e.target.value, sel?.label || "");
          }}
          className={`${bv103LayoutChrome.controlSelectNative} appearance-none bg-slate-50 pr-9`}
        >
          {options.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      </div>
    </div>
  );
}

export function IncidentGroupPicker({
  incidentGroup,
  onSelect,
}: {
  incidentGroup: IncidentGroup;
  onSelect: (group: IncidentGroup) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-2">
      {INCIDENT_GROUPS.map((g) => {
        const IconComp = GROUP_ICONS[g];
        const isSelected = incidentGroup === g;
        return (
          <button
            key={g}
            type="button"
            onClick={() => onSelect(g)}
            className={`inline-flex h-8 touch-manipulation items-center gap-1.5 px-2 text-[12px] font-semibold ${
              isSelected
                ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <IconComp size={14} className="shrink-0 opacity-80" />
            <span className="whitespace-nowrap">{INCIDENT_GROUP_LABEL[g].split(" (")[0]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function InstrumentDoorTabs({
  typeId,
  options,
  onChange,
}: {
  typeId: string;
  options: Array<{ code: string; label: string }>;
  onChange: (id: string, ten: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-1">
      {options.map((opt) => {
        const selected = typeId === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => onChange(opt.code, opt.label)}
            className={`inline-flex h-8 items-center px-2 text-[12px] font-semibold ${
              selected
                ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function StationOverrideSelect({
  value,
  onChange,
  embedded = false,
}: {
  value: Station;
  onChange: (station: Station) => void;
  embedded?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${embedded ? "" : "border-t border-slate-100 pt-3"}`}>
      <label className={bv103LayoutChrome.labelBlock}>Trạm phát hiện</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Station)}
        className={bv103LayoutChrome.controlSelectNative}
      >
        {INCIDENT_STATION_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SubmittedSuccessView({
  incident,
  details,
  onReset,
  onClose,
}: {
  incident: any;
  details: any[];
  onReset: () => void;
  onClose?: () => void;
}) {
  const incidentId = incident && typeof incident === "object" ? String(incident.id || "") : "";
  const journalHref = incidentId ? cssdSuCoIncidentJournalHref(incidentId) : cssdSuCoIncidentJournalHref();
  return (
    <div className="mx-auto my-4 max-w-2xl animate-in space-y-[var(--bv103-space-3)] rounded-[var(--radius-shell)] border border-slate-200 bg-white p-5 text-center shadow-sm fade-in duration-300 sm:my-6 sm:p-6">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 size={28} />
      </div>
      <h3 className={UI.modalTitle}>Ghi nhận thành công!</h3>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
        Biên bản đã lưu — in hoặc mở nhật ký để xem lại.
      </p>
      <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={() => window.print()} className={`${T.btnPrimary} w-full justify-center sm:w-auto`}>
          <Printer size={16} /> In biên bản
        </button>
        <Link href={journalHref} className={`${T.btnSecondary} w-full justify-center sm:w-auto`}>
          Xem nhật ký
        </Link>
        <button type="button" onClick={onReset} className={`${T.btnSecondary} w-full justify-center sm:w-auto`}>
          <PlusCircle size={16} /> Báo cáo mới
        </button>
        {onClose ? (
          <button type="button" onClick={onClose} className={`${T.btnSecondary} w-full justify-center sm:w-auto`}>
            Đóng
          </button>
        ) : null}
      </div>
      <IncidentPrintView incident={incident} details={details} />
    </div>
  );
}

export function ChemicalContextFields({
  machineId,
  setMachineId,
  maLo,
  setMaLo,
  chemicals,
  typeOptions,
  typeId,
  onTypeChange,
  hideType,
  wide = false,
  renderStationOverride,
}: {
  machineId: string;
  setMachineId: (v: string) => void;
  maLo: string;
  setMaLo: (v: string) => void;
  chemicals: { id: string; ten: string; ma: string }[];
  typeOptions: Array<{ code: string; label: string }>;
  typeId: string;
  onTypeChange: (id: string, ten: string) => void;
  hideType?: boolean;
  wide?: boolean;
  renderStationOverride: React.ReactNode;
}) {
  return (
    <div className={wide ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : UI.sectionGap}>
      {hideType ? null : <TypePicker options={typeOptions} typeId={typeId} onChange={onTypeChange} />}
      <div className="space-y-1.5">
        <label className={bv103LayoutChrome.labelBlock}>Hóa chất / vật tư *</label>
        <select
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          className={`${bv103LayoutChrome.controlSelectNative} bg-slate-50`}
          required
        >
          <option value="">— Chọn từ danh mục —</option>
          {chemicals.map((c) => (
            <option key={c.id} value={c.id}>{c.ma} — {c.ten}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className={bv103LayoutChrome.labelBlock}>Mã lô (tùy chọn)</label>
        <input
          value={maLo}
          onChange={(e) => setMaLo(e.target.value.toUpperCase())}
          className={`${bv103LayoutChrome.controlInput} bg-slate-50 uppercase`}
          placeholder="Nhập mã lô nếu có..."
        />
      </div>
      {renderStationOverride}
    </div>
  );
}

export function EquipmentContextFields({
  maQR,
  setMaQR,
  onQrKeyDown,
  onScanComplete,
  loading,
  machineId,
  setMachineId,
  machines,
  typeOptions,
  typeId,
  onTypeChange,
  hideType,
  wide = false,
  renderStationOverride,
}: {
  maQR: string;
  setMaQR: (v: string) => void;
  onQrKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onScanComplete?: (code: string) => void;
  loading: boolean;
  machineId: string;
  setMachineId: (v: string) => void;
  machines: { id: string; ten: string }[];
  typeOptions: Array<{ code: string; label: string }>;
  typeId: string;
  onTypeChange: (id: string, ten: string) => void;
  hideType?: boolean;
  wide?: boolean;
  renderStationOverride: React.ReactNode;
}) {
  return (
    <div className={wide ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : UI.sectionGap}>
      <QrField
        label="Quét mã QR máy (hoặc chọn bên dưới)"
        value={maQR}
        onChange={setMaQR}
        onKeyDown={onQrKeyDown}
        onScanComplete={onScanComplete}
        loading={loading}
      />
      <div className="space-y-1.5">
        <label className={bv103LayoutChrome.labelBlock}>Thiết bị gặp sự cố *</label>
        <select
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          className={`${bv103LayoutChrome.controlSelectNative} bg-slate-50`}
        >
          <option value="">— Chọn máy —</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>{m.ten}</option>
          ))}
        </select>
      </div>
      {hideType ? null : <TypePicker options={typeOptions} typeId={typeId} onChange={onTypeChange} />}
      {renderStationOverride}
    </div>
  );
}

export function OtherContextFields({
  viTriPhatHien,
  setViTriPhatHien,
  renderStationOverride,
  wide = false,
}: {
  viTriPhatHien: string;
  setViTriPhatHien: (v: string) => void;
  renderStationOverride: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "grid gap-3 md:grid-cols-2" : UI.sectionGap}>
      <div className="space-y-1.5">
        <label className={bv103LayoutChrome.labelBlock}>Vị trí phát hiện</label>
        <select
          value={viTriPhatHien}
          onChange={(e) => setViTriPhatHien(e.target.value)}
          className={`${bv103LayoutChrome.controlSelectNative} bg-slate-50`}
        >
          <option value="">— Chọn vị trí —</option>
          {INCIDENT_STATION_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      {renderStationOverride}
    </div>
  );
}
