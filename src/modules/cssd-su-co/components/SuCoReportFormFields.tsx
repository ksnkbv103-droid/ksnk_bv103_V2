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

/** QR bộ + dropdown danh mục bộ active (PROCESS / INSTRUMENT). */
export function BoSourceFields({
  maQR,
  setMaQR,
  boOptions,
  boLoading,
  onKeyDown,
  onScanComplete,
  onSelectBo,
  loading,
}: {
  maQR: string;
  setMaQR: (v: string) => void;
  boOptions: BoCatalogOption[];
  boLoading?: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onScanComplete?: (code: string) => void;
  onSelectBo: (maBo: string) => void;
  loading?: boolean;
}) {
  const selectOptions = boOptions.map((b) => ({
    id: b.ma_bo.toUpperCase(),
    label: `${b.ma_bo} — ${b.ten_bo}`,
    keywords: [b.ten_bo, b.ma_bo],
  }));
  const selected = maQR.trim().toUpperCase();
  return (
    <div className="space-y-3">
      <QrField
        label="Quét mã QR bộ dụng cụ *"
        value={maQR}
        onChange={setMaQR}
        onKeyDown={onKeyDown}
        onScanComplete={onScanComplete}
        loading={loading || boLoading}
      />
      <div className="space-y-1.5">
        <label className={bv103LayoutChrome.labelBlock}>
          Hoặc chọn bộ từ danh mục
          {boLoading ? <Loader2 className="ml-1 inline animate-spin" size={12} /> : null}
        </label>
        <SearchableSelect
          value={selectOptions.some((o) => o.id === selected) ? selected : ""}
          onChange={(v) => {
            const code = String(v || "").trim().toUpperCase();
            if (!code) return;
            setMaQR(code);
            onSelectBo(code);
          }}
          options={selectOptions}
          placeholder="— Chọn bộ dụng cụ đang có —"
          searchPlaceholder="Tìm mã / tên bộ…"
          disabled={!!loading || !!boLoading}
        />
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
      <label className={bv103LayoutChrome.labelBlock}>Loại sự cố</label>
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
  compact = false,
}: {
  incidentGroup: IncidentGroup;
  onSelect: (group: IncidentGroup) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`space-y-2 rounded-[var(--radius-shell)] border border-slate-200 bg-white shadow-sm ${compact ? "p-3" : "p-3.5"}`}
    >
      <h4 className={bv103LayoutChrome.labelBlockAccent}>Nhóm sự cố</h4>
      <div className="flex flex-wrap gap-1.5">
        {INCIDENT_GROUPS.map((g) => {
          const IconComp = GROUP_ICONS[g];
          const isSelected = incidentGroup === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => onSelect(g)}
              className={`inline-flex h-9 touch-manipulation items-center gap-1.5 rounded-[var(--radius-control)] border px-2.5 text-[11px] font-semibold transition-colors sm:px-3 ${
                isSelected
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              }`}
            >
              <IconComp size={14} className="shrink-0 opacity-80" />
              <span className="whitespace-nowrap">{INCIDENT_GROUP_LABEL[g].split(" (")[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StationOverrideSelect({
  value,
  onChange,
}: {
  value: Station;
  onChange: (station: Station) => void;
}) {
  return (
    <div className="space-y-1.5 border-t border-slate-100 pt-3">
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
}: {
  incident: any;
  details: any[];
  onReset: () => void;
}) {
  return (
    <div className="mx-auto my-4 max-w-2xl animate-in space-y-4 rounded-[var(--radius-shell)] border border-slate-200 bg-white p-5 text-center shadow-sm fade-in duration-300 sm:my-6 sm:p-6">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 size={28} />
      </div>
      <h3 className={UI.modalTitle}>Ghi nhận sự cố thành công!</h3>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
        Biên bản đã lưu — bấm In nếu cần.
      </p>
      <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <button type="button" onClick={() => window.print()} className={`${T.btnPrimary} w-full justify-center sm:w-auto`}>
          <Printer size={16} /> In biên bản
        </button>
        <button type="button" onClick={onReset} className={`${T.btnSecondary} w-full justify-center sm:w-auto`}>
          <PlusCircle size={16} /> Báo cáo mới
        </button>
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
  renderStationOverride: React.ReactNode;
}) {
  return (
    <div className={UI.sectionGap}>
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
  renderStationOverride: React.ReactNode;
}) {
  return (
    <div className={UI.sectionGap}>
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
}: {
  viTriPhatHien: string;
  setViTriPhatHien: (v: string) => void;
  renderStationOverride: React.ReactNode;
}) {
  return (
    <div className={UI.sectionGap}>
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
